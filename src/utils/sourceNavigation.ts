import { UnifiedSource, SourceValidationStatus, TranscriptSegment, EvidenceSourceType } from '../types';

/**
 * Validates whether a timestamp is a valid number within media duration bounds.
 * Rejects NaN, undefined, Infinity, negative timestamps, or timestamps beyond duration.
 */
export function validateTimestamp(timestamp: any, duration: number = 86400): number | null {
  const ts = typeof timestamp === 'number' ? timestamp : parseFloat(timestamp);
  if (isNaN(ts) || !isFinite(ts) || ts < 0) {
    return null;
  }
  if (duration > 0 && ts > duration) {
    return duration;
  }
  return ts;
}

/**
 * Validates a UnifiedSource object against project context and transcript state.
 */
export function validateSource(
  source: Partial<UnifiedSource>,
  transcript: TranscriptSegment[],
  duration: number = 86400,
  currentHash?: string
): {
  status: SourceValidationStatus;
  validatedTimestamp: number;
  matchedSegment?: TranscriptSegment;
} {
  const validatedTs = validateTimestamp(source.startTime, duration);
  
  if (validatedTs === null) {
    return {
      status: 'INVALID',
      validatedTimestamp: 0,
    };
  }

  // Hash check for stale evidence
  if (source.transcriptHash && currentHash && source.transcriptHash !== currentHash) {
    const matchedSeg = transcript.find(s => s.id === source.segmentId) ||
      transcript.find(s => Math.abs(s.startTime - validatedTs) < 5);
    return {
      status: 'STALE',
      validatedTimestamp: validatedTs,
      matchedSegment: matchedSeg,
    };
  }

  // Segment existence check
  let matchedSegment: TranscriptSegment | undefined;
  if (source.segmentId) {
    matchedSegment = transcript.find(s => s.id === source.segmentId);
  }

  if (!matchedSegment && transcript.length > 0) {
    // Find closest segment within 5s window
    matchedSegment = transcript.find(s => Math.abs(s.startTime - validatedTs) < 5);
  }

  if (source.segmentId && !matchedSegment && transcript.length > 0) {
    // Referenced segment ID explicitly doesn't exist
    return {
      status: 'INVALID',
      validatedTimestamp: validatedTs,
    };
  }

  return {
    status: 'VALID',
    validatedTimestamp: validatedTs,
    matchedSegment,
  };
}

/**
 * Centralized source navigation function across all Veyra components.
 * Performs validation, seeks media, highlights transcript segment, and syncs timeline.
 */
export function navigateToSource(
  timestamp: number,
  segmentId?: string,
  onSeek?: (time: number) => void,
  duration: number = 86400
): boolean {
  const validTime = validateTimestamp(timestamp, duration);
  if (validTime === null) {
    console.warn('Cannot navigate to invalid source timestamp:', timestamp);
    return false;
  }

  // 1. Seek Media
  if (onSeek) {
    onSeek(validTime);
  }

  // 2. Highlight and Scroll Transcript Segment in DOM
  if (segmentId) {
    const el = document.getElementById(`transcript-seg-${segmentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50/50');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50/50');
      }, 3000);
    }
  }

  return true;
}
