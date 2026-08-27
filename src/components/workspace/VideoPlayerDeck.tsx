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
  Subtitles
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { MediaType, TranscriptSegment, SubtitleCue } from '../../types';

interface VideoPlayerDeckProps {
  mediaUrl: string;
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

  const getMediaElement = useCallback((): HTMLMediaElement | null => {
    return mediaType === 'video' ? videoRef.current : audioRef.current;
  }, [mediaType]);

  const togglePlay = useCallback(() => {
    const el = getMediaElement();
    if (!el) return;

    if (el.paused || el.ended) {
      el.play().catch((err) => {
        console.warn('Playback prevented by browser:', err);
      });
    } else {
      el.pause();
    }
  }, [getMediaElement]);

  const seekTo = useCallback((time: number) => {
    const el = getMediaElement();
    const safeDuration = el?.duration || mediaDuration || duration || 0;
    const target = Math.max(0, Math.min(safeDuration, time));
    if (el) {
      el.currentTime = target;
    }
    setInternalTime(target);
    onTimeUpdateCallback(target);
  }, [getMediaElement, mediaDuration, duration, onTimeUpdateCallback]);

  // Expose controller to parent
  useEffect(() => {
    if (playerRefCallback) {
      playerRefCallback({
        seek: (t: number) => seekTo(t),
        play: () => getMediaElement()?.play(),
        pause: () => getMediaElement()?.pause(),
      });
    }
  }, [playerRefCallback, seekTo, getMediaElement]);

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const jumpSeconds = (seconds: number) => {
    const el = getMediaElement();
    const curr = el ? el.currentTime : internalTime;
    seekTo(curr + seconds);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
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
    const el = getMediaElement();
    if (!el) return;

    if (isMuted) {
      el.muted = false;
      setIsMuted(false);
      el.volume = volume > 0 ? volume : 0.8;
      setVolume(volume > 0 ? volume : 0.8);
    } else {
      el.muted = true;
      setIsMuted(true);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    const el = getMediaElement();
    if (el) {
      el.playbackRate = rate;
    }
  };

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

  // Media event listeners
  useEffect(() => {
    const el = getMediaElement();
    if (!el) return;

    setIsLoadingMedia(true);
    setLoadError(null);

    const handleTimeUpdate = () => {
      setInternalTime(el.currentTime);
      onTimeUpdateCallback(el.currentTime);
    };

    const handleLoadedMetadata = () => {
      setIsLoadingMedia(false);
      setLoadError(null);
      if (isFinite(el.duration) && !isNaN(el.duration)) {
        setMediaDuration(el.duration);
        if (el instanceof HTMLVideoElement) {
          onDurationLoaded?.(el.duration, el.videoWidth, el.videoHeight);
        } else {
          onDurationLoaded?.(el.duration);
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
  }, [getMediaElement, mediaUrl, onDurationLoaded, onTimeUpdateCallback]);

  // Current active subtitle text calculation
  const currentSubtitleText = React.useMemo(() => {
    if (!showSubtitlesOverlay) return null;
    const t = internalTime;
    
    // Check subtitles cues first
    const activeCue = subtitles.find((s) => t >= s.startTime && t <= s.endTime);
    if (activeCue) return activeCue.text;

    // Fallback to transcript segments
    const activeSeg = transcriptSegments.find((seg) => t >= seg.startTime && t <= seg.endTime);
    if (activeSeg) return activeSeg.text;

    return null;
  }, [showSubtitlesOverlay, internalTime, subtitles, transcriptSegments]);

  const effectiveDuration = mediaDuration || duration || 100;
  const progressRatio = effectiveDuration > 0 ? internalTime / effectiveDuration : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#050505] border border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col justify-between shadow-xs select-none ${
        isFullscreen ? 'h-screen w-screen border-none rounded-none fixed inset-0 z-50' : ''
      }`}
      aria-label="Video Workspace Player"
    >
      {/* Video / Audio Canvas */}
      {mediaType === 'video' ? (
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
            <div className="absolute bottom-6 inset-x-4 flex justify-center pointer-events-none z-20">
              <span className="px-4 py-1.5 bg-black/80 backdrop-blur-xs text-white text-xs sm:text-sm md:text-base font-medium rounded text-center max-w-[90%] shadow-lg leading-relaxed border border-white/10 animate-fade-in">
                {currentSubtitleText}
              </span>
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
        /* Audio Stream Canvas */
        <div className="w-full py-12 px-6 sm:px-12 flex flex-col items-center justify-center bg-[#111111] text-white">
          <audio ref={audioRef} src={mediaUrl} />
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-white mb-3">
            <Music className="w-8 h-8 text-neutral-300" />
          </div>
          <h4 className="text-sm font-semibold tracking-tight text-neutral-200 text-center truncate max-w-md mb-1">
            {fileName || 'Audio Recording'}
          </h4>
          <span className="text-[11px] font-mono-time text-neutral-400">
            AUDIO WORKSPACE STREAM
          </span>
        </div>
      )}

      {/* Error State Banner */}
      {loadError && (
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
            {effectiveDuration > 0 && transcriptSegments.map((seg) => {
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
