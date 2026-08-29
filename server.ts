import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import fs from 'fs';
import { isYouTubeUrl, extractYouTubeVideoId, normalizeYouTubeUrl } from './server/youtube';

dotenv.config();

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
      if (p1 === 169 && p2 === 254) return false; // GCP Metadata Server
      if (p1 === 192 && p2 === 168) return false;
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getGeminiClient(): GoogleGenAI | null {
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

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
): Promise<any> {
  const primaryModel = params.model;
  // Determine appropriate fallback based on primary model or task
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
        console.log(`[Veyra AI] Attempting generateContent using model: ${currentModel} (try ${attempt + 1}/${maxRetries})...`);
        
        // Timeout protection wrapper (12 seconds)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 12000)
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
        console.error(`[Veyra AI] Model ${currentModel} attempt ${attempt} failed: ${errMsg}`);
        
        // Check if the error is transient
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
          // If it's a structural 400 Bad Request, try fallback immediately without retrying
          break;
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s...
          console.log(`[Veyra AI] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error('GenerateContent failed after all attempts and fallbacks.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limits for base64 audio/video uploads
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // 2. Real Transcription & Diarization & Video Intelligence
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, fileName, duration, contextHint } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is missing. Please configure it in your settings.',
        });
      }

      const promptText = `
You are Veyra's professional speech-to-text, speaker diarization, and video intelligence engine.
Analyze the provided audio recording for file: "${fileName || 'Media File'}" (approx duration: ${duration || 60} seconds).
${contextHint ? `Context hint: ${contextHint}` : ''}

CRITICAL REQUIREMENTS:
1. Transcribe the spoken dialogue verbatim and accurately.
2. Diarize distinct speakers (e.g., "Speaker 1", "Speaker 2", or actual names if stated in dialogue).
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

      const contents: unknown[] = [];

      if (audioBase64) {
        contents.push({
          inlineData: {
            data: audioBase64,
            mimeType: mimeType || 'audio/wav',
          },
        });
      }

      contents.push(promptText);

      // Call Gemini 3.7 Flash (or fallback) for multimodal audio processing & structured intelligence
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.7-flash',
        contents: contents as any,
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

      // Validate and repair speakers list
      let speakersList = Array.isArray(parsedData.speakers) ? parsedData.speakers : [];
      if (speakersList.length === 0) {
        speakersList = [{ id: 'spk_1', name: 'Speaker 1' }];
      }

      // Validate and repair transcript segments
      let rawSegments = Array.isArray(parsedData.transcript) 
        ? parsedData.transcript 
        : (Array.isArray(parsedData.segments) ? parsedData.segments : []);

      const speakerMap = new Map<string, string>();
      speakersList.forEach((s: any) => {
        if (s && s.id) speakerMap.set(s.id, s.name || s.id);
      });

      let lastEndTime = 0;
      let transcript = rawSegments.map((seg: any, idx: number) => {
        let startTime = parseTimestampToSeconds(seg.startTime !== undefined ? seg.startTime : seg.start);
        let endTime = parseTimestampToSeconds(seg.endTime !== undefined ? seg.endTime : seg.end);

        // Repair invalid start/end times
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

      // Ensure segments are sorted chronologically
      transcript.sort((a, b) => a.startTime - b.startTime);

      // Regenerate subtitle cues based on the sorted, repaired transcript
      const subtitles = transcript.map((seg, idx) => ({
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

  // 2b. Direct Media URL Transcription
  app.post('/api/transcribe-url', async (req, res) => {
    try {
      const { url, projectName, contextHint } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'Please enter a valid media URL.' });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format. Please provide a valid HTTP or HTTPS link.' });
      }

      // Security: SSRF validation against internal IP addresses and restricted schemes
      if (!isSafePublicUrl(url)) {
        return res.status(400).json({ error: 'Invalid or restricted URL target. Please enter a public web media link.' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is missing. Please configure it in your environment settings.',
        });
      }

      const host = parsedUrl.hostname.toLowerCase();

      // Direct YouTube Video Input Processing via Real Ingestion and Transcription Pipeline
      if (isYouTubeUrl(url)) {
        const videoId = extractYouTubeVideoId(url);
        if (!videoId) {
          return res.status(400).json({ error: 'Please enter a valid YouTube video URL.' });
        }
        const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // 1. Fetch video metadata using YouTube oEmbed API (extremely fast & never blocked)
        let videoTitle = projectName || 'YouTube Video';
        try {
          const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`, {
            signal: AbortSignal.timeout(5000),
          });
          if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json() as any;
            if (oembedData && oembedData.title) {
              videoTitle = oembedData.title;
            }
          }
        } catch (oembedErr) {
          console.warn('[Veyra AI] Failed to fetch oembed metadata:', oembedErr);
        }

        // 2. Download audio track using our multi-threaded Python downloader
        const tempMp3Path = path.join('/tmp', `veyra_yt_${videoId}_${Date.now()}.mp3`);
        console.log(`[Veyra AI] Downloading audio for YouTube video ${videoId} to ${tempMp3Path}...`);
        
        const downloadProc = spawnSync('python3', [
          path.join(process.cwd(), 'server/bin/download_youtube.py'),
          canonicalUrl,
          tempMp3Path
        ], {
          timeout: 180000, // 3 minute total timeout
          encoding: 'utf-8'
        });

        if (downloadProc.status !== 0) {
          console.error('[Veyra AI] YouTube audio download failed:', downloadProc.stderr || downloadProc.stdout);
          const rawErr = downloadProc.stderr || downloadProc.stdout || '';
          let userFriendlyError = 'Failed to download YouTube audio stream. The video might be private, age-restricted, or blocked by YouTube.';
          if (rawErr.includes('Private video')) {
            userFriendlyError = 'This YouTube video is private. Please provide a public YouTube video URL.';
          } else if (rawErr.includes('Video unavailable')) {
            userFriendlyError = 'This YouTube video is unavailable or deleted.';
          } else if (rawErr.includes('Sign in to confirm you’re not a bot')) {
            userFriendlyError = 'YouTube is currently blocking download requests from our cloud server. Please try uploading the media file directly.';
          }
          return res.status(400).json({ error: userFriendlyError });
        }

        if (!fs.existsSync(tempMp3Path)) {
          return res.status(400).json({
            error: 'Failed to locate downloaded audio file on server.'
          });
        }

        // 3. Read downloaded audio and convert to base64
        const audioBuffer = fs.readFileSync(tempMp3Path);
        const base64Audio = audioBuffer.toString('base64');
        const fileSize = audioBuffer.byteLength;

        // Clean up the temporary MP3 file immediately
        try {
          fs.unlinkSync(tempMp3Path);
        } catch (cleanupErr) {
          console.error('[Veyra AI] Failed to delete temp audio file:', cleanupErr);
        }

        const transcriptionPrompt = `You are Veyra's professional speech-to-text, speaker diarization, and video intelligence engine.
Analyze the provided audio recording of the YouTube video: "${videoTitle}" (approx duration: available in media stream).
${contextHint ? `Context hint: ${contextHint}` : ''}

CRITICAL REQUIREMENTS:
1. Transcribe the spoken dialogue verbatim and accurately.
2. Diarize distinct speakers (e.g., "Speaker 1", "Speaker 2", or actual names if stated in dialogue).
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
}`;

        try {
          const aiResponse = await generateContentWithRetry(ai, {
            model: 'gemini-3.7-flash',
            contents: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: 'audio/mp3',
                },
              },
              transcriptionPrompt,
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const rawText = aiResponse.text || '{}';
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          let parsedData: any = {};
          try {
            parsedData = JSON.parse(cleanJson);
          } catch {
            console.error('Failed to parse Gemini JSON response:', rawText);
            return res.status(500).json({ error: 'Failed to parse generated transcription data.' });
          }

          // Validate and repair speakers list
          let speakersList = Array.isArray(parsedData.speakers) ? parsedData.speakers : [];
          if (speakersList.length === 0) {
            speakersList = [{ id: 'spk_1', name: 'Speaker 1' }];
          }

          // Validate and repair transcript segments
          let rawSegments = Array.isArray(parsedData.transcript) 
            ? parsedData.transcript 
            : (Array.isArray(parsedData.segments) ? parsedData.segments : []);

          const speakerMap = new Map<string, string>();
          speakersList.forEach((s: any) => {
            if (s && s.id) speakerMap.set(s.id, s.name || s.id);
          });

          let lastEndTime = 0;
          let transcript = rawSegments.map((seg: any, idx: number) => {
            let startTime = parseTimestampToSeconds(seg.startTime !== undefined ? seg.startTime : seg.start);
            let endTime = parseTimestampToSeconds(seg.endTime !== undefined ? seg.endTime : seg.end);

            // Repair invalid start/end times
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

          // Ensure segments are sorted chronologically
          transcript.sort((a, b) => a.startTime - b.startTime);

          // Regenerate subtitle cues based on the sorted, repaired transcript
          const subtitles = transcript.map((seg, idx) => ({
            id: `sub_${idx + 1}`,
            index: idx + 1,
            startTime: seg.startTime,
            endTime: seg.endTime,
            text: seg.text,
          }));

          const estimatedDuration = transcript.length > 0 ? Math.ceil(transcript[transcript.length - 1].endTime) : 60;

          const summary = parsedData.summary || {
            overview: `Automated transcription of YouTube video: ${videoTitle}`,
            keyPoints: ['Accurately transcribed spoken audio directly from video.'],
            chapters: [{ title: 'Main Segment', startTime: 0, endTime: estimatedDuration, summary: 'Full video discussion' }],
            actionItems: ['Review transcript timecodes.'],
          };

          return res.json({
            fileName: videoTitle,
            mediaUrl: canonicalUrl,
            duration: estimatedDuration,
            fileSize,
            speakers: speakersList,
            transcript,
            subtitles,
            summary,
          });
        } catch (ytErr: any) {
          console.error('Gemini YouTube video error:', ytErr);
          return res.status(400).json({
            error: ytErr?.message || "We couldn't transcribe the YouTube video audio right now. Please try again.",
          });
        }
      }

      // Attempt to download direct public media stream (MP4, MOV, MP3, WAV, etc.)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'audio/*,video/*,*/*',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        return res.status(400).json({
          error: `Unable to access media from URL (HTTP ${response.status}: ${response.statusText}). Please verify the link is publicly accessible.`,
        });
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() || '';
      if (contentType.includes('text/html')) {
        return res.status(400).json({
          error: "This URL points to an HTML web page rather than a direct media file. Please provide a direct link to an MP4, MOV, MP3, or WAV file, or paste a supported YouTube video URL.",
        });
      }

      const buffer = await response.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        return res.status(400).json({
          error: 'The remote media file is empty (0 bytes).',
        });
      }

      // Cap at 48MB for direct inline payload
      if (buffer.byteLength > 48 * 1024 * 1024) {
        return res.status(400).json({
          error: `The media file at this URL is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum allowed URL download size is 48MB.`,
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
2. Diarize distinct speakers (e.g., "Speaker 1", "Speaker 2", or actual names if stated in dialogue).
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

      const rawText = aiResponse.text || '{}';
      const parsedData = JSON.parse(rawText);

      const subtitles = (parsedData.transcript || []).map((seg: any, idx: number) => ({
        id: `sub_${idx + 1}`,
        index: idx + 1,
        startTime: Number(seg.startTime) || 0,
        endTime: Number(seg.endTime) || (Number(seg.startTime) + 4),
        text: seg.text || '',
      }));

      // Approximate duration from last segment or header
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
          actionItems: ['Review and verify transcript timecodes'],
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
      const { prompt, transcriptText, projectName, conversationHistory } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is missing.',
        });
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
        ? 'Generate a very brief, high-level summary (1 short paragraph) and 3 short key points.'
        : length === 'detailed'
          ? 'Generate a comprehensive, highly detailed and exhaustive summary (3-4 large paragraphs) and 6-10 elaborate key takeaways.'
          : 'Generate a moderate length summary (2 paragraphs) and 4-6 key takeaways.';

      const formattedTranscript = segments
        .map((s: any) => `[${s.startTime} - ${s.endTime}] ${s.speakerId || 'Speaker'}: ${s.text}`)
        .join('\n');

      const prompt = `You are Veyra's professional video intelligence and summarization engine.
Analyze the following video transcript for "${projectName || 'the video'}".

${lengthGuideline}

CRITICAL REQUIREMENTS:
1. Overview must be grounded entirely in the transcript.
2. Chapters MUST use real start and end timestamps from the provided segments (do not invent timestamps outside the actual segments range).
3. Identify actionable follow-ups or action items. If there are none, return empty array.

Output strictly valid JSON with this exact schema:
{
  "overview": "Your summary overview here based on the requested length.",
  "keyPoints": [
    "Key takeaway point 1",
    "Key takeaway point 2"
  ],
  "chapters": [
    {
      "title": "Chapter title",
      "startTime": 0.0,
      "endTime": 30.0,
      "summary": "Short description of this chapter's topic."
    }
  ],
  "actionItems": [
    "Action item 1",
    "Action item 2"
  ]
}

TRANSCRIPT:
${formattedTranscript}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
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

  // 4. Real AI Translation of Transcript & Subtitles
  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { segments, targetLanguage } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
      }

      const prompt = `
You are a professional subtitle and transcript translator.
Translate the following transcript segments into ${targetLanguage || 'Spanish'}.
Preserve all segment IDs, start times, and end times exactly.
Make the translation natural, accurate, and aligned with the timing.

Input Segments:
${JSON.stringify(segments)}

Output strictly valid JSON with this schema:
{
  "translatedSegments": [
    {
      "id": "original_id",
      "speakerId": "spk_1",
      "startTime": 0.0,
      "endTime": 5.0,
      "text": "Translated text"
    }
  ]
}
`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ translatedSegments: parsed.translatedSegments || [] });
    } catch (err: any) {
      console.error('AI Translate API error:', err);
      return res.status(500).json({ error: err.message || 'Error translating transcript.' });
    }
  });

  // 5. Real AI Study Questions & Flashcards Generation
  app.post('/api/ai/study-quiz', async (req, res) => {
    try {
      const { transcriptText, projectName } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
      }

      const prompt = `
You are an expert educational tutor. Generate an interactive study quiz and flashcards based on the following transcript for "${projectName || 'the video'}".

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
}
`;

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

  // 6. Fetch URL Link metadata
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

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Veyra Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
