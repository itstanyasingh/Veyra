/**
 * VEYRA — YouTube URL Parsing, Metadata, and Multi-Tier Transcription Pipeline
 *
 * Implements a production-hardened retrieval architecture:
 * 1. URL validation & canonical video ID extraction
 * 2. Status verification via YouTube oEmbed & player status
 * 3. Multi-tier caption ingestion (Innertube, watch page, JSON3/XML timedtext, language tracks)
 * 4. Direct audio stream extraction & Gemini audio fallback if stream is accessible
 * 5. Specific error categorization (private, deleted, bot check, disabled CC)
 * 6. Structured logging without exposing sensitive data
 */

import { fetchTranscript, listLanguages } from 'youtube-transcript-plus';

export interface YouTubeValidationResult {
  valid: boolean;
  videoId?: string;
  canonicalUrl?: string;
  error?: string;
}

export interface YouTubeMetadata {
  status: 'ok' | 'not_found' | 'private_restricted' | 'unknown_error';
  title?: string;
  authorName?: string;
  authorUrl?: string;
  error?: string;
}

export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface YouTubeTranscriptResult {
  success: boolean;
  segments?: CaptionSegment[];
  videoTitle?: string;
  channelName?: string;
  language?: string;
  sourceMethod?: 'innertube_plus' | 'innertube_lang_fallback' | 'page_json3' | 'page_xml' | 'innertube_direct' | 'audio_stream';
  audioBuffer?: Buffer;
  audioMimeType?: string;
  errorCategory?: 'invalid_url' | 'not_found' | 'private_restricted' | 'bot_challenge' | 'no_captions' | 'upstream_timeout' | 'unknown';
  errorMessage?: string;
}

// 1. URL Validation & ID Extraction
export function validateAndExtractYouTubeId(urlStr: string): YouTubeValidationResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, error: 'Please enter a valid YouTube video URL.' };
  }

  const trimmed = urlStr.trim();

  // If someone passed raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      valid: true,
      videoId: trimmed,
      canonicalUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');

    const validHosts = [
      'youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'youtube-nocookie.com',
    ];

    const isYtHost = validHosts.some(vh => host === vh || host.endsWith('.' + vh));
    if (!isYtHost) {
      return { valid: false, error: 'The provided link is not a recognized YouTube domain.' };
    }

    let candidateId: string | null = null;

    // Pattern 1: youtu.be/VIDEO_ID
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const part = u.pathname.substring(1).split('/')[0]?.split('?')[0];
      if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
        candidateId = part;
      }
    }

    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    if (!candidateId && u.pathname.startsWith('/watch')) {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        candidateId = v;
      }
    }

    // Pattern 3: youtube.com/shorts/VIDEO_ID
    if (!candidateId && u.pathname.startsWith('/shorts/')) {
      const part = u.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
      if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
        candidateId = part;
      }
    }

    // Pattern 4: youtube.com/embed/VIDEO_ID
    if (!candidateId && u.pathname.startsWith('/embed/')) {
      const part = u.pathname.split('/embed/')[1]?.split('/')[0]?.split('?')[0];
      if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
        candidateId = part;
      }
    }

    // Pattern 5: youtube.com/v/VIDEO_ID or /live/VIDEO_ID
    if (!candidateId && (u.pathname.startsWith('/v/') || u.pathname.startsWith('/live/'))) {
      const parts = u.pathname.split('/');
      const part = parts[2]?.split('?')[0];
      if (part && /^[a-zA-Z0-9_-]{11}$/.test(part)) {
        candidateId = part;
      }
    }

    if (candidateId) {
      return {
        valid: true,
        videoId: candidateId,
        canonicalUrl: `https://www.youtube.com/watch?v=${candidateId}`,
      };
    }

    return {
      valid: false,
      error: 'Could not extract a valid 11-character YouTube video ID from the provided URL.',
    };
  } catch {
    return { valid: false, error: 'Invalid URL format. Please provide a valid YouTube link.' };
  }
}

