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
 * Extracts and downsamples audio from video/audio files using the Web Audio API
 * into a lightweight 16kHz mono WAV base64 string for ultra-fast Gemini transcription.
 */
export async function extractAudioForTranscription(
  file: File,
  maxDurationSeconds: number = 300
): Promise<{ base64Audio: string; mimeType: string }> {
  // If already an audio file and under 15MB, convert directly
  if (file.type.startsWith('audio/') && file.size < 15 * 1024 * 1024) {
    const base64 = await fileToBase64(file);
    return {
      base64Audio: base64,
      mimeType: file.type || 'audio/mp3',
    };
  }

  // Attempt Web Audio API extraction for video or larger files
  try {
    const arrayBuffer = await file.slice(0, 40 * 1024 * 1024).arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) {
      const fallbackBase64 = await fileToBase64(file);
      return { base64Audio: fallbackBase64, mimeType: file.type || 'audio/mp3' };
    }

    const audioCtx = new AudioContextClass();
    const decodedAudio = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    await audioCtx.close();

    const targetSampleRate = 16000;
    const duration = Math.min(decodedAudio.duration, maxDurationSeconds);
    const offlineCtx = new OfflineAudioContext(1, Math.floor(targetSampleRate * duration), targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedAudio;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    const base64Wav = await fileToBase64(wavBlob);

    return {
      base64Audio: base64Wav,
      mimeType: 'audio/wav',
    };
  } catch (err) {
    console.warn('Web Audio extraction fallback to direct slice:', err);
    // Fallback: Read file directly
    const directBase64 = await fileToBase64(file.slice(0, 20 * 1024 * 1024));
    return {
      base64Audio: directBase64,
      mimeType: file.type || 'audio/mp3',
    };
  }
}

/**
 * Converts an AudioBuffer to a 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit precision

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }
}
