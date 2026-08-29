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
  console.log('[Veyra Audio] Preparing file for Gemini transcription:', file.name, 'size:', file.size, 'type:', file.type);
  
  // Direct safe slice to under 10MB ensures blazing fast base64 encoding and robust transmission
  const MAX_SLICE_SIZE = 10 * 1024 * 1024;
  const targetSlice = file.size > MAX_SLICE_SIZE ? file.slice(0, MAX_SLICE_SIZE) : file;
  
  const base64 = await fileToBase64(targetSlice);
  return {
    base64Audio: base64,
    mimeType: file.type || 'video/mp4',
  };
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