export function isYouTubeUrl(urlStr: string): boolean {
  return validateAndExtractYouTubeId(urlStr).valid;
}

export function extractYouTubeVideoId(urlStr: string): string | null {
  return validateAndExtractYouTubeId(urlStr).videoId || null;
}

export function normalizeYouTubeUrl(urlStr: string): string | null {
  return validateAndExtractYouTubeId(urlStr).canonicalUrl || null;
}

// 2. Fetch Video Metadata via oEmbed
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  try {
    const res = await fetch(oembedEndpoint, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        status: 'ok',
        title: data.title || 'YouTube Video',
        authorName: data.author_name || 'YouTube Creator',
        authorUrl: data.author_url,
      };
    }

    if (res.status === 404) {
      return {
        status: 'not_found',
        error: 'This YouTube video does not exist or has been removed.',
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        status: 'private_restricted',
        error: 'This YouTube video is private or restricted by its owner.',
      };
    }

    return { status: 'unknown_error', title: 'YouTube Video', authorName: 'YouTube Creator' };
  } catch (err: any) {
    console.warn(`[Veyra YouTube] oEmbed request failed for ${videoId}:`, err?.message);
    return { status: 'unknown_error', title: 'YouTube Video', authorName: 'YouTube Creator' };
  }
}

// 3. HTML & XML Entity Helpers
export function decodeHtmlEntities(str: string): string {
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

export function parseXmlCaptions(xmlText: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const regex = /<text\s+start="([^"]+)"(?:\s+dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  let match;

  while ((match = regex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]) || 0;
    const dur = parseFloat(match[2] || '3.0') || 3.0;
    const rawText = match[3].replace(/<[^>]+>/g, '');
    const cleaned = decodeHtmlEntities(rawText).replace(/\n+/g, ' ').trim();
    if (cleaned) {
      segments.push({
        startTime: Math.round(start * 100) / 100,
        endTime: Math.round((start + dur) * 100) / 100,
        text: cleaned,
      });
    }
  }

  return segments;
}

export function parseJson3Captions(jsonData: any): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const events = jsonData?.events || [];

  for (const event of events) {
    if (!event.segs || !Array.isArray(event.segs)) continue;
    const startSec = (event.tStartMs || 0) / 1000;
    const durSec = (event.dDurationMs || 3000) / 1000;
    const fullText = event.segs.map((s: any) => s.utf8 || '').join('').trim();
    const cleaned = decodeHtmlEntities(fullText).replace(/\n+/g, ' ').trim();

    if (cleaned && cleaned !== '\n') {
      segments.push({
        startTime: Math.round(startSec * 100) / 100,
        endTime: Math.round((startSec + durSec) * 100) / 100,
        text: cleaned,
      });
    }
  }

  return segments;
}

