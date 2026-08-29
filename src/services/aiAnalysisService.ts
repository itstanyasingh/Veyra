import { TranscriptSegment, AIAnalysisTask } from '../types';

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

export interface AnalyzeTranscriptParams {
  transcript: TranscriptSegment[];
  task: AIAnalysisTask;
  options?: {
    length?: 'short' | 'medium' | 'detailed';
  };
  projectName?: string;
  duration?: number;
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
}: AnalyzeTranscriptParams): Promise<any> {
  if (!transcript || transcript.length === 0) {
    throw new Error('Transcript is empty. Transcribe a video or audio file first.');
  }

  const cleanSegments = transcript.map((s) => ({
    id: s.id,
    speakerId: s.speakerId || 'Speaker',
    startTime: typeof s.startTime === 'number' ? s.startTime : parseFloat(s.startTime as any) || 0,
    endTime: typeof s.endTime === 'number' ? s.endTime : parseFloat(s.endTime as any) || 0,
    text: s.text || '',
  }));

  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segments: cleanSegments,
      task,
      options,
      projectName: projectName || 'Media Project',
      duration: duration || (cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1].endTime : 0),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `AI analysis request failed for ${task}.`);
  }

  const result = await response.json();

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

  return result;
}
