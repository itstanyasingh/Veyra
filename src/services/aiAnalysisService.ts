import { 
  TranscriptSegment, 
  AIAnalysisTask, 
  KnowledgeMapData, 
  KnowledgeMapNode, 
  KnowledgeMapRelationship,
  MeetingIntelligenceData,
  ResearchItem,
  ResearchFinding,
  ResearchContradiction,
  ResearchSource,
  ClaimType,
  EvidenceCategory
} from '../types';

/**
 * Calculates a fast, deterministic hash string representing the current state of transcript segments.
 * If text, start time, end time, or segment ordering changes, the hash will change.
 */
export function calculateTranscriptHash(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) return 'empty_transcript';
  
  let str = '';
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const startTime = typeof s.startTime === 'number' ? s.startTime.toFixed(2) : '0';
    const endTime = typeof s.endTime === 'number' ? s.endTime.toFixed(2) : '0';
    str += `${s.id || i}:${startTime}:${endTime}:${s.text}|`;
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `v_${Math.abs(hash).toString(36)}_${segments.length}`;
}

/**
 * Maps any arbitrary timestamp in seconds to the nearest valid transcript segment's startTime.
 */
export function mapToNearestSegmentTimestamp(
  targetTime: number,
  segments: TranscriptSegment[]
): number {
  if (!segments || segments.length === 0) return Math.max(0, targetTime || 0);
  
  let closest = segments[0].startTime;
  let minDiff = Math.abs(targetTime - closest);

  for (const seg of segments) {
    const diff = Math.abs(targetTime - seg.startTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = seg.startTime;
    }
  }

  return Math.max(0, Number(closest.toFixed(2)));
}

export type VeyraErrorCode = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'API_ERROR'
  | 'AI_ERROR'
  | 'RATE_LIMIT_ERROR';

export class VeyraAppError extends Error {
  public code: VeyraErrorCode;
  public isRetryable: boolean;

  constructor(message: string, code: VeyraErrorCode, isRetryable: boolean = true) {
    super(message);
    this.name = 'VeyraAppError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

export interface AnalyzeTranscriptParams {
  transcript: TranscriptSegment[];
  task: AIAnalysisTask;
  options?: {
    length?: 'short' | 'medium' | 'detailed';
  };
  projectName?: string;
  duration?: number;
  speakers?: { id: string; name: string }[];
  query?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Reusable AI analysis service function.
 * Transmits current, un-truncated transcript to /api/ai/analyze and validates returned structured payload.
 */
export async function analyzeTranscriptTask({
  transcript,
  task,
  options,
  projectName,
  duration,
  speakers,
  query,
  signal,
  timeoutMs = 70000,
}: AnalyzeTranscriptParams): Promise<any> {
  if (!transcript || transcript.length === 0) {
    throw new VeyraAppError('Transcript is empty. Transcribe a video or audio file first.', 'INVALID_INPUT', false);
  }

  const speakerMap = new Map((speakers || []).map((s) => [s.id, s.name]));

  const cleanSegments = transcript.map((s) => ({
    id: s.id,
    speakerId: s.speakerId || 'spk_1',
    speakerName: speakerMap.get(s.speakerId) || s.speakerId || 'Speaker',
    startTime: typeof s.startTime === 'number' ? s.startTime : parseFloat(s.startTime as any) || 0,
    endTime: typeof s.endTime === 'number' ? s.endTime : parseFloat(s.endTime as any) || 0,
    text: s.text || '',
  }));

  // Create unified controller for timeout + optional user cancellation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('timeout');
  }, timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => {
      controller.abort('cancelled');
    });
  }