// 4. Robust Multi-Tier Ingestion Engine
export async function getYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult> {
  const t0 = Date.now();
  console.log(`[Veyra YouTube Ingest] Starting retrieval pipeline for video ID: ${videoId}`);

  // Step A: Fetch oEmbed Metadata & Status
  const metadata = await fetchYouTubeMetadata(videoId);
  if (metadata.status === 'not_found') {
    console.warn(`[Veyra YouTube Ingest] Video ${videoId} is deleted/not found.`);
    return {
      success: false,
      errorCategory: 'not_found',
      errorMessage: `This YouTube video does not exist or has been removed. (Video ID: ${videoId})`,
    };
  }

  if (metadata.status === 'private_restricted') {
    console.warn(`[Veyra YouTube Ingest] Video ${videoId} is private/restricted.`);
    return {
      success: false,
      errorCategory: 'private_restricted',
      errorMessage: `This YouTube video is private or restricted by its owner. (Video ID: ${videoId})`,
    };
  }

  const videoTitle = metadata.title || 'YouTube Video';
  const channelName = metadata.authorName || 'YouTube Creator';

  // Step B: Tier 1 — Innertube SDK Default Fetch
  try {
    console.log(`[Veyra YouTube Ingest] Tier 1: Attempting youtube-transcript-plus default fetch...`);
    const rawPlus = await fetchTranscript(videoId);
    if (rawPlus && rawPlus.length > 0) {
      const segments = rawPlus.map(item => ({
        startTime: Math.round((Number(item.offset) || 0) * 100) / 100,
        endTime: Math.round(((Number(item.offset) || 0) + (Number(item.duration) || 3)) * 100) / 100,
        text: decodeHtmlEntities(item.text).replace(/\n+/g, ' ').trim(),
      })).filter(s => s.text.length > 0);

      if (segments.length > 0) {
        console.log(`[Veyra YouTube Ingest] Tier 1 Success: Retrieved ${segments.length} segments in ${Date.now() - t0}ms`);
        return {
          success: true,
          segments,
          videoTitle,
          channelName,
          language: rawPlus[0]?.lang || 'default',
          sourceMethod: 'innertube_plus',
        };
      }
    }
  } catch (tier1Err: any) {
    console.log(`[Veyra YouTube Ingest] Tier 1 failed (${tier1Err?.name || 'Error'}): ${tier1Err?.message}`);
  }

  // Step C: Tier 2 — Language Enumeration Fallback
  try {
    console.log(`[Veyra YouTube Ingest] Tier 2: Listing available caption language tracks...`);
    const languages = await listLanguages(videoId);
    if (languages && languages.length > 0) {
      console.log(`[Veyra YouTube Ingest] Tier 2 found ${languages.length} language tracks:`, languages);
      
      const langCodes = languages.map((l: any) => typeof l === 'string' ? l : (l.code || l.languageCode || '')).filter(Boolean);
      const selectedLang = 
        langCodes.find(c => c.startsWith('en')) ||
        langCodes[0] ||
        'en';

      if (selectedLang) {
        const rawPlusLang = await fetchTranscript(videoId, { lang: selectedLang });
        if (rawPlusLang && rawPlusLang.length > 0) {
          const segments = rawPlusLang.map(item => ({
            startTime: Math.round((Number(item.offset) || 0) * 100) / 100,
            endTime: Math.round(((Number(item.offset) || 0) + (Number(item.duration) || 3)) * 100) / 100,
            text: decodeHtmlEntities(item.text).replace(/\n+/g, ' ').trim(),
          })).filter(s => s.text.length > 0);

          if (segments.length > 0) {
            console.log(`[Veyra YouTube Ingest] Tier 2 Success: Retrieved ${segments.length} segments for lang '${selectedLang}' in ${Date.now() - t0}ms`);
            return {
              success: true,
              segments,
              videoTitle,
              channelName,
              language: selectedLang,
              sourceMethod: 'innertube_lang_fallback',
            };
          }
        }
      }
    }
  } catch (tier2Err: any) {
    console.log(`[Veyra YouTube Ingest] Tier 2 language fallback failed: ${tier2Err?.message}`);
  }

  // Step D: Tier 3 — Watch Page Scraping & Direct TimedText URLs
  let pagePlayabilityStatus = '';
  let pagePlayabilityReason = '';
  try {
    console.log(`[Veyra YouTube Ingest] Tier 3: Scraping watch page initial player response...`);
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (match) {
        const playerObj = JSON.parse(match[1]);
        pagePlayabilityStatus = playerObj?.playabilityStatus?.status || '';
        pagePlayabilityReason = playerObj?.playabilityStatus?.reason || '';

        const captionTracks = playerObj?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        console.log(`[Veyra YouTube Ingest] Tier 3 found ${captionTracks.length} caption tracks in player response (playability: ${pagePlayabilityStatus}).`);

        if (captionTracks.length > 0) {
          const selectedTrack =
            captionTracks.find((t: any) => t.languageCode?.startsWith('en') && t.kind !== 'asr') ||
            captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
            captionTracks.find((t: any) => t.kind !== 'asr') ||
            captionTracks[0];

          if (selectedTrack && selectedTrack.baseUrl) {
            // Attempt JSON3 format
            try {
              const jsonUrl = selectedTrack.baseUrl + (selectedTrack.baseUrl.includes('?') ? '&fmt=json3' : '?fmt=json3');
              const capRes = await fetch(jsonUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(4000),
              });
              if (capRes.ok) {
                const jsonData = await capRes.json();
                const segments = parseJson3Captions(jsonData);
                if (segments.length > 0) {
                  console.log(`[Veyra YouTube Ingest] Tier 3 Success (JSON3): ${segments.length} segments in ${Date.now() - t0}ms`);
                  return {
                    success: true,
                    segments,
                    videoTitle,
                    channelName,
                    language: selectedTrack.languageCode,
                    sourceMethod: 'page_json3',
                  };
                }
              }
            } catch (jsonErr: any) {
              console.log(`[Veyra YouTube Ingest] Tier 3 JSON3 fetch failed: ${jsonErr?.message}`);
            }

            // Attempt XML format
            try {
              const capRes = await fetch(selectedTrack.baseUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(4000),
              });
              if (capRes.ok) {
                const xmlData = await capRes.text();
                const segments = parseXmlCaptions(xmlData);
                if (segments.length > 0) {
                  console.log(`[Veyra YouTube Ingest] Tier 3 Success (XML): ${segments.length} segments in ${Date.now() - t0}ms`);
                  return {
                    success: true,
                    segments,
                    videoTitle,
                    channelName,
                    language: selectedTrack.languageCode,
                    sourceMethod: 'page_xml',
                  };
                }
              }
            } catch (xmlErr: any) {
              console.log(`[Veyra YouTube Ingest] Tier 3 XML fetch failed: ${xmlErr?.message}`);
            }
          }
        }
      }
    }
  } catch (tier3Err: any) {
    console.log(`[Veyra YouTube Ingest] Tier 3 scraping error: ${tier3Err?.message}`);
  }

  // Step E: Tier 4 — Direct Keyed Android Innertube Request
  try {
    console.log(`[Veyra YouTube Ingest] Tier 4: Attempting direct Keyed Android Innertube query...`);
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000),
    });
    const html = await pageRes.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    if (apiKeyMatch) {
      const apiKey = apiKeyMatch[1];
      const playerRes = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
              androidSdkVersion: 34,
              hl: 'en',
              gl: 'US',
            },
          },
          videoId,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (playerRes.ok) {
        const playerData = (await playerRes.json()) as any;
        const tracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (tracks.length > 0) {
          const track = tracks[0];
          const capRes = await fetch(track.baseUrl + (track.baseUrl.includes('?') ? '&fmt=json3' : '?fmt=json3'), {
            signal: AbortSignal.timeout(4000),
          });
          if (capRes.ok) {
            const capData = await capRes.json();
            const segments = parseJson3Captions(capData);
            if (segments.length > 0) {
              console.log(`[Veyra YouTube Ingest] Tier 4 Success: ${segments.length} segments in ${Date.now() - t0}ms`);
              return {
                success: true,
                segments,
                videoTitle,
                channelName,
                language: track.languageCode,
                sourceMethod: 'innertube_direct',
              };
            }
          }
        }

        // Check if direct audio stream is available for audio-based fallback
        const adaptiveFormats = playerData.streamingData?.adaptiveFormats || [];
        const audioFormat = adaptiveFormats.find((f: any) => f.mimeType?.startsWith('audio/') && f.url);
        if (audioFormat && audioFormat.url) {
          console.log(`[Veyra YouTube Ingest] Tier 4 found accessible direct audio stream. Fetching media stream...`);
          const audioFetchRes = await fetch(audioFormat.url, {
            headers: { 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
            signal: AbortSignal.timeout(8000),
          });
          if (audioFetchRes.ok) {
            const arrayBuf = await audioFetchRes.arrayBuffer();
            // Restrict buffer size to 4MB max for serverless memory safety
            const sliceSize = Math.min(arrayBuf.byteLength, 4 * 1024 * 1024);
            const audioBuffer = Buffer.from(arrayBuf.slice(0, sliceSize));
            console.log(`[Veyra YouTube Ingest] Successfully retrieved ${audioBuffer.byteLength} bytes audio stream for speech-to-text.`);
            return {
              success: true,
              videoTitle,
              channelName,
              sourceMethod: 'audio_stream',
              audioBuffer,
              audioMimeType: audioFormat.mimeType.split(';')[0] || 'audio/mp4',
            };
          }
        }
      }
    }
  } catch (tier4Err: any) {
    console.log(`[Veyra YouTube Ingest] Tier 4 direct Innertube error: ${tier4Err?.message}`);
  }

  // Step F: Classify Upstream Failure Accurately
  const totalElapsed = Date.now() - t0;
  console.warn(`[Veyra YouTube Ingest] All retrieval tiers exhausted for video ${videoId} in ${totalElapsed}ms. Categorizing failure...`);

  if (pagePlayabilityStatus === 'LOGIN_REQUIRED') {
    return {
      success: false,
      videoTitle,
      channelName,
      errorCategory: 'bot_challenge',
      errorMessage: `YouTube requires user verification for "${videoTitle}" and restricted automated server access. To transcribe this video, please download the audio/video file and upload it directly.`,
    };
  }

  if (pagePlayabilityStatus === 'UNPLAYABLE') {
    return {
      success: false,
      videoTitle,
      channelName,
      errorCategory: 'private_restricted',
      errorMessage: `YouTube video "${videoTitle}" is unplayable or restricted in this region (${pagePlayabilityReason || 'Restricted'}). Please upload the media file directly.`,
    };
  }

  return {
    success: false,
    videoTitle,
    channelName,
    errorCategory: 'no_captions',
    errorMessage: `Captions are unavailable for YouTube video "${videoTitle}", and direct audio streams could not be extracted from the cloud environment. Please upload the media file directly.`,
  };
}

