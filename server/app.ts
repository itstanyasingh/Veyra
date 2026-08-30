import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import {
  isYouTubeUrl,
  extractYouTubeVideoId,
  validateAndExtractYouTubeId,
  getYouTubeTranscript,
  groupCaptionsIntoSegments,
} from './youtube.js';

dotenv.config();

const app = express();

// Trust proxy for rate limiter behind reverse proxies / Vercel / Cloud Run
app.set('trust proxy', 1);

// CORS configuration for same-origin & cross-origin deployment safety
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// JSON body parser with increased limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting for API protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health' || req.path === '/health',
});

app.use('/api/', apiLimiter);

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parseTimestampToSeconds(ts: string | number | undefined): number {
  if (typeof ts === 'number') return Math.max(0, ts);
  if (!ts || typeof ts !== 'string') return 0;
  const clean = ts.trim();
  if (/^\d+(\.\d+)?$/.test(clean)) return parseFloat(clean);
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] || 0;
  return 0;
}

function isSafePublicUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

    const hostname = u.hostname.toLowerCase();
    
    // Block localhost, IP formats, internal domains
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Block private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [, p1, p2] = ipMatch.map(Number);
      if (p1 === 10 || p1 === 127 || p1 === 0) return false;
      if (p1 === 169 && p2 === 254) return false;
      if (p1 === 192 && p2 === 168) return false;
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Real AI endpoints will return helpful error guidance.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
): Promise<any> {
  const primaryModel = params.model;
  let fallbackModel = 'gemini-3.1-flash-lite';
  if (primaryModel.includes('transcribe')) {
    fallbackModel = 'gemini-3.7-flash';
  } else if (primaryModel.includes('3.1-flash-lite')) {
    fallbackModel = 'gemini-3.7-flash';
  } else if (primaryModel.includes('3.7')) {
    fallbackModel = 'gemini-3.1-flash-lite';
  }

  const modelsToTry = [primaryModel, fallbackModel];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(`[Veyra AI] Calling generateContent with ${currentModel} (try ${attempt + 1}/${maxRetries})...`);
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 60000)
        );

        const apiPromise = ai.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: params.config,
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        return response;
      } catch (err: any) {
        attempt++;
        lastError = err;
        const errMsg = err?.message || String(err);
        console.error(`[Veyra AI] Model ${currentModel} attempt ${attempt} error: ${errMsg}`);
        
        const isTransient = 
          errMsg.includes('503') || 
          errMsg.includes('500') || 
          errMsg.includes('429') || 
          errMsg.includes('TIMEOUT_EXCEEDED') ||
          errMsg.toLowerCase().includes('demand') || 
          errMsg.toLowerCase().includes('limit') || 
          errMsg.toLowerCase().includes('unavailable') ||
          errMsg.toLowerCase().includes('overloaded');
        
        if (!isTransient && attempt === 1) {
          break;
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error('GenerateContent failed after all attempts and fallbacks.');
}

// ---------------- API ROUTES ----------------

// 1. Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    environment: process.env.NODE_ENV || 'production',
  });
});

