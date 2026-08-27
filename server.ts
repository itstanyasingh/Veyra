import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

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

      // Call Gemini 2.5 Flash for multimodal audio processing & structured intelligence
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents as any,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const rawText = response.text || '{}';
      const parsedData = JSON.parse(rawText);

      // Generate matching subtitle cues
      const subtitles = (parsedData.transcript || []).map((seg: any, idx: number) => ({
        id: `sub_${idx + 1}`,
        index: idx + 1,
        startTime: Number(seg.startTime) || 0,
        endTime: Number(seg.endTime) || (Number(seg.startTime) + 4),
        text: seg.text || '',
      }));

      return res.json({
        speakers: parsedData.speakers || [{ id: 'spk_1', name: 'Speaker 1' }],
        transcript: parsedData.transcript || [],
        subtitles,
        summary: parsedData.summary || {
          overview: `Automated transcription of ${fileName}.`,
          keyPoints: ['Accurately transcribed and indexed dialogue'],
          chapters: [{ title: 'Main Discussion', startTime: 0, endTime: duration || 60, summary: 'Full recording' }],
          actionItems: ['Review and verify transcript timecodes'],
        },
      });
    } catch (err: any) {
      console.error('Transcription API error:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process media transcription.',
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
