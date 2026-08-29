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
