/**
 * VEYRA — YouTube URL Utilities
 * Handles detection and video ID extraction for YouTube URLs
 */

export function isYouTubeUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const trimmed = urlStr.trim();
    const fixedUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(fixedUrl);
    const host = u.hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be');
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const trimmed = urlStr.trim();
    const fixedUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(fixedUrl);
    const host = u.hostname.toLowerCase();

    if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
      return null;
    }

    // Handle youtu.be/VIDEO_ID
    if (host.includes('youtu.be')) {
      const id = u.pathname.substring(1).split('/')[0]?.split('?')[0];
      return id && id.length >= 5 ? id : null;
    }

    // Handle youtube.com
    if (host.includes('youtube.com')) {
      // https://www.youtube.com/watch?v=VIDEO_ID
      if (u.pathname.startsWith('/watch')) {
        const id = u.searchParams.get('v');
        return id && id.length >= 5 ? id : null;
      }

      // https://www.youtube.com/shorts/VIDEO_ID
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
        return id && id.length >= 5 ? id : null;
      }

      // https://www.youtube.com/embed/VIDEO_ID
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.split('/embed/')[1]?.split('/')[0]?.split('?')[0];
        return id && id.length >= 5 ? id : null;
      }

      // https://www.youtube.com/live/VIDEO_ID
      if (u.pathname.startsWith('/live/')) {
        const id = u.pathname.split('/live/')[1]?.split('/')[0]?.split('?')[0];
        return id && id.length >= 5 ? id : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeYouTubeUrl(urlStr: string): string | null {
  const videoId = extractYouTubeVideoId(urlStr);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
