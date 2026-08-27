/**
 * VEYRA — Media Utility Functions
 * Metadata extraction, aspect ratio calculation, and video frame thumbnail generation.
 */

import { MediaType } from '../types';

export interface ExtractedMediaMetadata {
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
}

/**
 * Calculate simplified aspect ratio from width and height
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return '';

  const ratio = width / height;

  // Check common video aspect ratios with slight tolerance
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(ratio - 1 / 1) < 0.05) return '1:1';
  if (Math.abs(ratio - 21 / 9) < 0.05) return '21:9';

  // Fallback to greatest common divisor
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const rWidth = Math.round(width / divisor);
  const rHeight = Math.round(height / divisor);

  if (rWidth > 30 || rHeight > 30) {
    return `${ratio.toFixed(2)}:1`;
  }
  return `${rWidth}:${rHeight}`;
}

/**
 * Extract duration, resolution, aspect ratio, and video frame thumbnail from a media file
 */
export async function extractMediaMetadata(file: File | Blob, isAudioOverride?: boolean): Promise<ExtractedMediaMetadata> {
  const isAudio = isAudioOverride !== undefined 
    ? isAudioOverride 
    : (file.type ? file.type.startsWith('audio/') : false);

  if (isAudio) {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      const url = URL.createObjectURL(file);

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.remove();
      };

      audio.onloadedmetadata = () => {
        const duration = isFinite(audio.duration) && !isNaN(audio.duration) ? audio.duration : undefined;
        cleanup();
        resolve({
          mediaType: 'audio',
          duration,
        });
      };

      audio.onerror = () => {
        cleanup();
        resolve({
          mediaType: 'audio',
        });
      };

      audio.src = url;
    });
  }

  // Video metadata & thumbnail extraction
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);

    let duration: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let aspectRatio: string | undefined;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const captureThumbnail = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetWidth = 320;
        const scale = width && width > 0 ? targetWidth / width : 1;
        const targetHeight = height && height > 0 ? Math.round(height * scale) : 180;

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.82);
          cleanup();
          resolve({
            mediaType: 'video',
            duration,
            width,
            height,
            aspectRatio,
            thumbnailUrl,
          });
          return;
        }
      } catch (err) {
        console.warn('Could not generate video thumbnail:', err);
      }

      cleanup();
      resolve({
        mediaType: 'video',
        duration,
        width,
        height,
        aspectRatio,
      });
    };

    video.onloadedmetadata = () => {
      duration = isFinite(video.duration) && !isNaN(video.duration) ? video.duration : undefined;
      width = video.videoWidth || undefined;
      height = video.videoHeight || undefined;
      if (width && height) {
        aspectRatio = calculateAspectRatio(width, height);
      }

      // Seek to a frame for thumbnail capture
      // Pick 0.5s or 10% of duration, whichever is available
      const seekTarget = duration && duration > 2 ? Math.min(1.0, duration * 0.1) : 0.1;
      video.currentTime = seekTarget;
    };

    video.onseeked = () => {
      captureThumbnail();
    };

    video.onerror = () => {
      cleanup();
      resolve({
        mediaType: 'video',
      });
    };

    // Timeout fallback after 3.5s in case seek/load is slow
    setTimeout(() => {
      cleanup();
      resolve({
        mediaType: 'video',
        duration,
        width,
        height,
        aspectRatio,
      });
    }, 3500);

    video.src = url;
  });
}
