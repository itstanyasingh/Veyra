import { Project, TranscriptSegment, SubtitleCue, Speaker } from '../types';
import { formatDuration } from './formatters';

/**
 * Sanitize filename to safe filesystem string
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'veyra_export';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'veyra_export';
}

/**
 * Format timestamp in SRT format (HH:MM:SS,mmm)
 */
export function formatSRTTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Format timestamp in VTT format (HH:MM:SS.mmm)
 */
export function formatVTTTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
}

/**
 * Generate SRT subtitle string from cues or transcript
 */
export function generateSRT(cues: SubtitleCue[] | TranscriptSegment[], speakers?: Speaker[]): string {
  if (!cues || cues.length === 0) return '';
  const speakerMap = new Map((speakers || []).map((s) => [s.id, s.name]));

  return cues
    .map((cue, index) => {
      const idx = index + 1;
      const start = formatSRTTime(cue.startTime);
      const end = formatSRTTime(cue.endTime);
      let text = (cue.text || '').trim();

      if ('speakerId' in cue && cue.speakerId && speakerMap.has(cue.speakerId)) {
        const name = speakerMap.get(cue.speakerId);
        text = `[${name}] ${text}`;
      }

      return `${idx}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

/**
 * Generate WebVTT subtitle string
 */
export function generateVTT(cues: SubtitleCue[] | TranscriptSegment[], speakers?: Speaker[]): string {
  if (!cues || cues.length === 0) return 'WEBVTT\n\n';
  const speakerMap = new Map((speakers || []).map((s) => [s.id, s.name]));

  const body = cues
    .map((cue, index) => {
      const start = formatVTTTime(cue.startTime);
      const end = formatVTTTime(cue.endTime);
      let text = (cue.text || '').trim();

      if ('speakerId' in cue && cue.speakerId && speakerMap.has(cue.speakerId)) {
        const name = speakerMap.get(cue.speakerId);
        text = `<v ${name}>${text}`;
      }

      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Generate plain text transcript formatted with speakers and timestamps
 */
export function generateFormattedTranscript(project: Project, targetLang?: string): string {
  const speakerMap = new Map((project.speakers || []).map((s) => [s.id, s.name]));
  const segments = targetLang && targetLang !== 'source' && project.translations?.[targetLang]
    ? project.translations[targetLang]
    : project.transcript || [];

  const langLabel = targetLang && targetLang !== 'source' ? `Language: ${targetLang}\n` : '';

  const header = `VEYRA TRANSCRIPT EXPORT
Project: ${project.name}
File: ${project.fileName}
Duration: ${formatDuration(project.duration)}
${langLabel}Export Date: ${new Date().toLocaleString()}
--------------------------------------------------\n\n`;

  const body = segments
    .map((seg) => {
      const speakerName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      const timecode = formatDuration(seg.startTime);
      return `[${timecode}] ${speakerName}:\n${(seg.text || '').trim()}\n`;
    })
    .join('\n');

  return header + body;
}

/**
 * Generate clean raw TXT
 */
export function generatePlainTXT(project: Project, targetLang?: string): string {
  const segments = targetLang && targetLang !== 'source' && project.translations?.[targetLang]
    ? project.translations[targetLang]
    : project.transcript || [];

  return segments.map((seg) => (seg.text || '').trim()).filter(Boolean).join('\n\n');
}

/**
 * Generate CSV export
 */
export function generateCSV(project: Project, targetLang?: string): string {
  const speakerMap = new Map((project.speakers || []).map((s) => [s.id, s.name]));
  const segments = targetLang && targetLang !== 'source' && project.translations?.[targetLang]
    ? project.translations[targetLang]
    : project.transcript || [];

  const headers = ['Segment_Index', 'Start_Seconds', 'End_Seconds', 'Timecode', 'Speaker', 'Text'];
  const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

  const rows = segments.map((seg, idx) => {
    const speaker = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
    return [
      idx + 1,
      seg.startTime.toFixed(3),
      seg.endTime.toFixed(3),
      escapeCsv(formatDuration(seg.startTime)),
      escapeCsv(speaker),
      escapeCsv(seg.text),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate JSON export
 */
export function generateJSON(project: Project, targetLang?: string): string {
  const segments = targetLang && targetLang !== 'source' && project.translations?.[targetLang]
    ? project.translations[targetLang]
    : project.transcript || [];

  const subtitles = targetLang && targetLang !== 'source' && project.translations?.[targetLang]
    ? project.translations[targetLang].map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }))
    : project.subtitles && project.subtitles.length > 0
    ? project.subtitles
    : segments.map((seg, idx) => ({
        id: seg.id || `sub_${idx}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      language: targetLang || 'source',
      video: {
        id: project.id,
        title: project.name,
        fileName: project.fileName,
        duration: project.duration,
        mediaType: project.mediaType,
        sourceType: project.sourceType,
      },
      speakers: project.speakers || [],
      segments: segments.map((s) => ({
        id: s.id,
        speakerId: s.speakerId,
        startTime: s.startTime,
        endTime: s.endTime,
        text: s.text,
      })),
      subtitles: subtitles.map((c) => ({
        id: c.id,
        index: c.index,
        startTime: c.startTime,
        endTime: c.endTime,
        text: c.text,
      })),
      summary: project.summary || null,
    },
    null,
    2
  );
}