// 5. Group Raw Caption Cues into Fluent Transcript Blocks (~6-12s or sentence endings)
export function groupCaptionsIntoSegments(rawCues: CaptionSegment[], defaultSpeakerId = 'spk_1'): Array<{
  id: string;
  speakerId: string;
  startTime: number;
  endTime: number;
  text: string;
}> {
  const segments: Array<{
    id: string;
    speakerId: string;
    startTime: number;
    endTime: number;
    text: string;
  }> = [];

  let curText = '';
  let curStart = 0;
  let curEnd = 0;
  let segIdx = 1;

  for (const item of rawCues) {
    const cleanedText = (item.text || '').trim();
    if (!cleanedText) continue;

    if (!curText) {
      curStart = item.startTime;
      curEnd = item.endTime;
      curText = cleanedText;
    } else {
      curText += ' ' + cleanedText;
      curEnd = Math.max(curEnd, item.endTime);
    }

    const isSentenceEnd =
      cleanedText.endsWith('.') ||
      cleanedText.endsWith('!') ||
      cleanedText.endsWith('?') ||
      cleanedText.endsWith('♪');

    if (curEnd - curStart >= 7.0 || isSentenceEnd) {
      segments.push({
        id: `seg_${segIdx++}`,
        speakerId: defaultSpeakerId,
        startTime: curStart,
        endTime: Math.max(curEnd, curStart + 1.5),
        text: curText.trim(),
      });
      curText = '';
    }
  }

  if (curText) {
    segments.push({
      id: `seg_${segIdx++}`,
      speakerId: defaultSpeakerId,
      startTime: curStart,
      endTime: Math.max(curEnd, curStart + 1.5),
      text: curText.trim(),
    });
  }

  return segments;
}