// 2. Direct File Media Transcription & Diarization
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType, fileName, duration, contextHint } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing. Please configure it in your environment settings.',
      });
    }

    if (!audioBase64) {
      return res.status(400).json({
        error: 'No audio data provided. Please provide valid base64 audio payload.',
      });
    }

    const promptText = `
You are Veyra's professional speech-to-text, speaker diarization, and video intelligence engine.
Analyze the provided audio recording for file: "${fileName || 'Media File'}" (approx duration: ${duration || 60} seconds).
${contextHint ? `Context hint: ${contextHint}` : ''}

CRITICAL REQUIREMENTS:
1. Transcribe the spoken dialogue verbatim and accurately.
2. Perform authentic speaker diarization:
   - Identify distinct speakers based strictly on audible voice pitch, timbre, and conversational turns.
   - If only one person speaks in the audio, return a single speaker: [{"id": "spk_1", "name": "Speaker 1"}].
   - If multiple distinct people speak (interviews, podcasts, meetings), return distinct speakers ("spk_1", "spk_2", etc.) labeled "Speaker 1", "Speaker 2", etc. (or actual real names if clearly stated/addressed in dialogue).
   - Maintain strict consistency: assign every segment to the exact same speaker ID throughout the entire recording.
   - Do NOT invent fake speakers or alternate speakers randomly if there is only one speaker.
3. Provide realistic start and end timestamps (in seconds) for each segment. Segment duration should normally be 4-15 seconds per segment.
4. Output structured chapters with timestamps.
5. Provide a clear executive overview summary, 3-6 key takeaways, and actionable follow-ups.

Output strictly valid JSON with this exact schema:
{
  "speakers": [
    { "id": "spk_1", "name": "Speaker 1" },
    { "id": "spk_2", "name": "Speaker 2" }
  ],
  "transcript": [
    {
      "id": "seg_1",
      "speakerId": "spk_1",
      "startTime": 0.0,
      "endTime": 5.4,
      "text": "Exact transcribed text."
    }
  ],
  "summary": {
    "overview": "Comprehensive overview of the discussion.",
    "keyPoints": [
      "Key point 1",
      "Key point 2"
    ],
    "chapters": [
      {
        "title": "Chapter title",
        "startTime": 0,
        "endTime": 30,
        "summary": "Short chapter description."
      }
    ],
    "actionItems": [
      "Action item 1",
      "Action item 2"
    ]
  }
}
`;

    const contents: any[] = [
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType || 'audio/wav',
        },
      },
      promptText,
    ];

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleanJson);
    } catch {
      console.error('Failed to parse Gemini JSON response:', rawText);
      return res.status(500).json({ error: 'Failed to parse generated transcription data.' });
    }

    let speakersList = Array.isArray(parsedData.speakers) ? parsedData.speakers : [];
    if (speakersList.length === 0) {
      speakersList = [{ id: 'spk_1', name: 'Speaker 1' }];
    }

    let rawSegments = Array.isArray(parsedData.transcript) 
      ? parsedData.transcript 
      : (Array.isArray(parsedData.segments) ? parsedData.segments : []);

    const speakerMap = new Map<string, string>();
    speakersList.forEach((s: any) => {
      if (s && s.id) speakerMap.set(s.id, s.name || s.id);
    });

    let lastEndTime = 0;
    const transcript = rawSegments.map((seg: any, idx: number) => {
      let startTime = parseTimestampToSeconds(seg.startTime !== undefined ? seg.startTime : seg.start);
      let endTime = parseTimestampToSeconds(seg.endTime !== undefined ? seg.endTime : seg.end);

      if (isNaN(startTime) || startTime < 0) {
        startTime = lastEndTime;
      }
      if (isNaN(endTime) || endTime <= startTime) {
        endTime = startTime + 4.0;
      }

      lastEndTime = endTime;

      let speakerId = seg.speakerId || seg.speaker || 'spk_1';
      if (!speakerMap.has(speakerId)) {
        const matchedSpeaker = speakersList.find((s: any) => s.name === speakerId);
        if (matchedSpeaker) {
          speakerId = matchedSpeaker.id;
        } else {
          const numericId = `spk_${speakersList.length + 1}`;
          speakersList.push({ id: numericId, name: speakerId });
          speakerMap.set(numericId, speakerId);
          speakerId = numericId;
        }
      }

      return {
        id: `seg_${idx + 1}`,
        speakerId,
        startTime,
        endTime,
        text: (seg.text || '').trim(),
      };
    });

    transcript.sort((a: any, b: any) => a.startTime - b.startTime);

    const subtitles = transcript.map((seg: any, idx: number) => ({
      id: `sub_${idx + 1}`,
      index: idx + 1,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
    }));

    const estimatedDuration = transcript.length > 0 ? Math.ceil(transcript[transcript.length - 1].endTime) : (duration || 60);

    const summary = parsedData.summary || {
      overview: `Automated transcription of: ${fileName}`,
      keyPoints: ['Accurately transcribed spoken audio directly from media.'],
      chapters: [{ title: 'Main Segment', startTime: 0, endTime: estimatedDuration, summary: 'Full discussion' }],
      actionItems: ['Review transcript timecodes.'],
    };

    return res.json({
      speakers: speakersList,
      transcript,
      subtitles,
      summary,
    });
  } catch (err: any) {
    console.error('Transcription API error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to process media transcription.',
    });
  }
});

