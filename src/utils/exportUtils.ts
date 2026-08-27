import { Project, TranscriptSegment, SubtitleCue, Speaker } from '../types';
import { formatDuration } from './formatters';

/**
 * Format timestamp in SRT format (HH:MM:SS,mmm)
 */
export function formatSRTTime(seconds: number): string {
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
  const speakerMap = new Map((speakers || []).map((s) => [s.id, s.name]));

  return cues
    .map((cue, index) => {
      const idx = index + 1;
      const start = formatSRTTime(cue.startTime);
      const end = formatSRTTime(cue.endTime);
      let text = cue.text.trim();

      if ('speakerId' in cue && cue.speakerId) {
        const name = speakerMap.get(cue.speakerId) || cue.speakerId;
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
  const speakerMap = new Map((speakers || []).map((s) => [s.id, s.name]));

  const body = cues
    .map((cue, index) => {
      const start = formatVTTTime(cue.startTime);
      const end = formatVTTTime(cue.endTime);
      let text = cue.text.trim();

      if ('speakerId' in cue && cue.speakerId) {
        const name = speakerMap.get(cue.speakerId) || cue.speakerId;
        text = `<v ${name}>${text}`;
      }

      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');

  return `WEBVTT - Exported from VEYRA\n\n${body}`;
}

/**
 * Generate plain text transcript formatted with speakers and timestamps
 */
export function generateFormattedTranscript(project: Project): string {
  const speakerMap = new Map((project.speakers || []).map((s) => [s.id, s.name]));
  const segments = project.transcript || [];

  const header = `VEYRA TRANSCRIPT EXPORT
Project: ${project.name}
File: ${project.fileName}
Duration: ${formatDuration(project.duration)}
Export Date: ${new Date().toLocaleString()}
--------------------------------------------------\n\n`;

  const body = segments
    .map((seg) => {
      const speakerName = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
      const timecode = formatDuration(seg.startTime);
      return `[${timecode}] ${speakerName}:\n${seg.text.trim()}\n`;
    })
    .join('\n');

  return header + body;
}

/**
 * Generate clean raw TXT
 */
export function generatePlainTXT(project: Project): string {
  const segments = project.transcript || [];
  return segments.map((seg) => seg.text.trim()).join(' ');
}

/**
 * Generate CSV export
 */
export function generateCSV(project: Project): string {
  const speakerMap = new Map((project.speakers || []).map((s) => [s.id, s.name]));
  const segments = project.transcript || [];

  const headers = ['Segment_Index', 'Start_Seconds', 'End_Seconds', 'Timecode', 'Speaker', 'Text'];
  
  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

  const rows = segments.map((seg, idx) => {
    const speaker = speakerMap.get(seg.speakerId) || seg.speakerId || 'Speaker';
    return [
      idx + 1,
      seg.startTime.toFixed(2),
      seg.endTime.toFixed(2),
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
export function generateJSON(project: Project): string {
  return JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        fileName: project.fileName,
        duration: project.duration,
        mediaType: project.mediaType,
      },
      speakers: project.speakers || [],
      transcript: project.transcript || [],
      subtitles: project.subtitles || [],
      summary: project.summary || null,
    },
    null,
    2
  );
}

/**
 * Browser-native file download helper
 */
export function triggerFileDownload(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
