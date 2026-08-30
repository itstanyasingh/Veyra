import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExternalLink, Youtube, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  originalUrl?: string;
  duration?: number;
  showSubtitlesOverlay?: boolean;
  currentSubtitleText?: string | null;
  aspectRatio?: string;
  onTimeUpdate: (currentTime: number) => void;
  onDurationLoaded?: (duration: number) => void;
  onStateChange?: (isPlaying: boolean) => void;
  playerRefCallback?: (controller: {
    seek: (time: number) => void;
    play: () => void;
    pause: () => void;
    setVolume: (vol: number) => void;
    setMuted: (muted: boolean) => void;
    setRate: (rate: number) => void;
  }) => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  originalUrl,
  duration,
  showSubtitlesOverlay = true,
  currentSubtitleText,
  aspectRatio = '16:9',
  onTimeUpdate,
  onDurationLoaded,
  onStateChange,
  playerRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [useDirectEmbed, setUseDirectEmbed] = useState(false);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationLoadedRef = useRef(onDurationLoaded);
  const onStateChangeRef = useRef(onStateChange);
  const playerRefCallbackRef = useRef(playerRefCallback);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onDurationLoadedRef.current = onDurationLoaded;
    onStateChangeRef.current = onStateChange;
    playerRefCallbackRef.current = playerRefCallback;
  }, [onTimeUpdate, onDurationLoaded, onStateChange, playerRefCallback]);

  // Expose controller API to parent
  useEffect(() => {
    if (playerRefCallbackRef.current) {
      playerRefCallbackRef.current({
        seek: (time: number) => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
            try {
              ytPlayerRef.current.seekTo(time, true);
              onTimeUpdateRef.current?.(time);
            } catch (err) {
              console.warn('YouTube seek error:', err);
            }
          }
        },
        play: () => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
            try {
              ytPlayerRef.current.playVideo();
            } catch (err) {
              console.warn('YouTube play error:', err);
            }
          }
        },
        pause: () => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
            try {
              ytPlayerRef.current.pauseVideo();
            } catch (err) {
              console.warn('YouTube pause error:', err);
            }
          }
        },
        setVolume: (vol: number) => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
            try {
              ytPlayerRef.current.setVolume(Math.round(vol * 100));
            } catch (err) {}
          }
        },
        setMuted: (muted: boolean) => {
          if (ytPlayerRef.current) {
            try {
              if (muted && typeof ytPlayerRef.current.mute === 'function') {
                ytPlayerRef.current.mute();
              } else if (!muted && typeof ytPlayerRef.current.unMute === 'function') {
                ytPlayerRef.current.unMute();
              }
            } catch (err) {}
          }
        },
        setRate: (rate: number) => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
            try {
              ytPlayerRef.current.setPlaybackRate(rate);
            } catch (err) {}
          }
        },
      });
    }
  }, [videoId]);

  // Load YouTube IFrame API and initialize player
  useEffect(() => {
    let isMounted = true;

    const initYT = () => {
      if (!isMounted || !containerRef.current) return;
      if (!window.YT || !window.YT.Player) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }

      const playerDiv = document.createElement('div');
      playerDiv.className = 'w-full h-full';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      try {
        ytPlayerRef.current = new window.YT.Player(playerDiv, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              setIsReady(true);
              const d = event.target.getDuration?.();
              if (d && d > 0 && onDurationLoadedRef.current) {
                onDurationLoadedRef.current(d);
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              const state = event.data;
              if (state === 1) { // PLAYING
                setIsPlaying(true);
                setIsBuffering(false);
                onStateChangeRef.current?.(true);
              } else if (state === 2 || state === 0) { // PAUSED or ENDED
                setIsPlaying(false);
                setIsBuffering(false);
                onStateChangeRef.current?.(false);
              } else if (state === 3) { // BUFFERING
                setIsBuffering(true);
              }
            },
            onError: (event: any) => {
              if (!isMounted) return;
              console.warn('YouTube player JS API error:', event.data, 'Falling back to direct embed iframe.');
              setUseDirectEmbed(true);
            },
          },
        });
      } catch (err) {
        console.error('Failed to create YouTube player, falling back to direct iframe:', err);
        if (isMounted) setUseDirectEmbed(true);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const first = document.getElementsByTagName('script')[0];
        first?.parentNode?.insertBefore(tag, first);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initYT();
      };

      const poll = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(poll);
          initYT();
        }
      }, 200);

      return () => {
        isMounted = false;
        clearInterval(poll);
      };
    }

    return () => {
      isMounted = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [videoId]);

  // Sync current time periodically while video is playing
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            onTimeUpdateRef.current?.(t);
          }
        } catch (e) {}
      }
    }, 200);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const computedAspect = aspectRatio.includes(':') ? aspectRatio.replace(':', '/') : '16/9';

  if (useDirectEmbed) {
    return (
      <div
        className="relative w-full bg-[#000000] overflow-hidden min-h-[260px] sm:min-h-[380px] max-h-[580px] flex items-center justify-center"
        style={{ aspectRatio: computedAspect }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1&rel=0`}
          className="w-full h-full border-0 relative z-10"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Video Player"
        />

        {/* Subtitle Overlay */}
        {showSubtitlesOverlay && currentSubtitleText && (
          <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center pointer-events-none z-20 px-4">
            <div className="w-fit max-w-[70%] px-3 py-1 sm:px-3.5 sm:py-1.5 bg-black/75 backdrop-blur-xs text-white text-xs sm:text-sm font-medium rounded-md text-center shadow-md leading-snug border border-white/10 line-clamp-2 select-none animate-fade-in">
              {currentSubtitleText}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full bg-[#000000] overflow-hidden min-h-[260px] sm:min-h-[380px] max-h-[580px] flex items-center justify-center"
      style={{ aspectRatio: computedAspect }}
    >
      <div ref={containerRef} className="w-full h-full relative z-10" />

      {/* Subtitle Overlay */}
      {showSubtitlesOverlay && currentSubtitleText && (
        <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center pointer-events-none z-20 px-4">
          <div className="w-fit max-w-[70%] px-3 py-1 sm:px-3.5 sm:py-1.5 bg-black/75 backdrop-blur-xs text-white text-xs sm:text-sm font-medium rounded-md text-center shadow-md leading-snug border border-white/10 line-clamp-2 select-none animate-fade-in">
            {currentSubtitleText}
          </div>
        </div>
      )}

      {/* Initial Loading overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] text-white gap-2 z-20">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <span className="text-xs font-mono-time uppercase tracking-widest text-neutral-400">
            LOADING YOUTUBE PLAYER
          </span>
        </div>
      )}
    </div>
  );
};