// 2b. Direct Media URL & YouTube Transcription
app.post('/api/transcribe-url', async (req, res) => {
  try {
    const { url, projectName, contextHint } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please enter a valid media URL.' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format. Please provide a valid HTTP or HTTPS link.' });
    }

    if (!isSafePublicUrl(url)) {
      return res.status(400).json({ error: 'Invalid or restricted URL target. Please enter a public web media link.' });
    }

    const ai = getGeminiClient();

    // Handle YouTube Video URLs
    if (isYouTubeUrl(url)) {
      const validation = validateAndExtractYouTubeId(url);
      if (!validation.valid || !validation.videoId) {
        return res.status(400).json({ error: validation.error || 'Please enter a valid YouTube video URL.' });
      }

      const videoId = validation.videoId;
      const canonicalUrl = validation.canonicalUrl || `https://www.youtube.com/watch?v=${videoId}`;

      // Ingest YouTube Video via multi-tier fallback pipeline
      const ytResult = await getYouTubeTranscript(videoId);

      if (!ytResult.success) {
        return res.status(400).json({
          error: ytResult.errorMessage || 'No accessible captions or audio streams could be retrieved for this YouTube video. Please download and upload the media file directly.',
        });
      }

      const videoTitle = ytResult.videoTitle || projectName || 'YouTube Video';
      const channelName = ytResult.channelName || 'YouTube Creator';

      // If retrieved via direct audio stream fallback
      if (ytResult.sourceMethod === 'audio_stream' && ytResult.audioBuffer) {
        if (!ai) {
          return res.status(500).json({
            error: 'GEMINI_API_KEY is missing. Please configure it in your environment settings.',
          });
        }

        console.log(`[Veyra YouTube] Transcribing audio stream via Gemini for "${videoTitle}"...`);
        const base64Audio = ytResult.audioBuffer.toString('base64');
        const mimeType = ytResult.audioMimeType || 'audio/mp4';

        const prompt = `You are an expert speech recognition and audio intelligence engine.
Transcribe and analyze this authentic audio track from YouTube video "${videoTitle}" by "${channelName}".

Perform strict speaker diarization and time-synchronized transcription.
Format timestamps as integer or float seconds (e.g. 0.0, 5.2, 12.8).

Provide structured JSON:
{
  "speakers": [
    { "id": "spk_1", "name": "${channelName}" }
  ],
  "transcript": [
    {
      "id": "seg_1",
      "speakerId": "spk_1",
      "startTime": 0.0,
      "endTime": 5.2,
      "text": "Exact spoken words..."
    }
  ],
  "summary": {
    "overview": "Overview...",
    "keyPoints": ["Point 1", "Point 2"],
    "chapters": [
      { "title": "Chapter 1", "startTime": 0.0, "endTime": 30.0, "summary": "Summary..." }
    ],
    "actionItems": []
  }
}`;

        const response = await generateContentWithRetry(ai, {
          model: 'gemini-3.7-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64Audio } },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const parsedData = JSON.parse(response.text || '{}');
        const rawSegments = Array.isArray(parsedData.transcript) ? parsedData.transcript : [];
        const transcript = rawSegments.map((seg: any, idx: number) => ({
          id: `seg_${idx + 1}`,
          speakerId: seg.speakerId || 'spk_1',
          startTime: parseTimestampToSeconds(seg.startTime),
          endTime: parseTimestampToSeconds(seg.endTime),
          text: (seg.text || '').trim(),
        }));

        const subtitles = transcript.map((seg: any, idx: number) => ({
          id: `sub_${idx + 1}`,
          index: idx + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          text: seg.text,
        }));

        const duration = transcript.length > 0 ? Math.ceil(transcript[transcript.length - 1].endTime) : 180;

        return res.json({
          fileName: videoTitle,
          mediaUrl: canonicalUrl,
          duration,
          fileSize: ytResult.audioBuffer.byteLength,
          speakers: parsedData.speakers || [{ id: 'spk_1', name: channelName }],
          transcript,
          subtitles,
          summary: parsedData.summary || {
            overview: `Transcribed audio from YouTube: "${videoTitle}" by ${channelName}.`,
            keyPoints: ['Accurately transcribed spoken audio stream.'],
            chapters: [{ title: 'Full Audio', startTime: 0, endTime: duration, summary: 'Full discussion' }],
            actionItems: [],
          },
        });
      }

      // If retrieved via caption tracks (standard or fallback)
      const rawCues = ytResult.segments || [];
      const transcriptSegments = groupCaptionsIntoSegments(rawCues, 'spk_1');

      const subtitles = transcriptSegments.map((seg, idx) => ({
        id: `sub_${idx + 1}`,
        index: idx + 1,
        startTime: seg.startTime,
        endTime: seg.endTime,
        text: seg.text,
      }));

      const lastSegment = transcriptSegments[transcriptSegments.length - 1];
      const estimatedDuration = lastSegment ? Math.ceil(lastSegment.endTime) : 180;

      // Generate grounded summary using Gemini on the real transcript if available
      let summaryData: any = {
        overview: `Transcribed from YouTube: "${videoTitle}" by ${channelName}.`,
        keyPoints: ['Accurately captured authentic spoken dialogue from video.'],
        chapters: [{ title: 'Full Video', startTime: 0, endTime: estimatedDuration, summary: 'Spoken dialogue overview.' }],
        actionItems: [],
      };

      if (ai && transcriptSegments.length > 0) {
        try {
          const sampleTranscriptText = transcriptSegments.slice(0, 50).map(s => `[${s.startTime}s] ${s.text}`).join('\n');
          const summaryPrompt = `You are Veyra's video intelligence engine.
Analyze the following authentic transcript for YouTube video "${videoTitle}" by "${channelName}".
Provide an accurate overview, 3-5 key takeaways, and structured topic chapters grounded strictly in this transcript.

TRANSCRIPT:
${sampleTranscriptText}

Output strictly valid JSON with this schema:
{
  "overview": "Overview text...",
  "keyPoints": ["Point 1", "Point 2"],
  "chapters": [
    { "title": "Chapter title", "startTime": 0.0, "endTime": 30.0, "summary": "Chapter summary" }
  ],
  "actionItems": []
}`;

          const aiRes = await generateContentWithRetry(ai, {
            model: 'gemini-3.1-flash-lite',
            contents: summaryPrompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const parsed = JSON.parse(aiRes.text || '{}');
          if (parsed && parsed.overview) {
            summaryData = parsed;
          }
        } catch (sumErr) {
          console.warn('[Veyra YouTube] Grounded summary generation fallback:', sumErr);
        }
      }

      return res.json({
        fileName: videoTitle,
        mediaUrl: canonicalUrl,
        duration: estimatedDuration,
        fileSize: 1024 * 512,
        speakers: [{ id: 'spk_1', name: channelName }],
        transcript: transcriptSegments,
        subtitles,
        summary: summaryData,
      });
    }

    // Direct Remote Media File (MP4, MP3, WAV, etc.)
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing. Please configure it in your environment settings.',
      });
    }

    const mediaResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'audio/*,video/*,*/*',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!mediaResponse.ok) {
      return res.status(400).json({
        error: `Unable to access media from URL (HTTP ${mediaResponse.status}: ${mediaResponse.statusText}). Please verify the link is publicly accessible.`,
      });
    }

    const contentType = mediaResponse.headers.get('content-type')?.toLowerCase() || '';
    if (contentType.includes('text/html')) {
      return res.status(400).json({
        error: 'This URL points to an HTML web page rather than a direct media file. Please provide a direct link to an MP4, MOV, MP3, or WAV file, or paste a supported YouTube video URL.',
      });
    }

    const buffer = await mediaResponse.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return res.status(400).json({
        error: 'The remote media file is empty (0 bytes).',
      });
    }

    if (buffer.byteLength > 40 * 1024 * 1024) {
      return res.status(400).json({
        error: `The media file at this URL is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum allowed URL download size is 40MB.`,
      });
    }

    const base64Audio = Buffer.from(buffer).toString('base64');
    const inferredName = projectName || parsedUrl.pathname.split('/').pop()?.split('?')[0] || 'Remote Media';
    const mimeType = contentType.startsWith('audio/') || contentType.startsWith('video/')
      ? contentType.split(';')[0]
      : 'audio/mp3';

    const promptText = `
You are Veyra's professional speech-to-text, speaker diarization, and video intelligence engine.
Analyze the provided audio/video recording for file: "${inferredName}".
${contextHint ? `Context hint: ${contextHint}` : ''}

CRITICAL REQUIREMENTS:
1. Transcribe the spoken dialogue verbatim and accurately.
2. Diarize distinct speakers (e.g., "Speaker 1", "Speaker 2").
3. Provide realistic start and end timestamps (in seconds) for each segment.
4. Output structured chapters with timestamps.
5. Provide a clear executive overview summary, 3-6 key takeaways, and actionable follow-ups.

Output strictly valid JSON with this exact schema:
{
  "speakers": [
    { "id": "spk_1", "name": "Speaker 1" },
    { "id": "spk_2", "name": "Speaker 2" }
  ],
  "transcript": [
    {
      "id": "seg_1",
      "speakerId": "spk_1",
      "startTime": 0.0,
      "endTime": 5.4,
      "text": "Exact transcribed text."
    }
  ],
  "summary": {
    "overview": "Comprehensive overview of the discussion.",
    "keyPoints": [
      "Key point 1",
      "Key point 2"
    ],
    "chapters": [
      {
        "title": "Chapter title",
        "startTime": 0,
        "endTime": 30,
        "summary": "Short chapter description."
      }
    ],
    "actionItems": []
  }
}
`;

    const aiResponse = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType,
          },
        },
        promptText,
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsedData = JSON.parse(aiResponse.text || '{}');

    const subtitles = (parsedData.transcript || []).map((seg: any, idx: number) => ({
      id: `sub_${idx + 1}`,
      index: idx + 1,
      startTime: Number(seg.startTime) || 0,
      endTime: Number(seg.endTime) || (Number(seg.startTime) + 4),
      text: seg.text || '',
    }));

    const lastSeg = (parsedData.transcript || []).slice(-1)[0];
    const estimatedDuration = lastSeg ? Math.ceil(Number(lastSeg.endTime) || 60) : 60;

    return res.json({
      fileName: inferredName,
      mediaUrl: url,
      duration: estimatedDuration,
      fileSize: buffer.byteLength,
      speakers: parsedData.speakers || [{ id: 'spk_1', name: 'Speaker 1' }],
      transcript: parsedData.transcript || [],
      subtitles,
      summary: parsedData.summary || {
        overview: `Automated transcription of ${inferredName}.`,
        keyPoints: ['Accurately transcribed and indexed dialogue'],
        chapters: [{ title: 'Main Discussion', startTime: 0, endTime: estimatedDuration, summary: 'Full recording' }],
        actionItems: [],
      },
    });
  } catch (err: any) {
    console.error('URL Transcription API error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to download and transcribe media from the specified URL.',
    });
  }
});