/**
 * Generate a section-customized Markdown report.
 */
export function generateCustomMarkdownReport(
  project: Project,
  sections: {
    summary: boolean;
    transcript: boolean;
    meetingIntelligence: boolean;
    researchMode: boolean;
    studyMaterial: boolean;
    knowledgeMap: boolean;
    userNotes: boolean;
  },
  options: {
    includeQuizAnswers?: boolean;
    targetLang?: string;
  }
): string {
  let md = `# VEYRA INTELLIGENCE REPORT\n`;
  md += `**Project:** ${project.name}\n`;
  md += `**File:** ${project.fileName}\n`;
  md += `**Duration:** ${formatDuration(project.duration)}\n`;
  md += `**Export Date:** ${new Date().toLocaleDateString()}\n`;
  md += `--------------------------------------------------\n\n`;

  if (project.meetingIntelligence?.isOutdated || project.knowledgeMap?.isOutdated) {
    md += `> **Notice:** Some analysis modules were generated from an earlier transcript version.\n\n`;
  }

  // 1. Executive Summary
  if (sections.summary && (project.summary || project.aiAnalysisResults?.summary)) {
    const summaryObj = project.summary || project.aiAnalysisResults?.summary;
    md += `## Executive Summary\n\n`;
    if (summaryObj?.overview) {
      md += `${summaryObj.overview}\n\n`;
    }
    const keyPoints = summaryObj?.keyPoints || project.aiAnalysisResults?.keyPoints?.map(k => k.description);
    if (keyPoints && keyPoints.length > 0) {
      md += `### Key Takeaways\n`;
      keyPoints.forEach(kp => {
        const text = typeof kp === 'string' ? kp : (kp as any).description || (kp as any).title;
        md += `- ${text}\n`;
      });
      md += `\n`;
    }
  }

  // 2. Meeting Intelligence
  if (sections.meetingIntelligence && project.meetingIntelligence) {
    const mi = project.meetingIntelligence;
    md += `## Meeting & Decision Intelligence\n\n`;

    if (mi.summary) {
      md += `${mi.summary}\n\n`;
    }

    if (mi.decisions && mi.decisions.length > 0) {
      md += `### Decisions (${mi.decisions.length})\n`;
      mi.decisions.forEach((d, i) => {
        md += `${i + 1}. **${d.text}** (Source — ${formatDuration(d.timestamp)})\n`;
        if (d.context) md += `   > Context: ${d.context}\n`;
      });
      md += `\n`;
    }

    if (mi.actionItems && mi.actionItems.length > 0) {
      md += `### Action Items (${mi.actionItems.length})\n`;
      mi.actionItems.forEach((a, i) => {
        const ownerStr = a.owner ? ` | Owner: ${a.owner}` : '';
        const deadlineStr = a.deadline ? ` | Deadline: ${a.deadline}` : '';
        md += `${i + 1}. [${a.status.toUpperCase()}] **${a.task}**${ownerStr}${deadlineStr} (Source — ${formatDuration(a.timestamp)})\n`;
      });
      md += `\n`;
    }

    if (mi.openQuestions && mi.openQuestions.length > 0) {
      md += `### Open Questions (${mi.openQuestions.length})\n`;
      mi.openQuestions.forEach((q, i) => {
        md += `${i + 1}. [${q.status.toUpperCase()}] **${q.question}** (Source — ${formatDuration(q.timestamp)})\n`;
      });
      md += `\n`;
    }
  }

  // 3. Research Mode
  if (sections.researchMode && project.researchItems && project.researchItems.length > 0) {
    md += `## Research Mode Investigation\n\n`;
    project.researchItems.forEach((res, rIdx) => {
      md += `### Research ${rIdx + 1}: ${res.title}\n`;
      md += `**Query:** "${res.query}"\n\n`;
      if (res.summary) md += `${res.summary}\n\n`;

      if (res.findings && res.findings.length > 0) {
        md += `#### Claims & Evidence\n`;
        res.findings.forEach(f => {
          const typeTag = f.claimType ? `[${f.claimType.toUpperCase()}]` : '';
          md += `- ${typeTag} **${f.claim}** (Source — ${formatDuration(f.timestamp)})\n`;
          if (f.excerpt) md += `  > Excerpt: "${f.excerpt}"\n`;
          if (f.userNotes) md += `  - **My Notes:** ${f.userNotes}\n`;
        });
        md += `\n`;
      }
    });
  }


  // 4. Knowledge Map
  if (sections.knowledgeMap && project.knowledgeMap && project.knowledgeMap.nodes.length > 0) {
    md += `## Knowledge Map Topics\n\n`;
    project.knowledgeMap.nodes.forEach((node, nIdx) => {
      const srcTs = node.sources[0]?.timestamp || 0;
      md += `${nIdx + 1}. **${node.name}** [${node.type.toUpperCase()}] (Source — ${formatDuration(srcTs)})\n`;
      if (node.summary) md += `   ${node.summary}\n`;
    });
    md += `\n`;
  }

  // 5. Study Material
  if (sections.studyMaterial) {
    md += `## Study Material & Quiz\n\n`;
    const segments = project.transcript || [];
    const summary = project.summary || project.aiAnalysisResults?.summary;
    const keyPoints = summary?.keyPoints || [];

    if (keyPoints.length > 0) {
      md += `### Key Concepts\n`;
      keyPoints.forEach((kp, idx) => md += `${idx + 1}. ${kp}\n`);
      md += `\n`;
    }

    if (segments.length > 0) {
      md += `### Quiz Questions\n\n`;
      md += `**Q1:** What main topic is introduced in the opening segment of "${project.name}"?\n`;
      md += `- A) ${segments[0]?.text || 'Main topic overview'}\n`;
      md += `- B) Unrelated off-topic summary\n`;
      if (options.includeQuizAnswers) {
        md += `> **Correct Answer:** A (Source — ${formatDuration(segments[0]?.startTime || 0)})\n`;
      }
      md += `\n`;
    }
  }

  // 6. User Notes
  if (sections.userNotes && ((project.notes && project.notes.length > 0) || (project.highlights && project.highlights.length > 0))) {
    md += `## My Notes & Highlights\n\n`;
    if (project.notes) {
      project.notes.forEach(n => md += `- ${n.content} (${formatDuration(n.timestamp || 0)})\n`);
    }
    md += `\n`;
  }


  // 7. Transcript
  if (sections.transcript && project.transcript && project.transcript.length > 0) {
    md += `## Full Transcript\n\n`;
    const speakerMap = new Map((project.speakers || []).map(s => [s.id, s.name]));
    const segments = options.targetLang && options.targetLang !== 'source' && project.translations?.[options.targetLang]
      ? project.translations[options.targetLang]
      : project.transcript;

    segments.forEach(seg => {
      const spkName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      md += `**[${formatDuration(seg.startTime)}] ${spkName}:**\n${seg.text}\n\n`;
    });
  }

  return md;
}

