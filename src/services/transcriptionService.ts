import { TranscriptSegment, Speaker, SubtitleCue, ProjectSummary } from '../types';
import { extractAudioForTranscription } from '../utils/audioExtractor';

export interface ProcessingProgressState {
  stage: 'upload' | 'extracting' | 'transcribing' | 'diarizing' | 'timestamps' | 'ready' | 'error';
  stageIndex: number;
  percentage: number;
  message: string;
  isComplete: boolean;
}

export const PROCESSING_STAGES = [
  { id: 'upload', label: 'Fetching video...' },
  { id: 'extracting', label: 'Analyzing video...' },
  { id: 'transcribing', label: 'Transcribing audio...' },
  { id: 'diarizing', label: 'Identifying speakers...' },
  { id: 'timestamps', label: 'Building transcript...' },
  { id: 'ready', label: 'Transcript ready.' },
];

export interface TranscriptionResult {
  fileName?: string;
  mediaUrl?: string;
  fileSize?: number;
  duration?: number;
  speakers: Speaker[];
  transcript: TranscriptSegment[];
  subtitles: SubtitleCue[];
  summary: ProjectSummary;
}

/**
 * Transcribes a local file by extracting the audio track and sending to Gemini via backend
 */
export async function runMediaProcessingPipeline(
  fileName: string,
  duration: number = 60,
  file: File | null = null,
  onProgress: (state: ProcessingProgressState) => void
): Promise<TranscriptionResult> {
  onProgress({
    stage: 'upload',
    stageIndex: 0,
    percentage: 15,
    message: 'Media buffered and verified',
    isComplete: false,
  });

  let audioBase64: string | undefined;
  let mimeType: string | undefined;

  if (file) {
    onProgress({
      stage: 'extracting',
      stageIndex: 1,
      percentage: 35,
      message: 'Extracting and optimizing audio track for speech recognition...',
      isComplete: false,
    });

    try {
      const extracted = await extractAudioForTranscription(file, duration || 300);
      audioBase64 = extracted.base64Audio;
      mimeType = extracted.mimeType;
    } catch (err: any) {
      console.error('Audio extraction error:', err);
      throw new Error(`Failed to extract audio track: ${err.message || 'Unknown error'}`);
    }
  }

  onProgress({
    stage: 'transcribing',
    stageIndex: 2,
    percentage: 60,
    message: 'Transcribing speech via Gemini speech intelligence...',
    isComplete: false,
  });

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64,
      mimeType,
      fileName,
      duration,
      contextHint: `Media file name: ${fileName}`,
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Transcription request failed with status ${response.status}`);
  }

  onProgress({
    stage: 'diarizing',
    stageIndex: 3,
    percentage: 80,
    message: 'Identifying speakers and acoustic boundaries...',
    isComplete: false,
  });

  const data = await response.json();

  onProgress({
    stage: 'timestamps',
    stageIndex: 4,
    percentage: 95,
    message: 'Structuring timecodes and subtitle cues...',
    isComplete: false,
  });

  onProgress({
    stage: 'ready',
    stageIndex: 5,
    percentage: 100,
    message: 'Workspace ready',
    isComplete: true,
  });

  return {
    speakers: data.speakers || [{ id: 'spk_1', name: 'Speaker 1' }],
    transcript: data.transcript || [],
    subtitles: data.subtitles || [],
    summary: data.summary,
  };
}

/**
 * Transcribes a remote media URL directly via backend
 */
export async function transcribeMediaUrl(
  url: string,
  projectName: string,
  onProgress: (state: ProcessingProgressState) => void
): Promise<TranscriptionResult> {
  onProgress({
    stage: 'upload',
    stageIndex: 0,
    percentage: 0,
    message: 'Fetching video...',
    isComplete: false,
  });

  const timer1 = setTimeout(() => {
    onProgress({
      stage: 'extracting',
      stageIndex: 1,
      percentage: 0,
      message: 'Analyzing video...',
      isComplete: false,
    });
  }, 1200);

  const timer2 = setTimeout(() => {
    onProgress({
      stage: 'transcribing',
      stageIndex: 2,
      percentage: 0,
      message: 'Transcribing audio...',
      isComplete: false,
    });
  }, 3000);

  try {
    const response = await fetch('/api/transcribe-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        projectName,
        contextHint: `Direct URL import for: ${projectName}`,
      }),
    });

    clearTimeout(timer1);
    clearTimeout(timer2);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `URL transcription failed with status ${response.status}`);
    }

    onProgress({
      stage: 'timestamps',
      stageIndex: 4,
      percentage: 90,
      message: 'Building transcript...',
      isComplete: false,
    });

    const data = await response.json();

    onProgress({
      stage: 'ready',
      stageIndex: 5,
      percentage: 100,
      message: 'Transcript ready.',
      isComplete: true,
    });

    return {
      fileName: data.fileName,
      mediaUrl: data.mediaUrl,
      fileSize: data.fileSize,
      duration: data.duration,
      speakers: data.speakers || [{ id: 'spk_1', name: 'Speaker 1' }],
      transcript: data.transcript || [],
      subtitles: data.subtitles || [],
      summary: data.summary,
    };
  } catch (err) {
    clearTimeout(timer1);
    clearTimeout(timer2);
    throw err;
  }
}
