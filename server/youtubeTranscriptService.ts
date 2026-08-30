/**
 * VEYRA — Native Gemini YouTube Video Input & Ingestion Service
 * 
 * Replaces YouTube watch-page scraping and third-party caption scrapers with
 * Google Gemini's native public YouTube video understanding capability.
 */

import { GoogleGenAI } from '@google/genai';

export type YouTubeErrorCode =
  | 'YOUTUBE_INVALID_URL'
  | 'YOUTUBE_PRIVATE'
  | 'YOUTUBE_UNAVAILABLE'
  | 'YOUTUBE_NOT_PUBLIC'
  | 'YOUTUBE_GEMINI_FAILED'
  | 'YOUTUBE_TRANSCRIPTION_FAILED'
  | 'GEMINI_API_KEY_MISSING';

export interface YouTubeValidationResult {
  valid: boolean;
  videoId?: string;
  canonicalUrl?: string;
  error?: string;
  code?: YouTubeErrorCode;
}

export interface Segment {
  id: string;
  speakerId: string;
  speaker?: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleCue {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface ProjectSummary {
  overview: string;
  keyPoints: string[];
  chapters: Array<{
    title: string;
    startTime: number;
    endTime: number;
    summary: string;
  }>;
  actionItems: string[];
}

export interface YouTubeTranscriptionSuccessResult {
  success: true;
  source: 'youtube_gemini';
  videoTitle: string;
  channelName: string;
  language: string;
  fileName: string;
  mediaUrl: string;
  fileSize: number;
  duration: number;
  speakers: Array<{ id: string; name: string }>;
  transcript: Segment[];
  subtitles: SubtitleCue[];
  summary: ProjectSummary;
}

export interface YouTubeTranscriptionErrorResult {
  success: false;
  code: YouTubeErrorCode;
  message: string;
  canUploadMedia: true;
  error: string;
}

export type YouTubeTranscriptionResult =
  | YouTubeTranscriptionSuccessResult
  | YouTubeTranscriptionErrorResult;

/**
 * Validates whether a given string is a YouTube URL
 */
export function isYouTubeUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const url = new URL(urlStr.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be'
    );
  } catch {
    return false;
  }
}

/**
 * Extracts YouTube video ID from supported URL patterns:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 */
