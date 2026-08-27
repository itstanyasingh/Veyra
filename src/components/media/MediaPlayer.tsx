import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  Video as VideoIcon
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { MediaType } from '../../types';

interface MediaPlayerProps {
  mediaUrl: string;
  mediaType: MediaType;
  fileName?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationLoaded?: (duration: number, width?: number, height?: number) => void;
  onError?: (errorMessage: string) => void;
  aspectRatio?: string;
}

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  mediaUrl,
  mediaType,
  fileName,
  onTimeUpdate,
  onDurationLoaded,
  onError,
  aspectRatio = '16:9',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoveringPlayer, setIsHoveringPlayer] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Helper to get active HTMLMediaElement
  const getMediaElement = useCallback((): HTMLMediaElement | null => {
    return mediaType === 'video' ? videoRef.current : audioRef.current;
  }, [mediaType]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    const el = getMediaElement();
    if (!el) return;

    if (el.paused || el.ended) {
      el.play().catch((err) => {
        console.warn('Playback prevented:', err);
      });
    } else {
      el.pause();
    }
  }, [getMediaElement]);

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const el = getMediaElement();
    if (el) {
      el.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Jump relative seconds
  const jumpSeconds = (seconds: number) => {
    const el = getMediaElement();
    if (el) {
      const targetTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + seconds));
      el.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  // Handle Volume Change
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

  // Toggle Mute
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

  // Change Playback Speed
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    const el = getMediaElement();
    if (el) {
      el.playbackRate = rate;
    }
  };

  // Toggle Fullscreen for video
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request failed:', err);
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

  // Keyboard navigation when focused on player container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
    } else if (e.key === 'm') {
      e.preventDefault();
      toggleMute();
    } else if (e.key === 'f' && mediaType === 'video') {
      e.preventDefault();
      toggleFullscreen();
    }
  };

  // Listen for media element events
  const attachMediaListeners = (el: HTMLMediaElement) => {
    const handleTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      onTimeUpdate?.(el.currentTime);
    };

    const handleLoadedMetadata = () => {
      setLoadError(null);
      if (isFinite(el.duration) && !isNaN(el.duration)) {
        setDuration(el.duration);
        if (el instanceof HTMLVideoElement) {
          onDurationLoaded?.(el.duration, el.videoWidth, el.videoHeight);
        } else {
          onDurationLoaded?.(el.duration);
        }
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = () => {
      const err = el.error;
      let msg = 'Unable to play this media file.';
      if (err?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        msg = 'The media format or codec is not supported by your browser.';
      } else if (err?.code === MediaError.MEDIA_ERR_DECODE) {
        msg = 'The media file is corrupted or could not be decoded.';
      } else if (err?.code === MediaError.MEDIA_ERR_NETWORK) {
        msg = 'Network error while loading media.';
      }
      setLoadError(msg);
      onError?.(msg);
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('playing', handlePlaying);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('error', handleError);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('waiting', handleWaiting);
      el.removeEventListener('playing', handlePlaying);
      el.removeEventListener('ended', handleEnded);
      el.removeEventListener('error', handleError);
    };
  };

  useEffect(() => {
    const el = getMediaElement();
    if (!el) return;
    return attachMediaListeners(el);
  }, [getMediaElement, mediaUrl]);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHoveringPlayer(true)}
      onMouseLeave={() => setIsHoveringPlayer(false)}
      tabIndex={0}
      className={`relative w-full bg-[#0A0A0A] border border-[#D4D4D4] rounded-lg overflow-hidden flex flex-col justify-center focus:outline-none focus:ring-1 focus:ring-[#111111] shadow-sm select-none ${
        isFullscreen ? 'h-screen w-screen border-none rounded-none' : ''
      }`}
      aria-label="Media Player"
    >
      {/* Media Video Viewport */}
      {mediaType === 'video' ? (
        <div 
          className={`relative w-full flex items-center justify-center bg-[#050505] overflow-hidden ${
            isFullscreen ? 'flex-1 h-full' : 'max-h-[540px]'
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

          {/* Buffering Indicator */}
          {isBuffering && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-[#333333] rounded-md text-white text-xs font-mono-time">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Buffering...</span>
              </div>
            </div>
          )}

          {/* Center Play Overlay Icon when paused */}
          {!isPlaying && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity">
              <div className="w-14 h-14 rounded-full bg-white/90 text-[#111111] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                <Play className="w-6 h-6 ml-1 fill-current" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Audio Player Viewport */
        <div className="w-full py-10 px-6 sm:px-12 flex flex-col items-center justify-center bg-[#111111] text-white">
          <audio ref={audioRef} src={mediaUrl} />
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-white mb-4">
            <Music className="w-8 h-8 text-neutral-300" />
          </div>
          <h4 className="text-sm font-semibold tracking-tight text-neutral-200 text-center truncate max-w-md mb-1">
            {fileName || 'Audio Track'}
          </h4>
          <span className="text-xs font-mono-time text-neutral-400">
            AUDIO PLAYBACK
          </span>
        </div>
      )}

      {/* Error State Banner */}
      {loadError && (
        <div className="p-4 bg-[#1F1212] border-t border-[#4A2222] text-[#FFA8A8] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#FF8080]" />
          <div className="flex-1">
            <p className="font-semibold">{loadError}</p>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              The file may be corrupted or unsupported by your browser. Please try replacing the media with a standard .mp4, .webm, or .mp3.
            </p>
          </div>
        </div>
      )}

      {/* Player Control Bar */}
      <div className="bg-[#111111] border-t border-[#262626] text-white px-3 py-2.5 sm:px-4 space-y-2">
        {/* Scrub Bar */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#333333] rounded-lg appearance-none cursor-pointer accent-white hover:h-2 transition-all"
            aria-label="Seek media position"
          />
        </div>

        {/* Primary Controls Row */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          {/* Left Controls: Play/Pause, Skips, Timecode */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:bg-[#262626] rounded text-white transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
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
              title="Rewind 5s"
              aria-label="Rewind 5 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => jumpSeconds(5)}
              className="p-1.5 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Forward 5s"
              aria-label="Forward 5 seconds"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            {/* Timecode display */}
            <div className="text-[11px] sm:text-xs font-mono-time text-neutral-300 ml-1">
              <span className="text-white font-medium">{formatDuration(currentTime)}</span>
              <span className="text-neutral-500 mx-1">/</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Selector */}
            <div className="flex items-center bg-[#1F1F1F] rounded border border-[#333333] px-1.5 py-0.5">
              <select
                value={playbackRate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                className="bg-transparent text-[11px] font-mono-time text-neutral-300 focus:outline-none cursor-pointer py-0.5"
                aria-label="Playback speed"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <option key={rate} value={rate} className="bg-[#111111] text-white">
                    {rate}x
                  </option>
                ))}
              </select>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-neutral-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-[#333333] rounded appearance-none cursor-pointer accent-white"
                aria-label="Volume level"
              />
            </div>

            {/* Fullscreen Button (video only) */}
            {mediaType === 'video' && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-[#262626] rounded text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                title="Fullscreen (f)"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