// 3. Real AI Q&A Grounded in Video Transcript
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, transcriptText: rawText, segments, transcript, projectName, conversationHistory } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    let transcriptText = rawText;
    if (!transcriptText && Array.isArray(segments)) {
      transcriptText = segments.map((s: any) => `[${s.startTime || 0}s] ${s.speaker || s.speakerId || 'Speaker'}: ${s.text || ''}`).join('\n');
    } else if (!transcriptText && Array.isArray(transcript)) {
      transcriptText = transcript.map((s: any) => `[${s.startTime || 0}s] ${s.speaker || s.speakerId || 'Speaker'}: ${s.text || ''}`).join('\n');
    }

    const systemInstruction = `You are Veyra AI Video Intelligence Assistant. You answer questions strictly grounded in the video transcript and metadata of "${projectName || 'the video'}".
Always be precise, concise, and quote timestamps in brackets like [01:23] when referencing specific moments in the video.
If the requested information is not mentioned in the transcript, state that clearly.`;

    const userContent = `
VIDEO TRANSCRIPT CONTEXT:
${transcriptText || 'No transcript text available.'}

PREVIOUS CONVERSATION:
${(conversationHistory || []).map((m: any) => `${m.sender === 'user' ? 'User' : 'Veyra AI'}: ${m.text}`).join('\n')}

USER QUESTION:
${prompt}
`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: userContent,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({ answer: response.text || 'Unable to generate an answer.' });
  } catch (err: any) {
    console.error('AI Ask API error:', err);
    return res.status(500).json({ error: err.message || 'Error executing AI query.' });
  }
});