/**
 * Generate a section-customized Plain Text report.
 */
export function generateCustomTXTReport(
  project: Project,
  sections: {
    summary: boolean;
    transcript: boolean;
    meetingIntelligence: boolean;
    researchMode: boolean;
    studyMaterial: boolean;
    knowledgeMap: boolean;
    userNotes: boolean;
  },
  options: {
    includeQuizAnswers?: boolean;
    targetLang?: string;
  }
): string {
  let txt = `VEYRA INTELLIGENCE REPORT\n`;
  txt += `Project: ${project.name}\n`;
  txt += `File: ${project.fileName}\n`;
  txt += `Duration: ${formatDuration(project.duration)}\n`;
  txt += `Export Date: ${new Date().toLocaleDateString()}\n`;
  txt += `--------------------------------------------------\n\n`;

  if (sections.summary && (project.summary || project.aiAnalysisResults?.summary)) {
    const summaryObj = project.summary || project.aiAnalysisResults?.summary;
    txt += `=== EXECUTIVE SUMMARY ===\n`;
    if (summaryObj?.overview) txt += `${summaryObj.overview}\n\n`;
    const keyPoints = summaryObj?.keyPoints || project.aiAnalysisResults?.keyPoints?.map(k => k.description);
    if (keyPoints) {
      keyPoints.forEach(kp => txt += `• ${typeof kp === 'string' ? kp : (kp as any).description}\n`);
      txt += `\n`;
    }
  }

  if (sections.meetingIntelligence && project.meetingIntelligence) {
    const mi = project.meetingIntelligence;
    txt += `=== MEETING & DECISION INTELLIGENCE ===\n`;
    if (mi.summary) txt += `${mi.summary}\n\n`;
    if (mi.decisions) {
      txt += `Decisions:\n`;
      mi.decisions.forEach((d, i) => txt += `${i + 1}. ${d.text} (Source: ${formatDuration(d.timestamp)})\n`);
      txt += `\n`;
    }
    if (mi.actionItems) {
      txt += `Action Items:\n`;
      mi.actionItems.forEach((a, i) => txt += `${i + 1}. [${a.status}] ${a.task} (Owner: ${a.owner || 'N/A'}, Source: ${formatDuration(a.timestamp)})\n`);
      txt += `\n`;
    }
  }

  if (sections.researchMode && project.researchItems) {
    txt += `=== RESEARCH MODE FINDINGS ===\n`;
    project.researchItems.forEach((res, i) => {
      txt += `Research #${i + 1}: ${res.title}\nQuery: "${res.query}"\n`;
      if (res.summary) txt += `${res.summary}\n`;
      txt += `\n`;
    });
  }

  if (sections.transcript && project.transcript) {
    txt += `=== FULL TRANSCRIPT ===\n`;
    const speakerMap = new Map((project.speakers || []).map(s => [s.id, s.name]));
    project.transcript.forEach(seg => {
      const spkName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      txt += `[${formatDuration(seg.startTime)}] ${spkName}:\n${seg.text}\n\n`;
    });
  }

  return txt;
}

/**
 * Browser-native file download helper with UTF-8 support
 */
export function triggerFileDownload(content: string, fileName: string, mimeType: string): void {
  const isText = mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('csv');
  const blobContent = isText ? ['\uFEFF', content] : [content];
  const fullMimeType = isText && !mimeType.includes('charset') ? `${mimeType};charset=utf-8` : mimeType;

  const blob = new Blob(blobContent, { type: fullMimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

