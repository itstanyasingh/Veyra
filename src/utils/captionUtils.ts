/**
 * VEYRA — Caption Chunking Utilities
 * Splits transcript segments into compact, readable 1-2 line subtitle chunks
 * synchronized with playback time.
 */

export function getCaptionChunk(
  text: string,
  startTime: number,
  endTime: number,
  currentTime: number
): string | null {
  if (!text || currentTime < startTime || currentTime > endTime) {
    return null;
  }

  const trimmed = text.trim();
  if (trimmed.length <= 75) {
    return trimmed;
  }

  // Split segment text into natural clause/sentence parts
  const rawParts = trimmed.split(/(?<=[.!?;,])\s+/);
  const chunks: string[] = [];

  let currentChunk = '';
  for (const part of rawParts) {
    if ((currentChunk + ' ' + part).trim().length <= 75) {
      currentChunk = currentChunk ? `${currentChunk} ${part}` : part;
    } else {
      if (currentChunk) chunks.push(currentChunk);

      // If a single clause is still too long (> 75 chars), split by word clusters
      if (part.length > 75) {
        const words = part.split(' ');
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= 60) {
            wordChunk = wordChunk ? `${wordChunk} ${w}` : w;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        if (wordChunk) chunks.push(wordChunk);
        currentChunk = '';
      } else {
        currentChunk = part;
      }
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (chunks.length <= 1) {
    return trimmed;
  }

  // Distribute segment duration proportionally across chunks by character length
  const totalChars = chunks.reduce((acc, c) => acc + c.length, 0);
  const segDuration = Math.max(0.1, endTime - startTime);

  let accumulatedTime = startTime;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkDur = (chunk.length / totalChars) * segDuration;
    const chunkEnd = i === chunks.length - 1 ? endTime : accumulatedTime + chunkDur;

    if (currentTime >= accumulatedTime && currentTime <= chunkEnd) {
      return chunk;
    }
    accumulatedTime = chunkEnd;
  }

  return chunks[chunks.length - 1];
}