// Real AI Universal Analysis Endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { segments, task, options, projectName, duration } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'No transcript segments provided for analysis.' });
    }

    const formattedTranscript = segments
      .map((s: any) => `[${typeof s.startTime === 'number' ? s.startTime.toFixed(1) : s.startTime}s - ${typeof s.endTime === 'number' ? s.endTime.toFixed(1) : s.endTime}s] ${s.speakerId || 'Speaker'}: ${s.text}`)
      .join('\n');

    let taskPrompt = '';
    if (task === 'summary') {
      const len = options?.length || 'medium';
      const detailInstruction = len === 'short'
        ? 'Provide a 1 short paragraph overview and 3 concise key takeaways.'
        : len === 'detailed'
        ? 'Provide 3-4 comprehensive overview paragraphs and 8-10 detailed key takeaways.'
        : 'Provide 2 paragraph overview and 5 key takeaways.';

      taskPrompt = `Task: Generate a grounded executive summary.
${detailInstruction}
Output strictly valid JSON with this schema:
{
  "overview": "Overview text...",
  "keyPoints": ["Point 1", "Point 2"]
}`;
    } else if (task === 'keyPoints') {
      taskPrompt = `Task: Extract the core key points from the transcript.
Output strictly valid JSON with this schema:
{
  "keyPoints": [
    {
      "id": "kp_1",
      "number": "1",
      "title": "Title of point",
      "description": "Explanation grounded strictly in transcript",
      "timestamp": 12.5
    }
  ]
}`;
    } else if (task === 'chapters') {
      taskPrompt = `Task: Generate chronological video/audio chapters based on topic transitions.
CRITICAL MANDATE FOR TIMESTAMPS:
- startTime and endTime MUST correspond to actual segment timestamps from the provided transcript (ranging from 0 to ${duration || 1000}s).
- startTime >= 0, endTime > startTime.
Output strictly valid JSON with this schema:
{
  "chapters": [
    {
      "title": "Chapter Title",
      "startTime": 0.0,
      "endTime": 30.0,
      "summary": "Chapter summary text"
    }
  ]
}`;
    } else if (task === 'keyMoments') {
      taskPrompt = `Task: Identify the most important moments or highlights in the media.
Output strictly valid JSON with this schema:
{
  "keyMoments": [
    {
      "timestamp": 15.0,
      "title": "Moment Title",
      "explanation": "Why this moment is significant, grounded in transcript"
    }
  ]
}`;
    } else if (task === 'actionItems') {
      taskPrompt = `Task: Extract all action items, decisions, and tasks mentioned in the transcript.
Rules:
- Set owner to "Not specified" if no specific person is assigned.
- Set deadline to "Not specified" if no date/time is explicitly mentioned.
Output strictly valid JSON with this schema:
{
  "actionItems": [
    {
      "task": "Task description",
      "owner": "Owner name or Not specified",
      "deadline": "Deadline or Not specified",
      "completed": false
    }
  ]
}`;
    } else if (task === 'questions') {
      taskPrompt = `Task: Extract questions asked in the transcript and categorize them into answered and unanswered questions.
Output strictly valid JSON with this schema:
{
  "asked": [
    {
      "question": "Question text",
      "askedBy": "Speaker name or Not specified",
      "timestamp": 12.0,
      "isAnswered": true,
      "answerOrReason": "Summary of answer from transcript"
    }
  ],
  "unanswered": [
    {
      "question": "Unanswered question text",
      "reason": "Why it remains unanswered based on transcript"
    }
  ]
}`;
    } else if (task === 'topics') {
      taskPrompt = `Task: Identify the main topics discussed.
Output strictly valid JSON with this schema:
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Description of topic",
      "timestamps": [0.0, 45.0]
    }
  ]
}`;
    } else if (task === 'keywords') {
      taskPrompt = `Task: Extract important keywords, names, and concepts.
Output strictly valid JSON with this schema:
{
  "keywords": [
    {
      "term": "Keyword or concept",
      "category": "Technology/Concept/Person/General",
      "count": 5,
      "relevance": 95
    }
  ]
}`;
    } else if (task === 'knowledgeMap') {
      taskPrompt = `Task: Construct a visual Knowledge Map of concepts grounded in the transcript.
Output strictly valid JSON with this schema:
{
  "nodes": [
    {
      "id": "node_1",
      "name": "Topic Name",
      "type": "main_topic",
      "summary": "Grounded explanation based on transcript...",
      "sources": [
        { "timestamp": 45.2, "textSnippet": "Snippet from transcript", "speaker": "Speaker 1" }
      ],
      "relatedTopicIds": ["node_2"],
      "importanceScore": 90,
      "parentId": null
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "sourceId": "node_1",
      "targetId": "node_2",
      "label": "contains",
      "type": "contains"
    }
  ]
}`;
    } else if (task === 'meetingIntelligence') {
      taskPrompt = `Task: Extract structured Meeting & Decision Intelligence strictly grounded in the transcript.
Output strictly valid JSON with this schema:
{
  "summary": "Concise factual summary...",
  "decisions": [
    {
      "id": "dec_1",
      "text": "Decision text",
      "timestamp": 42.5,
      "speaker": "Speaker 1",
      "context": "Short context",
      "sources": [{"timestamp": 42.5, "textSnippet": "Snippet text..."}]
    }
  ],
  "actionItems": [
    {
      "id": "act_1",
      "task": "Task description",
      "owner": "Unassigned",
      "deadline": "No deadline",
      "status": "OPEN",
      "timestamp": 105.0,
      "sources": [{"timestamp": 105.0, "textSnippet": "Snippet text..."}]
    }
  ],
  "openQuestions": [
    {
      "id": "q_1",
      "question": "Question text",
      "status": "OPEN",
      "timestamp": 140.2,
      "sources": [{"timestamp": 140.2, "textSnippet": "Snippet text..."}]
    }
  ],
  "risks": [
    {
      "id": "risk_1",
      "risk": "Risk description",
      "impact": "medium",
      "timestamp": 180.0,
      "sources": [{"timestamp": 180.0, "textSnippet": "Snippet text..."}]
    }
  ],
  "agreementsDisagreements": [
    {
      "id": "ad_1",
      "type": "agreement",
      "topic": "Topic",
      "summary": "Summary of consensus",
      "timestamp": 200.0,
      "sources": [{"timestamp": 200.0, "textSnippet": "Snippet text..."}]
    }
  ]
}`;
    } else if (task === 'researchMode') {
      const researchQuery = req.body.query || 'Main topic investigation';
      taskPrompt = `Task: Investigate the user's research query strictly based on the transcript.
User Query: "${researchQuery}"

Output strictly valid JSON with this schema:
{
  "title": "Research Title",
  "summary": "Synthesis of findings",
  "mainFinding": "Concise main finding",
  "isInsufficientEvidence": false,
  "findings": [
    {
      "id": "find_1",
      "claim": "Claim text",
      "claimType": "fact",
      "summary": "Explanation",
      "excerpt": "Quote from transcript",
      "timestamp": 45.2,
      "speaker": "Speaker 1",
      "evidenceCategory": "SUPPORTING",
      "sources": [{"timestamp": 45.2, "textSnippet": "Snippet..."}]
    }
  ],
  "contradictions": [],
  "unresolvedQuestions": []
}`;
    } else {
      return res.status(400).json({ error: `Unsupported task: ${task}` });
    }

    const prompt = `You are VEYRA's professional transcript intelligence analyzer.
Analyze the following transcript for "${projectName || 'Media Project'}".
DO NOT invent or hallucinate facts not supported by the transcript.

${taskPrompt}

TRANSCRIPT CONTENT:
${formattedTranscript}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.json(parsedData);
  } catch (err: any) {
    console.error('AI Analyze API error:', err);
    return res.status(500).json({ error: err.message || 'Error conducting AI transcript analysis.' });
  }
});

// Real AI Summarize endpoint
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { segments, length, projectName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'No transcript segments provided for summarization.' });
    }

    const lengthGuideline = length === 'short' 
      ? 'Generate a brief overview (1 short paragraph) and 3 short key points.'
      : length === 'detailed'
        ? 'Generate a comprehensive summary (3-4 paragraphs) and 6-10 elaborate key takeaways.'
        : 'Generate a moderate length summary (2 paragraphs) and 4-6 key takeaways.';

    const formattedTranscript = segments
      .map((s: any) => `[${s.startTime}s - ${s.endTime}s] ${s.speakerId || 'Speaker'}: ${s.text}`)
      .join('\n');

    const prompt = `You are Veyra's professional video intelligence and summarization engine.
