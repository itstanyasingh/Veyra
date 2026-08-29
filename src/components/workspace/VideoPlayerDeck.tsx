import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  FastForward, 
  AlertCircle,
  Music,
  RefreshCw,
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { MediaType, SourceType, TranscriptSegment, SubtitleCue } from '../../types';
import { YouTubePlayer } from '../media/YouTubePlayer';
import { isYouTubeUrl, extractYouTubeVideoId } from '../../utils/youtubeUtils';
import { getCaptionChunk } from '../../utils/captionUtils';

interface VideoPlayerDeckProps {
  sourceType?: SourceType;
  youtubeVideoId?: string;
  originalUrl?: string;
  mediaUrl?: string;
  mediaType: MediaType;
  fileName?: string;
  aspectRatio?: string;
  currentTime: number;
  duration: number;
  showSubtitlesOverlay: boolean;
  transcriptSegments?: TranscriptSegment[];
  subtitles?: SubtitleCue[];
  searchMatchTimestamps?: number[];
  onDurationLoaded?: (duration: number, width?: number, height?: number) => void;
  onOpenReplaceMedia: () => void;
  onSeek: (time: number) => void;
  onTimeUpdateCallback: (currentTime: number) => void;
  playerRefCallback?: (controller: { seek: (time: number) => void; play: () => void; pause: () => void }) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const VideoPlayerDeck: React.FC<VideoPlayerDeckProps> = ({
  sourceType,
  youtubeVideoId,
  originalUrl,
  mediaUrl,
  mediaType,
  fileName,
  aspectRatio = '16:9',
  currentTime,
  duration,
  showSubtitlesOverlay,
  transcriptSegments = [],
  subtitles = [],
  searchMatchTimestamps = [],
  onDurationLoaded,
  onOpenReplaceMedia,
  onSeek,
  onTimeUpdateCallback,
  playerRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytControllerRef = useRef<{
    seek: (time: number) => void;
    play: () => void;
    pause: () => void;
    setVolume: (vol: number) => void;
    setMuted: (muted: boolean) => void;
    setRate: (rate: number) => void;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [internalTime, setInternalTime] = useState<number>(0);
  const [mediaDuration, setMediaDuration] = useState<number>(duration || 0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(true);

  // Detect YouTube vs Local Upload
  const isYouTube = sourceType === 'youtube' || Boolean(youtubeVideoId) || isYouTubeUrl(originalUrl || '') || isYouTubeUrl(mediaUrl || '');
  const activeYtVideoId = youtubeVideoId || extractYouTubeVideoId(originalUrl || '') || extractYouTubeVideoId(mediaUrl || '') || '';

  const getMediaElement = useCallback((): HTMLMediaElement | null => {
    return mediaType === 'video' ? videoRef.current : audioRef.current;
  }, [mediaType]);

  const togglePlay = useCallback(() => {
    if (isYouTube) {
      if (isPlaying) {
        ytControllerRef.current?.pause();
      } else {
        ytControllerRef.current?.play();
      }
      return;
    }

    const el = getMediaElement();
    if (!el) return;

    if (el.paused || el.ended) {
      el.play().catch((err) => {
        console.warn('Playback prevented by browser:', err);
      });
    } else {
      el.pause();
    }
  }, [isYouTube, isPlaying, getMediaElement]);

  const seekTo = useCallback((time: number) => {
    const safeDuration = mediaDuration || duration || 0;
    const target = Math.max(0, Math.min(safeDuration, time));

    if (isYouTube) {
      ytControllerRef.current?.seek(target);
    } else {
      const el = getMediaElement();
      if (el) {
        el.currentTime = target;
      }
    }
    setInternalTime(target);
    onTimeUpdateCallbackRef.current?.(target);
  }, [isYouTube, getMediaElement, mediaDuration, duration]);

  const onTimeUpdateCallbackRef = useRef(onTimeUpdateCallback);
  const onDurationLoadedRef = useRef(onDurationLoaded);
  const playerRefCallbackRef = useRef(playerRefCallback);

  useEffect(() => {
    onTimeUpdateCallbackRef.current = onTimeUpdateCallback;
    onDurationLoadedRef.current = onDurationLoaded;
    playerRefCallbackRef.current = playerRefCallback;
  }, [onTimeUpdateCallback, onDurationLoaded, playerRefCallback]);

  // Expose controller to parent
  useEffect(() => {
    if (playerRefCallbackRef.current) {
      playerRefCallbackRef.current({
        seek: (t: number) => seekTo(t),
        play: () => {
          if (isYouTube) {
            ytControllerRef.current?.play();
          } else {
            getMediaElement()?.play();
          }
        },
        pause: () => {
          if (isYouTube) {
            ytControllerRef.current?.pause();
          } else {
            getMediaElement()?.pause();
          }
        },
      });
    }
  }, [isYouTube, seekTo, getMediaElement]);

  // Sync internal time when external currentTime changes
  useEffect(() => {
    if (Math.abs(internalTime - currentTime) > 0.3) {
      setInternalTime(currentTime);
    }
  }, [currentTime]);

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const jumpSeconds = (seconds: number) => {
    seekTo(internalTime + seconds);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);

    if (isYouTube) {
      ytControllerRef.current?.setVolume(val);
      ytControllerRef.current?.setMuted(val === 0);
      setIsMuted(val === 0);
      return;
    }

    const el = getMediaElement();
    if (el) {
      el.volume = val;
      if (val === 0) {
        setIsMuted(true);
        el.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        el.muted = false;
      }
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (isYouTube) {
      ytControllerRef.current?.setMuted(nextMute);
      return;
    }

    const el = getMediaElement();
    if (!el) return;

    if (nextMute) {
      el.muted = true;
    } else {
      el.muted = false;
      el.volume = volume > 0 ? volume : 0.8;
      setVolume(volume > 0 ? volume : 0.8);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);

    if (isYouTube) {
      ytControllerRef.current?.setRate(rate);
      return;
    }

    const el = getMediaElement();
    if (el) {
      el.playbackRate = rate;
    }
  };

  // Sync speed, volume, and mute state attributes to native media elements when loaded/updated
  useEffect(() => {
    if (isYouTube) {
      ytControllerRef.current?.setVolume(volume);
      ytControllerRef.current?.setMuted(isMuted);
      ytControllerRef.current?.setRate(playbackRate);
    } else {
      const el = getMediaElement();
      if (el) {
        el.volume = volume;
        el.muted = isMuted;
        el.playbackRate = playbackRate;
      }
    }
  }, [isYouTube, mediaUrl, mediaType, getMediaElement, volume, isMuted, playbackRate]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts (Space, J, L, ArrowLeft, ArrowRight, M, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement || 
        activeEl instanceof HTMLTextAreaElement || 
        activeEl?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        jumpSeconds(-5);
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        jumpSeconds(5);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if ((e.key === 'f' || e.key === 'F') && mediaType === 'video') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, mediaType]);

  // HTML5 Media event listeners (Uploads only)
  useEffect(() => {
    if (isYouTube) return;

    const el = getMediaElement();
    if (!el) return;

    setIsLoadingMedia(true);
    setLoadError(null);

    const handleTimeUpdate = () => {
      setInternalTime(el.currentTime);
      onTimeUpdateCallbackRef.current?.(el.currentTime);
    };

    const handleLoadedMetadata = () => {
      setIsLoadingMedia(false);
      setLoadError(null);
      if (isFinite(el.duration) && !isNaN(el.duration)) {
        setMediaDuration(el.duration);
        if (el instanceof HTMLVideoElement) {
          onDurationLoadedRef.current?.(el.duration, el.videoWidth, el.videoHeight);
        } else {
          onDurationLoadedRef.current?.(el.duration);
        }
      }
    };

    const handleCanPlay = () => {
      setIsLoadingMedia(false);
      setIsBuffering(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = () => {
      setIsLoadingMedia(false);
      const err = el.error;
      let msg = 'The media could not be loaded in this browser.';
      if (err?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        msg = 'The media format or codec is not supported by your browser.';
      } else if (err?.code === MediaError.MEDIA_ERR_DECODE) {
        msg = 'The media file is corrupted or could not be decoded.';
      }
      setLoadError(msg);
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('canplay', handleCanPlay);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('playing', handlePlaying);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('error', handleError);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('canplay', handleCanPlay);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('waiting', handleWaiting);
      el.removeEventListener('playing', handlePlaying);
      el.removeEventListener('ended', handleEnded);
      el.removeEventListener('error', handleError);
    };
  }, [isYouTube, getMediaElement, mediaUrl]);

  // Validate, clean, and sort transcript segments for player timeline and captions
  const validatedTranscriptSegments = React.useMemo(() => {
    return [...transcriptSegments]
      .filter((seg) => seg && typeof seg.id === 'string')
      .map((seg) => {
        const startTime = typeof seg.startTime === 'number' ? seg.startTime : parseFloat(seg.startTime as any) || 0;
        const endTime = typeof seg.endTime === 'number' ? seg.endTime : parseFloat(seg.endTime as any) || (startTime + 2);
        return {
          ...seg,
          startTime: Math.max(0, startTime),
          endTime: Math.max(startTime + 0.01, endTime),
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
  }, [transcriptSegments]);

  // Validate, clean, and sort subtitles cues for captions
  const validatedSubtitles = React.useMemo(() => {
    return [...subtitles]
      .filter((cue) => cue && typeof cue.id === 'string')
      .map((cue) => {
        const startTime = typeof cue.startTime === 'number' ? cue.startTime : parseFloat(cue.startTime as any) || 0;
        const endTime = typeof cue.endTime === 'number' ? cue.endTime : parseFloat(cue.endTime as any) || (startTime + 2);
        return {
          ...cue,
          startTime: Math.max(0, startTime),
          endTime: Math.max(startTime + 0.01, endTime),
        };
      })
      .sort((a, b) => a.startTime - b.startTime);
  }, [subtitles]);

  // Current active subtitle text calculation
  const currentSubtitleText = React.useMemo(() => {
    if (!showSubtitlesOverlay) return null;
    const t = internalTime;
    
    // Check subtitles cues first
    const activeCue = validatedSubtitles.find((s) => t >= s.startTime && t <= s.endTime);
    if (activeCue) {
      return getCaptionChunk(activeCue.text, activeCue.startTime, activeCue.endTime, t);
    }

    // Fallback to transcript segments
    const activeSeg = validatedTranscriptSegments.find((seg) => t >= seg.startTime && t <= seg.endTime);
    if (activeSeg) {
      return getCaptionChunk(activeSeg.text, activeSeg.startTime, activeSeg.endTime, t);
    }

    return null;
  }, [showSubtitlesOverlay, internalTime, validatedSubtitles, validatedTranscriptSegments]);

  const effectiveDuration = mediaDuration || duration || 100;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#050505] border border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col justify-between shadow-xs select-none ${
        isFullscreen ? 'h-screen w-screen border-none rounded-none fixed inset-0 z-50' : ''
      }`}
      aria-label="Video Workspace Player"
    >
      {/* Media Canvas Area */}
      {isYouTube ? (
        /* YouTube Dedicated Embed Player */
        <YouTubePlayer
          videoId={activeYtVideoId}
          originalUrl={originalUrl || mediaUrl}
          duration={effectiveDuration}
          showSubtitlesOverlay={showSubtitlesOverlay}
          currentSubtitleText={currentSubtitleText}
          aspectRatio={aspectRatio}
          onTimeUpdate={(t) => {
            setInternalTime(t);
            onTimeUpdateCallbackRef.current?.(t);
          }}
          onDurationLoaded={(d) => {
            setMediaDuration(d);
            onDurationLoadedRef.current?.(d);
          }}
          onStateChange={(playing) => {
            setIsPlaying(playing);
          }}
          playerRefCallback={(ctrl) => {
            ytControllerRef.current = ctrl;
          }}
        />
      ) : mediaType === 'video' ? (
        /* Uploaded Local Video Canvas */
        <div 
          className={`relative w-full flex items-center justify-center bg-[#000000] overflow-hidden ${
            isFullscreen ? 'flex-1 h-full' : 'min-h-[260px] sm:min-h-[380px] max-h-[580px]'
          }`}
          style={{ aspectRatio: isFullscreen ? undefined : (aspectRatio.includes(':') ? aspectRatio.replace(':', '/') : '16/9') }}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={mediaUrl}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Subtitle Caption Overlay on Video */}
          {showSubtitlesOverlay && currentSubtitleText && (
            <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center pointer-events-none z-20 px-4">
              <div className="w-fit max-w-[70%] px-3 py-1 sm:px-3.5 sm:py-1.5 bg-black/75 backdrop-blur-xs text-white text-xs sm:text-sm font-medium rounded-md text-center shadow-md leading-snug border border-white/10 line-clamp-2 select-none animate-fade-in">
                {currentSubtitleText}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingMedia && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white gap-2 pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span className="text-xs font-mono-time uppercase tracking-widest text-neutral-300">
                LOADING VIDEO
              </span>
            </div>
          )}

          {/* Buffering Indicator */}
          {isBuffering && !isLoadingMedia && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-[#333333] rounded text-white text-xs font-mono-time">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Buffering...</span>
              </div>
            </div>
          )}

          {/* Center Play Overlay Icon when paused */}
          {!isPlaying && !isLoadingMedia && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity">
              <div className="w-14 h-14 rounded-full bg-white/90 text-[#111111] flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Uploaded Audio Stream Canvas */
        <div 
          onClick={togglePlay}
          className="relative w-full py-12 px-6 sm:px-12 flex flex-col items-center justify-center bg-[#111111] text-white cursor-pointer select-none group min-h-[260px]"
        >
          <audio ref={audioRef} src={mediaUrl} playsInline />
          
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-white mb-3 shadow-md group-hover:border-[#555555] group-hover:scale-105 transition-all">
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white fill-current" />
            ) : (
              <Music className="w-7 h-7 text-neutral-300 ml-0.5" />
            )}
          </div>

          <h4 className="text-sm font-semibold tracking-tight text-neutral-200 text-center truncate max-w-md mb-1">
            {fileName || 'Audio Recording'}
          </h4>
          <span className="text-[11px] font-mono-time text-neutral-400">
            AUDIO WORKSPACE STREAM {isPlaying ? '• PLAYING' : '• PAUSED'}
          </span>

          {/* Equalizer animation when playing */}
          {isPlaying && (
            <div className="flex items-end justify-center gap-1 h-5 mt-3">
              <span className="w-1 bg-[#2563EB] rounded-full animate-bounce h-3" style={{ animationDelay: '0ms' }} />
              <span className="w-1 bg-[#2563EB] rounded-full animate-bounce h-5" style={{ animationDelay: '150ms' }} />
              <span className="w-1 bg-[#2563EB] rounded-full animate-bounce h-2" style={{ animationDelay: '300ms' }} />
              <span className="w-1 bg-[#2563EB] rounded-full animate-bounce h-4" style={{ animationDelay: '450ms' }} />
              <span className="w-1 bg-[#2563EB] rounded-full animate-bounce h-3" style={{ animationDelay: '200ms' }} />
            </div>
          )}

          {/* Live Subtitle Caption Overlay on Audio Canvas */}
          {showSubtitlesOverlay && currentSubtitleText && (
            <div className="mt-5 px-4 py-2 bg-black/85 backdrop-blur-xs text-white text-xs sm:text-sm font-medium rounded-md text-center max-w-[90%] border border-white/10 shadow-lg leading-snug animate-fade-in">
              {currentSubtitleText}
            </div>
          )}
        </div>
      )}

      {/* Error State Banner for Local Uploads */}
      {!isYouTube && loadError && (
        <div className="p-4 bg-[#1A1111] border-t border-[#4A2222] text-[#FFA8A8] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FF8080]" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[11px]">UNABLE TO LOAD VIDEO</p>
              <p className="text-neutral-400 text-[11px] mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            onClick={onOpenReplaceMedia}
            className="px-3 py-1 bg-white text-[#111111] hover:bg-neutral-200 font-semibold rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replace Media</span>
          </button>
        </div>
      )}

      {/* TIMELINE WITH SEGMENT & SEARCH MARKERS */}
      <div className="bg-[#111111] border-t border-[#262626] text-white px-3 sm:px-4 py-2.5 space-y-2">
        {/* Visual Multi-Track Scrubbing Bar */}
        <div className="relative flex items-center group/timeline py-1 cursor-pointer">
          {/* Background Track */}
          <div className="absolute inset-x-0 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
            {/* Segment separators */}
            {effectiveDuration > 0 && validatedTranscriptSegments.map((seg) => {
              const leftPercent = (seg.startTime / effectiveDuration) * 100;
              return (
                <div
                  key={seg.id}
                  className="absolute top-0 bottom-0 w-[1px] bg-white/20"
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}
          </div>

          {/* Search match markers */}
          {effectiveDuration > 0 && searchMatchTimestamps.map((ts, idx) => {
            const leftPercent = (ts / effectiveDuration) * 100;
            return (
              <div
                key={idx}
                className="absolute -top-1 w-1.5 h-3 bg-white rounded-xs z-10 pointer-events-none"
                style={{ left: `${leftPercent}%` }}
                title={`Search match at ${formatDuration(ts)}`}
              />
            );
          })}

          {/* Scrubber Input Range */}
          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.05}
            value={internalTime}
            onChange={handleTimelineChange}
            className="w-full h-2 bg-transparent appearance-none cursor-pointer accent-white z-20 relative"
            aria-label="Timeline seek scrubber"
          />
        </div>

        {/* Transport & Setting Controls */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          {/* Left Transport: Play/Pause, -5s, +5s, Timecode */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:bg-[#262626] rounded text-white transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            <button
              onClick={() => jumpSeconds(-5)}
              className="p-1.5 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Rewind 5s (← or J)"
              aria-label="Rewind 5 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => jumpSeconds(5)}
              className="p-1.5 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Forward 5s (→ or L)"
              aria-label="Forward 5 seconds"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            {/* Formatted Timecode Display */}
            <div className="text-[11px] sm:text-xs font-mono-time text-neutral-300 ml-1.5 flex items-center gap-1">
              <span className="text-white font-semibold">{formatDuration(internalTime)}</span>
              <span className="text-neutral-500">/</span>
              <span className="text-neutral-400">{formatDuration(effectiveDuration)}</span>
            </div>
          </div>

          {/* Right Transport: Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Playback Speed Selector */}
            <div className="flex items-center bg-[#1F1F1F] rounded border border-[#333333] px-1.5 py-0.5">
              <select
                value={playbackRate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                className="bg-transparent text-[11px] font-mono-time text-neutral-200 focus:outline-none cursor-pointer py-0.5"
                aria-label="Playback speed"
              >
                {SPEED_OPTIONS.map((rate) => (
                  <option key={rate} value={rate} className="bg-[#111111] text-white">
                    {rate}x
                  </option>
                ))}
              </select>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-18 h-1 bg-[#333333] rounded appearance-none cursor-pointer accent-white"
                aria-label="Volume level"
              />
            </div>

            {/* Fullscreen Button */}
            {mediaType === 'video' && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5" />
                ) : (
                  <Maximize className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