  let response: Response;
  try {
    response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segments: cleanSegments,
        task,
        options,
        projectName: projectName || 'Media Project',
        duration: duration || (cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1].endTime : 0),
        query,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      if (controller.signal.reason === 'timeout') {
        throw new VeyraAppError(
          `Analysis for ${task} timed out. The server took longer than expected to process.`,
          'TIMEOUT',
          true
        );
      }
      if (controller.signal.reason === 'cancelled') {
        throw new VeyraAppError('Operation cancelled.', 'API_ERROR', false);
      }
    }
    if (fetchErr.name === 'AbortError') {
      throw new VeyraAppError('Operation cancelled.', 'API_ERROR', false);
    }
    throw new VeyraAppError(
      'Network failure communicating with Veyra server. Please check your connection.',
      'NETWORK_ERROR',
      true
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const status = response.status;
    if (status === 429) {
      throw new VeyraAppError(
        'Too many AI requests. Please wait a moment before trying again.',
        'RATE_LIMIT_ERROR',
        true
      );
    }
    const message = errorData.error || `AI analysis request failed for ${task}.`;
    throw new VeyraAppError(message, status >= 500 ? 'AI_ERROR' : 'API_ERROR', status >= 500);
  }

  let result: any;
  try {
    result = await response.json();
  } catch {
    throw new VeyraAppError('Failed to parse AI response payload.', 'AI_ERROR', true);
  }

  // Client-side timestamp grounding & validation safeguard
  if (task === 'chapters' && Array.isArray(result.chapters)) {
    result.chapters = result.chapters.map((ch: any) => {
      const startTime = mapToNearestSegmentTimestamp(ch.startTime, cleanSegments);
      let endTime = mapToNearestSegmentTimestamp(ch.endTime, cleanSegments);
      if (endTime <= startTime) {
        endTime = Math.min(
          duration || startTime + 30,
          startTime + 30
        );
      }
      return {
        ...ch,
        startTime,
        endTime,
      };
    });
  }

  if (task === 'keyMoments' && Array.isArray(result.keyMoments)) {
    result.keyMoments = result.keyMoments.map((km: any) => ({
      ...km,
      timestamp: mapToNearestSegmentTimestamp(km.timestamp, cleanSegments),
    }));
  }

  if (task === 'keyPoints' && Array.isArray(result.keyPoints)) {
    result.keyPoints = result.keyPoints.map((kp: any) => ({
      ...kp,
      timestamp: typeof kp.timestamp === 'number' ? mapToNearestSegmentTimestamp(kp.timestamp, cleanSegments) : undefined,
    }));
  }

  if (task === 'topics' && Array.isArray(result.topics)) {
    result.topics = result.topics.map((top: any) => ({
      ...top,
      timestamps: Array.isArray(top.timestamps)
        ? top.timestamps.map((ts: number) => mapToNearestSegmentTimestamp(ts, cleanSegments))
        : [],
    }));
  }

  if (task === 'keywords' && Array.isArray(result.keywords)) {
    // Post-process exact frequencies from actual transcript segments
    result.keywords = result.keywords.map((kw: any) => {
      const term = kw.term || '';
      if (!term) return kw;
      try {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        let count = 0;
        for (const seg of cleanSegments) {
          const m = seg.text.match(regex);
          if (m) count += m.length;
        }
        return {
          ...kw,
          count: count > 0 ? count : (kw.count || 1),
        };
      } catch {
        return kw;
      }
    });
  }

  if (task === 'knowledgeMap' && result.nodes && Array.isArray(result.nodes)) {
    const maxDuration = duration || (cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1].endTime : 60);
    const validNodes: KnowledgeMapNode[] = [];
    const validNodeIds = new Set<string>();

    const stopWords = new Set(['the', 'basically', 'important', 'thing', 'today', 'stuff', 'something']);

    for (const rawNode of result.nodes) {
      if (!rawNode || !rawNode.name || typeof rawNode.name !== 'string') continue;
      const cleanName = rawNode.name.trim();
      if (!cleanName || stopWords.has(cleanName.toLowerCase())) continue;

      const nodeId = rawNode.id || `node_${validNodes.length + 1}`;
      
      // Ground sources against real transcript segments
      const sources: KnowledgeMapNode['sources'] = [];
      if (Array.isArray(rawNode.sources)) {
        for (const src of rawNode.sources) {
          let rawTs = typeof src.timestamp === 'number' ? src.timestamp : parseFloat(src.timestamp);
          if (isNaN(rawTs) || !isFinite(rawTs) || rawTs < 0) continue;
          if (rawTs > maxDuration) rawTs = maxDuration;

          const groundedTs = mapToNearestSegmentTimestamp(rawTs, cleanSegments);
          const matchedSeg = cleanSegments.find(s => Math.abs(s.startTime - groundedTs) < 5) || cleanSegments[0];

          sources.push({
            timestamp: groundedTs,
            segmentId: matchedSeg?.id,
            textSnippet: src.textSnippet || matchedSeg?.text?.slice(0, 100) || '',
            speaker: src.speaker || matchedSeg?.speakerName || undefined,
          });
        }
      }

      // If no valid sources were found, use the first segment timestamp
      if (sources.length === 0 && cleanSegments.length > 0) {
        sources.push({
          timestamp: cleanSegments[0].startTime,
          segmentId: cleanSegments[0].id,
          textSnippet: cleanSegments[0].text.slice(0, 100),
          speaker: cleanSegments[0].speakerName,
        });
      }

      validNodeIds.add(nodeId);
      validNodes.push({
        id: nodeId,
        name: cleanName,
        type: (['main_topic', 'subtopic', 'concept'].includes(rawNode.type) ? rawNode.type : 'concept') as any,
        summary: rawNode.summary || `Discussion regarding ${cleanName}.`,
        sources,
        relatedTopicIds: Array.isArray(rawNode.relatedTopicIds) ? rawNode.relatedTopicIds : [],
        importanceScore: typeof rawNode.importanceScore === 'number' ? rawNode.importanceScore : 50,
        parentId: rawNode.parentId || undefined,
      });
    }

    // Filter relationships to ensure sourceId and targetId exist
    const validRelationships: KnowledgeMapRelationship[] = [];
    if (Array.isArray(result.relationships)) {
      for (const rel of result.relationships) {
        if (rel && rel.sourceId && rel.targetId && validNodeIds.has(rel.sourceId) && validNodeIds.has(rel.targetId) && rel.sourceId !== rel.targetId) {
          validRelationships.push({
            id: rel.id || `rel_${validRelationships.length + 1}`,
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            label: rel.label || rel.type || 'relates to',
            type: rel.type || 'related',
          });
        }
      }
    }

    const currentHash = calculateTranscriptHash(transcript);
    const knowledgeMapData: KnowledgeMapData = {
      nodes: validNodes,
      relationships: validRelationships,
      transcriptHash: currentHash,
      updatedAt: new Date().toISOString(),
      isOutdated: false,
    };

    return knowledgeMapData;
  }

  if (task === 'meetingIntelligence') {
    const maxDuration = duration || (cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1].endTime : 60);
    const currentHash = calculateTranscriptHash(transcript);

    // Helper for grounding a timestamp and sources array
    const processSources = (rawTs: any, rawSources?: any[]) => {
      let ts = typeof rawTs === 'number' ? rawTs : parseFloat(rawTs);
      if (isNaN(ts) || !isFinite(ts) || ts < 0) ts = 0;
      if (ts > maxDuration) ts = maxDuration;
      const groundedTs = mapToNearestSegmentTimestamp(ts, cleanSegments);
      const matchedSeg = cleanSegments.find(s => Math.abs(s.startTime - groundedTs) < 5) || cleanSegments[0];

      const sourcesList: Array<{ timestamp: number; segmentId?: string; textSnippet?: string }> = [];
      if (Array.isArray(rawSources) && rawSources.length > 0) {
        for (const s of rawSources) {
          let sTs = typeof s.timestamp === 'number' ? s.timestamp : parseFloat(s.timestamp);
          if (isNaN(sTs) || !isFinite(sTs) || sTs < 0) sTs = groundedTs;
          if (sTs > maxDuration) sTs = maxDuration;
          const groundedSTs = mapToNearestSegmentTimestamp(sTs, cleanSegments);
          const segMatch = cleanSegments.find(seg => Math.abs(seg.startTime - groundedSTs) < 5) || matchedSeg;
          sourcesList.push({
            timestamp: groundedSTs,
            segmentId: segMatch?.id,
            textSnippet: s.textSnippet || segMatch?.text?.slice(0, 100) || '',
          });
        }
      }

      if (sourcesList.length === 0 && matchedSeg) {
        sourcesList.push({
          timestamp: groundedTs,
          segmentId: matchedSeg.id,
          textSnippet: matchedSeg.text.slice(0, 100),
        });
      }

      return { groundedTs, sourcesList };
    };

    // Process Decisions
    const decisions = Array.isArray(result.decisions)
      ? result.decisions
          .filter((d: any) => d && d.text && typeof d.text === 'string' && d.text.trim())
          .map((d: any, idx: number) => {
            const { groundedTs, sourcesList } = processSources(d.timestamp, d.sources);
            return {
              id: d.id || `dec_${Date.now()}_${idx}`,
              text: d.text.trim(),
              timestamp: groundedTs,
              sources: sourcesList,
              speaker: d.speaker || undefined,
              context: d.context || undefined,
              createdAt: new Date().toISOString(),
            };
          })
      : [];

    // Process Action Items
    const actionItems = Array.isArray(result.actionItems)
      ? result.actionItems
          .filter((a: any) => a && a.task && typeof a.task === 'string' && a.task.trim())
          .map((a: any, idx: number) => {
            const { groundedTs, sourcesList } = processSources(a.timestamp, a.sources);
            let owner = (a.owner && typeof a.owner === 'string') ? a.owner.trim() : 'Unassigned';
            if (!owner || ['someone', 'anyone', 'unknown', 'n/a', 'none'].includes(owner.toLowerCase())) {
              owner = 'Unassigned';
            }
            let deadline = (a.deadline && typeof a.deadline === 'string') ? a.deadline.trim() : 'No deadline';
            if (!deadline || ['n/a', 'none', 'unknown', 'tbd'].includes(deadline.toLowerCase())) {
              deadline = 'No deadline';
            }
            const status = (['OPEN', 'IN_PROGRESS', 'DONE'].includes(a.status) ? a.status : 'OPEN') as 'OPEN' | 'IN_PROGRESS' | 'DONE';

            return {
              id: a.id || `act_${Date.now()}_${idx}`,
              task: a.task.trim(),
              owner,
              deadline,
              status,
              timestamp: groundedTs,
              sources: sourcesList,
              createdAt: new Date().toISOString(),
            };
          })
      : [];

    // Process Open Questions
    const openQuestions = Array.isArray(result.openQuestions)
      ? result.openQuestions
          .filter((q: any) => q && q.question && typeof q.question === 'string' && q.question.trim())
          .map((q: any, idx: number) => {
            const { groundedTs, sourcesList } = processSources(q.timestamp, q.sources);
            const status = q.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN';
            let resTs: number | undefined = undefined;
            if (q.resolutionTimestamp) {
              const rTs = parseFloat(q.resolutionTimestamp);
              if (!isNaN(rTs)) resTs = mapToNearestSegmentTimestamp(rTs, cleanSegments);
            }
            return {
              id: q.id || `q_${Date.now()}_${idx}`,
              question: q.question.trim(),
              status,
              timestamp: groundedTs,
              resolutionTimestamp: resTs,
              resolutionSnippet: q.resolutionSnippet || undefined,
              sources: sourcesList,
              createdAt: new Date().toISOString(),
            };
          })
      : [];

    // Process Risks
    const risks = Array.isArray(result.risks)
      ? result.risks
          .filter((r: any) => r && r.risk && typeof r.risk === 'string' && r.risk.trim())
          .map((r: any, idx: number) => {
            const { groundedTs, sourcesList } = processSources(r.timestamp, r.sources);
            return {
              id: r.id || `risk_${Date.now()}_${idx}`,
              risk: r.risk.trim(),
              impact: (['high', 'medium', 'low'].includes(r.impact) ? r.impact : 'medium') as 'high' | 'medium' | 'low',
              timestamp: groundedTs,
              sources: sourcesList,
            };
          })
      : [];

    // Process Agreements / Disagreements
    const agreementsDisagreements = Array.isArray(result.agreementsDisagreements)
      ? result.agreementsDisagreements
          .filter((ad: any) => ad && ad.summary && typeof ad.summary === 'string' && ad.summary.trim())
          .map((ad: any, idx: number) => {
            const { groundedTs, sourcesList } = processSources(ad.timestamp, ad.sources);
            return {
              id: ad.id || `ad_${Date.now()}_${idx}`,
              type: (ad.type === 'disagreement' ? 'disagreement' : 'agreement') as 'agreement' | 'disagreement',
              topic: ad.topic || 'Discussion Topic',
              summary: ad.summary.trim(),
              timestamp: groundedTs,
              sources: sourcesList,
            };
          })
      : [];

    const meetingData: MeetingIntelligenceData = {
      summary: result.summary || 'Summary of meeting decisions, actions, and discussions.',
      decisions,
      actionItems,
      openQuestions,
      risks,
      agreementsDisagreements,
      transcriptHash: currentHash,
      updatedAt: new Date().toISOString(),
      isOutdated: false,
    };

    return meetingData;
  }

  if (task === 'researchMode') {
    const maxDuration = duration || (cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1].endTime : 60);
    const currentHash = calculateTranscriptHash(transcript);

    const processSources = (rawTs: any, rawSources?: any[]) => {
      let ts = typeof rawTs === 'number' ? rawTs : parseFloat(rawTs);
      if (isNaN(ts) || !isFinite(ts) || ts < 0) ts = 0;
      if (ts > maxDuration) ts = maxDuration;
      const groundedTs = mapToNearestSegmentTimestamp(ts, cleanSegments);
      const matchedSeg = cleanSegments.find(s => Math.abs(s.startTime - groundedTs) < 5) || cleanSegments[0];

      const sourcesList: ResearchSource[] = [];
      if (Array.isArray(rawSources) && rawSources.length > 0) {
        for (const s of rawSources) {
          let sTs = typeof s.timestamp === 'number' ? s.timestamp : parseFloat(s.timestamp);
          if (isNaN(sTs) || !isFinite(sTs) || sTs < 0) sTs = groundedTs;
          if (sTs > maxDuration) sTs = maxDuration;
          const groundedSTs = mapToNearestSegmentTimestamp(sTs, cleanSegments);
          const segMatch = cleanSegments.find(seg => Math.abs(seg.startTime - groundedSTs) < 5) || matchedSeg;
          sourcesList.push({
            timestamp: groundedSTs,
            segmentId: segMatch?.id,
            textSnippet: s.textSnippet || segMatch?.text?.slice(0, 100) || '',
            speaker: s.speaker || segMatch?.speakerName || segMatch?.speakerId || undefined,
          });
        }
      }

      if (sourcesList.length === 0 && matchedSeg) {
        sourcesList.push({
          timestamp: groundedTs,
          segmentId: matchedSeg.id,
          textSnippet: matchedSeg.text.slice(0, 100),
          speaker: matchedSeg.speakerName || matchedSeg.speakerId,
        });
      }

      return { groundedTs, sourcesList, matchedSeg };
    };

    const validClaimTypes: ClaimType[] = ['fact', 'opinion', 'recommendation', 'prediction', 'hypothesis', 'unresolved'];
    const validEvidenceCats: EvidenceCategory[] = ['SUPPORTING', 'CONTRADICTING', 'CONTEXT'];

    // Process Findings
    const rawFindings = Array.isArray(result.findings) ? result.findings : [];
    const findings: ResearchFinding[] = rawFindings
      .filter((f: any) => f && (f.claim || f.text) && typeof (f.claim || f.text) === 'string' && (f.claim || f.text).trim())
      .map((f: any, idx: number) => {
        const claimText = (f.claim || f.text).trim();
        const { groundedTs, sourcesList, matchedSeg } = processSources(f.timestamp, f.sources);
        const claimType: ClaimType = validClaimTypes.includes(f.claimType) ? f.claimType : 'fact';
        const evidenceCategory: EvidenceCategory = validEvidenceCats.includes(f.evidenceCategory) ? f.evidenceCategory : 'SUPPORTING';

        return {
          id: f.id || `find_${Date.now()}_${idx}`,
          claim: claimText,
          claimType,
          summary: f.summary || undefined,
          excerpt: f.excerpt || matchedSeg?.text.slice(0, 150) || undefined,
          timestamp: groundedTs,
          sources: sourcesList,
          evidenceCategory,
          speaker: f.speaker || matchedSeg?.speakerName || matchedSeg?.speakerId || undefined,
          createdAt: new Date().toISOString(),
        };
      });

    // Process Contradictions
    const rawContradictions = Array.isArray(result.contradictions) ? result.contradictions : [];
    const contradictions: ResearchContradiction[] = rawContradictions
      .filter((c: any) => c && c.claimA && c.claimB)
      .map((c: any, idx: number) => {
        let tsA = parseFloat(c.timestampA);
        if (isNaN(tsA) || tsA < 0) tsA = 0;
        let tsB = parseFloat(c.timestampB);
        if (isNaN(tsB) || tsB < 0) tsB = 0;

        return {
          id: c.id || `contra_${Date.now()}_${idx}`,
          claimA: String(c.claimA).trim(),
          timestampA: mapToNearestSegmentTimestamp(tsA, cleanSegments),
          claimB: String(c.claimB).trim(),
          timestampB: mapToNearestSegmentTimestamp(tsB, cleanSegments),
          summary: c.summary || 'Conflicting statements identified in transcript.',
          resolution: c.resolution || undefined,
        };
      });

    // Process Unresolved Questions
    const rawUnresolved = Array.isArray(result.unresolvedQuestions) ? result.unresolvedQuestions : [];
    const unresolvedQuestions: string[] = rawUnresolved
      .filter((q: any) => q && typeof q === 'string' && q.trim())
      .map((q: string) => q.trim());

    const isInsufficient = Boolean(result.isInsufficientEvidence) || (findings.length === 0 && cleanSegments.length < 2);

    const researchData: ResearchItem = {
      id: result.id || `res_${Date.now()}`,
      query: result.query || 'Topic Investigation',
      title: result.title || 'Transcript Research Brief',
      summary: result.summary || (isInsufficient ? 'Insufficient evidence found in video transcript.' : 'Synthesis of evidence and findings from video recording.'),
      mainFinding: result.mainFinding || (findings.length > 0 ? findings[0].claim : undefined),
      findings,
      contradictions,
      unresolvedQuestions,
      isInsufficientEvidence: isInsufficient,
      transcriptHash: currentHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOutdated: false,
    };

    return researchData;
  }

  return result;
}