Analyze the following video transcript for "${projectName || 'the video'}".

${lengthGuideline}

Output strictly valid JSON with this exact schema:
{
  "overview": "Overview text...",
  "keyPoints": [
    "Key takeaway point 1",
    "Key takeaway point 2"
  ],
  "chapters": [
    {
      "title": "Chapter title",
      "startTime": 0.0,
      "endTime": 30.0,
      "summary": "Short description of chapter topic."
    }
  ],
  "actionItems": []
}

TRANSCRIPT:
${formattedTranscript}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const summaryResult = JSON.parse(cleanJson);

    return res.json(summaryResult);
  } catch (err: any) {
    console.error('AI Summarize API error:', err);
    return res.status(500).json({ error: err.message || 'Error generating summary.' });
  }
});

// Real AI Language Detection endpoint
app.post('/api/ai/detect-language', async (req, res) => {
  try {
    const { text, segments } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    let sampleText = text;
    if (!sampleText && Array.isArray(segments) && segments.length > 0) {
      sampleText = segments.slice(0, 10).map((s: any) => s.text).join(' ');
    }

    if (!sampleText || !sampleText.trim()) {
      return res.status(400).json({ error: 'No text provided for language detection.' });
    }

    const prompt = `Identify the primary language of the following spoken transcript sample:
"${sampleText.slice(0, 1500)}"

Output strictly valid JSON with this exact schema:
{
  "language": "English",
  "code": "en",
  "confidence": 0.98,
  "isRTL": false
}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.json(parsedData);
  } catch (err: any) {
    console.error('AI Language Detection error:', err);
    return res.status(500).json({ error: err.message || 'Error detecting language.' });
  }
});

// Real Multilingual AI Translation
app.post('/api/ai/translate', async (req, res) => {
  try {
    const { segments, sourceLanguage, targetLanguage, projectName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'No transcript segments provided for translation.' });
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({ error: 'Target language must be specified.' });
    }

    const resolvedSource = sourceLanguage && sourceLanguage !== 'auto' && sourceLanguage !== 'Auto Detect'
      ? sourceLanguage.trim()
      : 'Auto Detect';

    if (resolvedSource.toLowerCase() === targetLanguage.toLowerCase()) {
      return res.status(400).json({
        error: `Source and target languages are the same (${targetLanguage}). Please select a different target language.`
      });
    }

    const BATCH_SIZE = 25;
    const batches: any[][] = [];
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      batches.push(segments.slice(i, i + BATCH_SIZE));
    }

    let detectedSourceLanguage = resolvedSource !== 'Auto Detect' ? resolvedSource : '';
    const allTranslatedSegments: any[] = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const inputItems = batch.map((seg, idx) => ({
        idx: idx + 1,
        id: seg.id || `seg_${batchIdx * BATCH_SIZE + idx}`,
        text: seg.text || '',
      }));

      const prompt = `Translate the following video transcript segments into ${targetLanguage}.
${resolvedSource !== 'Auto Detect' ? `Source language is ${resolvedSource}.` : 'Auto-detect source language.'}

Input Segments:
${JSON.stringify(inputItems, null, 2)}

Output strictly valid JSON with this exact schema:
{
  "detectedSourceLanguage": "English",
  "translations": [
    {
      "idx": 1,
      "id": "${inputItems[0]?.id || 'seg_0'}",
      "translatedText": "Translated text here"
    }
  ]
}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.15,
        },
      });

      const rawText = response.text || '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (!detectedSourceLanguage && parsed.detectedSourceLanguage) {
        detectedSourceLanguage = parsed.detectedSourceLanguage;
      }

      const translationsList = parsed.translations || parsed.translatedSegments || [];
      const translationMapById = new Map<string, string>();
      const translationListByIndex: string[] = [];

      translationsList.forEach((item: any, i: number) => {
        const txt = item.translatedText || item.text || '';
        if (item.id) {
          translationMapById.set(item.id, txt);
        }
        translationListByIndex[i] = txt;
      });

      const alignedBatch = batch.map((origSeg, idx) => {
        let translatedText = translationMapById.get(origSeg.id) || translationListByIndex[idx] || '';
        if (!translatedText || !translatedText.trim()) {
          translatedText = origSeg.text;
        }

        return {
          id: origSeg.id,
          speakerId: origSeg.speakerId || 'spk_1',
          startTime: origSeg.startTime,
          endTime: origSeg.endTime,
          text: translatedText.trim(),
          originalText: origSeg.text,
        };
      });

      allTranslatedSegments.push(...alignedBatch);
    }

    return res.json({
      translatedSegments: allTranslatedSegments,
      detectedSourceLanguage: detectedSourceLanguage || (resolvedSource !== 'Auto Detect' ? resolvedSource : 'English'),
      targetLanguage,
      totalSegments: allTranslatedSegments.length,
    });
  } catch (err: any) {
    console.error('AI Translate API error:', err);
    return res.status(500).json({ error: err.message || 'Error translating transcript.' });
  }
});

