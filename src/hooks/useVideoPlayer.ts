import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

export interface VideoPlayerController {
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  isBuffering: boolean;
  loadError: string | null;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  jumpSeconds: (seconds: number) => void;
  setVolumeLevel: (val: number) => void;
  toggleMute: () => void;
  setSpeed: (rate: number) => void;
  toggleFullscreen: (containerElement?: HTMLElement | null) => void;
  setLoadError: (err: string | null) => void;
}

export function useVideoPlayer(mediaType: 'video' | 'audio' = 'video'): VideoPlayerController {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const getMediaElement = useCallback((): HTMLMediaElement | null => {
    return mediaType === 'video' ? videoRef.current : audioRef.current;
  }, [mediaType]);

  const togglePlay = useCallback(() => {
    const el = getMediaElement();
    if (!el) return;

    if (el.paused || el.ended) {
      el.play().catch((err) => {
        console.warn('Playback request was prevented:', err);
      });
    } else {
      el.pause();
    }
  }, [getMediaElement]);

  const play = useCallback(() => {
    const el = getMediaElement();
    if (el && (el.paused || el.ended)) {
      el.play().catch((err) => console.warn('Play error:', err));
    }
  }, [getMediaElement]);

  const pause = useCallback(() => {
    const el = getMediaElement();
    if (el && !el.paused) {
      el.pause();
    }
  }, [getMediaElement]);

  const seek = useCallback((time: number) => {
    const el = getMediaElement();
    if (el) {
      const validTime = Math.max(0, Math.min(el.duration || duration || 0, time));
      el.currentTime = validTime;
      setCurrentTime(validTime);
    }
  }, [getMediaElement, duration]);

  const jumpSeconds = useCallback((seconds: number) => {
    const el = getMediaElement();
    if (el) {
      const target = Math.max(0, Math.min(el.duration || duration || 0, el.currentTime + seconds));
      el.currentTime = target;
      setCurrentTime(target);
    }
  }, [getMediaElement, duration]);

  const setVolumeLevel = useCallback((val: number) => {
    const el = getMediaElement();
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    if (el) {
      el.volume = clamped;
      if (clamped === 0) {
        setIsMuted(true);
        el.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        el.muted = false;
      }
    }
  }, [getMediaElement, isMuted]);

  const toggleMute = useCallback(() => {
    const el = getMediaElement();
    if (!el) return;

    if (isMuted) {
      el.muted = false;
      setIsMuted(false);
      const newVol = volume > 0 ? volume : 0.8;
      el.volume = newVol;
      setVolume(newVol);
    } else {
      el.muted = true;
      setIsMuted(true);
    }
  }, [getMediaElement, isMuted, volume]);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    const el = getMediaElement();
    if (el) {
      el.playbackRate = rate;
    }
  }, [getMediaElement]);

  const toggleFullscreen = useCallback((containerElement?: HTMLElement | null) => {
    const target = containerElement || videoRef.current;
    if (!target) return;

    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return {
    videoRef,
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    isBuffering,
    loadError,
    togglePlay,
    play,
    pause,
    seek,
    jumpSeconds,
    setVolumeLevel,
    toggleMute,
    setSpeed,
    toggleFullscreen,
    setLoadError,
  };
}