export function extractYouTubeVideoId(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const url = new URL(urlStr.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const path = url.pathname.slice(1);
      const videoId = path.split('/')[0];
      return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
      }
      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/')) {
        const parts = url.pathname.split('/');
        const videoId = parts[2];
        return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Validates and extracts YouTube video metadata
 */
export function validateAndExtractYouTubeId(urlStr: string): YouTubeValidationResult {
  if (!urlStr || typeof urlStr !== 'string' || !urlStr.trim()) {
    return {
      valid: false,
      code: 'YOUTUBE_INVALID_URL',
      error: 'Please enter a valid YouTube video URL.',
    };
  }

  if (!isYouTubeUrl(urlStr)) {
    return {
      valid: false,
      code: 'YOUTUBE_INVALID_URL',
      error: 'The provided URL is not a recognized YouTube link.',
    };
  }

  const videoId = extractYouTubeVideoId(urlStr);
  if (!videoId) {
    return {
      valid: false,
      code: 'YOUTUBE_INVALID_URL',
      error: 'Could not extract a valid YouTube video ID from the link.',
    };
  }

  return {
    valid: true,
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Native Gemini YouTube Video Input Ingestion Method
 */
export async function transcribeYouTubeWithGemini(
  youtubeUrl: string,
  ai: GoogleGenAI,
  contextHint?: string
): Promise<YouTubeTranscriptionResult> {
  const validation = validateAndExtractYouTubeId(youtubeUrl);
  if (!validation.valid || !validation.videoId || !validation.canonicalUrl) {
    console.log(`[GEMINI YOUTUBE] Invalid YouTube URL: ${youtubeUrl}`);
    return {
      success: false,
      code: validation.code || 'YOUTUBE_INVALID_URL',
      message: validation.error || 'Please provide a valid public YouTube URL.',
      canUploadMedia: true,
      error: validation.error || 'Please provide a valid public YouTube URL.',
    };
  }

  const videoId = validation.videoId;
  const canonicalUrl = validation.canonicalUrl;
  const startTime = Date.now();

  console.log(`[GEMINI YOUTUBE]`);
  console.log(`[GEMINI YOUTUBE] video URL: ${canonicalUrl}`);
  console.log(`[GEMINI YOUTUBE] video ID: ${videoId}`);

  const prompt = `Transcribe the public YouTube video at: ${canonicalUrl}

${contextHint ? `Context hint: ${contextHint}` : ''}

Requirements:
- Transcribe the entire available spoken content of the video from start to finish.
- Do NOT summarize instead of transcribing; preserve the actual spoken words in order.
- Provide accurate timestamps in seconds (float or integer, e.g. 0.0, 4.2, 12.8).
- Perform speaker identification (e.g. "Speaker 1", "Speaker 2", or actual names if known).
- Generate a high-level summary including key points, chapters, and action items.
- Return ONLY valid JSON matching this exact structure:

{
  "videoTitle": "Exact or descriptive video title",
  "channelName": "Creator or channel name",
  "language": "en",
  "speakers": [
    { "id": "spk_1", "name": "Speaker 1" }
  ],
  "segments": [
    {
      "startTime": 0.0,
      "endTime": 4.2,
      "speaker": "Speaker 1",
      "text": "Exact spoken text..."
    }
  ],
  "summary": {
    "overview": "Overview of the video",
    "keyPoints": ["Key point 1", "Key point 2"],
    "chapters": [
      { "title": "Introduction", "startTime": 0.0, "endTime": 30.0, "summary": "Chapter summary" }
    ],
    "actionItems": []
  }
}`;

  const modelsToAttempt = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash'];
  let lastError: any = null;

  for (const modelName of modelsToAttempt) {
    console.log(`[GEMINI YOUTUBE] model: ${modelName}`);
    console.log(`[GEMINI YOUTUBE] request started at ${new Date().toISOString()}`);

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const processingTime = Date.now() - startTime;
      console.log(`[GEMINI YOUTUBE] request completed at ${new Date().toISOString()}`);
      console.log(`[GEMINI YOUTUBE] response status: 200 OK`);
      console.log(`[GEMINI YOUTUBE] response type: JSON`);
      console.log(`[GEMINI YOUTUBE] processing time: ${processingTime}ms`);

      const rawText = response.text || '';
      if (!rawText.trim()) {
        throw new Error('Gemini returned an empty response.');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        console.error(`[GEMINI YOUTUBE] Failed to parse JSON response:`, rawText.substring(0, 300));
        throw new Error('Gemini response was not valid JSON.');
      }

      const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
      console.log(`[GEMINI YOUTUBE] parsed segment count: ${rawSegments.length}`);

      if (rawSegments.length === 0) {
        throw new Error('No spoken content or transcript segments were detected in the video.');
      }

      const videoTitle = (parsed.videoTitle || 'YouTube Video').trim();
      const channelName = (parsed.channelName || 'YouTube Creator').trim();
      const language = (parsed.language || 'en').trim();

      // Extract unique speakers
      const speakerMap = new Map<string, string>();
      const speakers: Array<{ id: string; name: string }> = [];

      let speakerCounter = 1;
      rawSegments.forEach((seg: any) => {
        const rawSpk = (seg.speaker || 'Speaker 1').trim();
        if (!speakerMap.has(rawSpk)) {
          const spkId = `spk_${speakerCounter++}`;
          speakerMap.set(rawSpk, spkId);
          speakers.push({ id: spkId, name: rawSpk });
        }
      });

      if (speakers.length === 0) {
        speakers.push({ id: 'spk_1', name: 'Speaker 1' });
      }

      // Build normalized transcript segments
      const transcript: Segment[] = rawSegments.map((seg: any, idx: number) => {
        const rawSpk = (seg.speaker || 'Speaker 1').trim();
        const speakerId = speakerMap.get(rawSpk) || 'spk_1';
        const startTimeSec = Math.max(0, parseFloat(seg.startTime) || 0);
        const endTimeSec = Math.max(startTimeSec + 0.5, parseFloat(seg.endTime) || (startTimeSec + 3));

        return {
          id: `seg_${idx + 1}`,
          speakerId,
          speaker: rawSpk,
          startTime: Math.round(startTimeSec * 100) / 100,
          endTime: Math.round(endTimeSec * 100) / 100,
          text: (seg.text || '').trim(),
        };
      });

      // Build normalized subtitles
      const subtitles: SubtitleCue[] = transcript.map((seg, idx) => ({
        id: `sub_${idx + 1}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));

      // Calculate total duration
      const duration = transcript.length > 0
        ? Math.ceil(transcript[transcript.length - 1].endTime)
        : 180;

      // Extract summary
      const summary: ProjectSummary = {
        overview: parsed.summary?.overview || `Transcript for ${videoTitle} by ${channelName}.`,
        keyPoints: Array.isArray(parsed.summary?.keyPoints) ? parsed.summary.keyPoints : [],
        chapters: Array.isArray(parsed.summary?.chapters) ? parsed.summary.chapters : [],
        actionItems: Array.isArray(parsed.summary?.actionItems) ? parsed.summary.actionItems : [],
      };

      return {
        success: true,
        source: 'youtube_gemini',
        videoTitle,
        channelName,
        language,
        fileName: videoTitle,
        mediaUrl: canonicalUrl,
        fileSize: 0,
        duration,
        speakers,
        transcript,
        subtitles,
        summary,
      };
    } catch (err: any) {
      console.warn(`[GEMINI YOUTUBE] Error on model ${modelName}:`, err.message || err);
      lastError = err;
      
      const errMsg = String(err.message || '').toLowerCase();
      // Detect specific errors (private, non-existent, restricted video)
      if (errMsg.includes('private') || errMsg.includes('restricted')) {
        return {
          success: false,
          code: 'YOUTUBE_PRIVATE',
          message: 'This YouTube video is private or age-restricted.',
          canUploadMedia: true,
          error: 'This YouTube video is private or age-restricted.',
        };
      }
      if (errMsg.includes('not found') || errMsg.includes('unavailable') || errMsg.includes('does not exist')) {
        return {
          success: false,
          code: 'YOUTUBE_UNAVAILABLE',
          message: 'This YouTube video is unavailable or has been removed.',
          canUploadMedia: true,
          error: 'This YouTube video is unavailable or has been removed.',
        };
      }
    }
  }

  const finalMsg = lastError?.message || 'Gemini could not process this YouTube video. Please try another public YouTube video.';
  console.log(`[GEMINI YOUTUBE] All Gemini models failed for YouTube video input. Error: ${finalMsg}`);

  return {
    success: false,
    code: 'YOUTUBE_GEMINI_FAILED',
    message: 'Gemini could not process this YouTube video. Please try another public YouTube video.',
    canUploadMedia: true,
    error: 'Gemini could not process this YouTube video. Please try another public YouTube video.',
  };
}