// Real AI Study Questions & Flashcards Generation
app.post('/api/ai/study-quiz', async (req, res) => {
  try {
    const { transcriptText: rawText, segments, transcript, projectName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    let transcriptText = rawText;
    if (!transcriptText && Array.isArray(segments)) {
      transcriptText = segments.map((s: any) => `[${s.startTime || 0}s] ${s.speaker || s.speakerId || 'Speaker'}: ${s.text || ''}`).join('\n');
    } else if (!transcriptText && Array.isArray(transcript)) {
      transcriptText = transcript.map((s: any) => `[${s.startTime || 0}s] ${s.speaker || s.speakerId || 'Speaker'}: ${s.text || ''}`).join('\n');
    }

    if (!transcriptText || !transcriptText.trim()) {
      return res.status(400).json({ error: 'No transcript text provided for study quiz generation.' });
    }

    const prompt = `Generate an interactive study quiz and flashcards based on the following transcript for "${projectName || 'the video'}".

Transcript:
${transcriptText}

Output strictly valid JSON matching this schema:
{
  "flashcards": [
    {
      "id": "fc_1",
      "front": "Concept or Question",
      "back": "Detailed answer grounded in the video",
      "timestamp": 12.5
    }
  ],
  "quiz": [
    {
      "id": "q_1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct based on the video.",
      "timestamp": 15.0
    }
  ]
}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('AI Study Quiz API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate study materials.' });
  }
});

// Real AI Semantic & Conceptual Search
app.post('/api/ai/semantic-search', async (req, res) => {
  try {
    const { segments, query, projectName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'No transcript segments provided.' });
    }

    const formattedTranscript = segments
      .map((s: any) => `[ID: ${s.id}] [Time: ${s.startTime}s - ${s.endTime}s] [Speaker: ${s.speakerId || 'spk'}]: ${s.text}`)
      .join('\n');

    const prompt = `Analyze the following transcript for "${projectName || 'the video'}" to find all segments that are semantically relevant to the user's conceptual search query.

USER QUERY:
"${query.trim()}"

Output strictly valid JSON with this exact schema:
{
  "matches": [
    {
      "segmentId": "exact_segment_id_from_transcript",
      "relevance": 90,
      "matchedConcept": "Brief reason of semantic relevance",
      "highlightWords": ["words", "to", "highlight"]
    }
  ],
  "relatedConcepts": [
    "Related concept 1",
    "Related concept 2"
  ]
}

TRANSCRIPT:
${formattedTranscript}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const validSegmentIds = new Set(segments.map((s: any) => s.id));
    const verifiedMatches = (parsed.matches || []).filter((m: any) => validSegmentIds.has(m.segmentId));

    return res.json({
      matches: verifiedMatches,
      relatedConcepts: parsed.relatedConcepts || [],
    });
  } catch (err: any) {
    console.error('Semantic search API error:', err);
    return res.status(500).json({ error: err.message || 'Failed to perform semantic search.' });
  }
});

// Real AI Document Generation Workspace Endpoint
app.post('/api/ai/generate-document', async (req, res) => {
  try {
    const { segments, docType, projectName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'No transcript segments provided for document generation.' });
    }

    const formattedTranscript = segments
      .map((s: any) => `[ID: ${s.id}] [Time: ${typeof s.startTime === 'number' ? s.startTime.toFixed(1) : s.startTime}s] ${s.speakerId || 'Speaker'}: ${s.text}`)
      .join('\n');

    let docGuidelines = `Create a highly professional ${docType.replace('_', ' ')} based on the transcript.`;

    const prompt = `Transform raw video transcripts into a world-class, professionally formatted document of type: "${docType.replace('_', ' ').toUpperCase()}".

Directives:
1. GROUNDED ON TRUTH: Every fact, name, date, time, and claim MUST be grounded strictly in the transcript.
2. SOURCE TRACEABILITY: Segment document into sections with 'startTime' and 'segmentIds'.
3. INLINE CITATIONS: Include clickable timestamp citations like "[01:23]".

Input Transcript:
${formattedTranscript}

Output strictly valid JSON matching this exact schema:
{
  "title": "A highly specific, refined document title",
  "content": "Full markdown-formatted document text with bracketed inline timestamp citations like [02:15].",
  "isInsufficient": false,
  "sections": [
    {
      "id": "sec_1",
      "title": "Section or Heading Title",
      "text": "Detailed summary of this section",
      "startTime": 0.0,
      "segmentIds": ["seg_1"]
    }
  ]
}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const rawText = response.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.json(parsedData);
  } catch (err: any) {
    console.error('AI Generate Document API error:', err);
    return res.status(500).json({ error: err.message || 'Error generating structured document.' });
  }
});

// Link Metadata Fetch Endpoint
app.post('/api/fetch-link', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    const parsed = new URL(url);
    const fileName = parsed.pathname.split('/').pop()?.split('?')[0] || 'remote_media';
    const isDirect = /\.(mp4|webm|mov|avi|mkv|mp3|wav|m4a|ogg|aac)(\?.*)?$/i.test(parsed.pathname);

    return res.json({
      url,
      fileName,
      isDirectMedia: isDirect,
      host: parsed.hostname,
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }
});

export { app };
export default app;
