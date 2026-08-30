/**
 * Utility to extract or prepare audio data from user uploaded files for AI transcription.
 */

export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // remove data:*;base64, prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Detects accurate MIME type for audio or video files
 */
export function detectAudioMimeType(file: File): string {
  if (file.type && file.type.trim()) {
    const t = file.type.toLowerCase();
    if (t.startsWith('audio/') || t.startsWith('video/')) {
      return file.type;
    }
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'm4a': return 'audio/m4a';
    case 'aac': return 'audio/aac';
    case 'flac': return 'audio/flac';
    case 'ogg': return 'audio/ogg';
    case 'webm': return 'audio/webm';
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'mkv': return 'video/x-matroska';
    default: return file.type || 'audio/mp3';
  }
}

/**
 * Converts an AudioBuffer to a 16-bit Mono PCM WAV Blob downsampled for speech AI
 */
function audioBufferToMonoWavBlob(buffer: AudioBuffer, targetSampleRate = 16000): Blob {
  // Compute mono downsampled data
  const numChannels = buffer.numberOfChannels;
  const originalSampleRate = buffer.sampleRate;
  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.floor(buffer.length / ratio);
  
  const monoData = new Float32Array(newLength);
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      sum += channelData[c][srcIndex] || 0;
    }
    monoData[i] = sum / numChannels;
  }

  const length = monoData.length * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  // fmt sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // SubChunk1Size (16 for PCM)
  setUint16(1); // AudioFormat (1 = PCM)
  setUint16(1); // NumChannels (Mono = 1)
  setUint32(targetSampleRate); // SampleRate
  setUint32(targetSampleRate * 2); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  setUint16(2); // BlockAlign (NumChannels * BitsPerSample/8)
  setUint16(16); // BitsPerSample

  // data sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(monoData.length * 2);

  for (let i = 0; i < monoData.length; i++) {
    const sample = Math.max(-1, Math.min(1, monoData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    out.setInt16(pos, intSample, true);
    pos += 2;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

/**
 * Prepares audio/video payload for Gemini transcription.
 * For videos or large media (>3MB), decodes and converts to compact 16kHz mono WAV
 * to fit securely within Vercel serverless request limits (4.5MB).
 */
export async function extractAudioForTranscription(
  file: File,
  maxDurationSeconds: number = 300
): Promise<{ base64Audio: string; mimeType: string }> {
  console.log('[Veyra Audio] Preparing file for transcription:', file.name, 'size:', file.size, 'type:', file.type);
  const mimeType = detectAudioMimeType(file);

  // If it's already a small direct audio file (< 3MB), send directly
  if (file.size <= 3 * 1024 * 1024 && mimeType.startsWith('audio/')) {
    try {
      const base64 = await fileToBase64(file);
      return { base64Audio: base64, mimeType };
    } catch (err) {
      console.warn('[Veyra Audio] Direct audio read failed, trying Web Audio API extraction:', err);
    }
  }

  // Attempt Web Audio API extraction for video / large audio
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Trim if exceeds maxDurationSeconds
    const sampleRate = audioBuffer.sampleRate;
    const maxSamples = Math.min(audioBuffer.length, Math.floor(maxDurationSeconds * sampleRate));
    
    let processBuffer = audioBuffer;
    if (maxSamples < audioBuffer.length) {
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        maxSamples,
        sampleRate
      );
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        trimmedBuffer.copyToChannel(audioBuffer.getChannelData(c).subarray(0, maxSamples), c);
      }
      processBuffer = trimmedBuffer;
    }

    const wavBlob = audioBufferToMonoWavBlob(processBuffer, 16000);
    audioContext.close();

    const base64 = await fileToBase64(wavBlob);
    console.log('[Veyra Audio] Extracted speech audio WAV size:', wavBlob.size, 'bytes');
    return {
      base64Audio: base64,
      mimeType: 'audio/wav',
    };
  } catch (audioCtxErr) {
    console.warn('[Veyra Audio] Web Audio API extraction fallback to slice:', audioCtxErr);
  }

  // Safe slice fallback for files under 3.5MB to ensure serverless compatibility
  const MAX_SLICE_SIZE = 3.5 * 1024 * 1024;
  const targetSlice = file.size > MAX_SLICE_SIZE ? file.slice(0, MAX_SLICE_SIZE) : file;
  const base64 = await fileToBase64(targetSlice);
  return {
    base64Audio: base64,
    mimeType,
  };
}
