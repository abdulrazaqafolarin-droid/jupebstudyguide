import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceNotePlayerProps {
  src: string;
  isOwn?: boolean;
  fileName?: string;
}

const BAR_COUNT = 30;

export function VoiceNotePlayer({ src, isOwn, fileName }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useSpeaker, setUseSpeaker] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    if (audio.readyState >= 1) onLoaded();
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.pause();
    };
  }, []);

  // Toggle audio output: speaker vs earpiece (proximity)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof (audio as HTMLAudioElement).setSinkId === 'function') {
      (audio as HTMLAudioElement).setSinkId(useSpeaker ? 'default' : 'earpiece').catch(() => {});
    }
  }, [useSpeaker]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const remaining = Math.max(0, duration - currentTime);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const barHeights = Array.from({ length: BAR_COUNT }, (_, i) => {
    const mid = BAR_COUNT / 2;
    const dist = Math.abs(i - mid) / mid;
    const base = 3 + Math.random() * 2;
    return Math.round(base + (1 - dist * 0.6) * 12);
  });

  return (
    <div className="flex items-center gap-2 py-0.5 min-w-[200px] max-w-full">
      <button
        onClick={togglePlay}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/10 hover:bg-primary/20'
        )}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          ref={progressRef}
          className="flex items-center gap-[2px] h-8 cursor-pointer group relative"
          onClick={isLoaded ? handleSeek : undefined}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {barHeights.map((h, i) => {
            const isPlayed = i / BAR_COUNT <= progress;
            return (
              <div
                key={i}
                className={cn(
                  'w-[3px] rounded-full transition-all duration-100',
                  isOwn
                    ? isPlayed ? 'bg-white' : 'bg-white/40'
                    : isPlayed ? 'bg-primary' : 'bg-foreground/25'
                )}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-[9px] tabular-nums opacity-60">
            {formatTime(isPlaying ? remaining : duration)}
          </span>
          <div className="flex items-center gap-1">
            {fileName && (
              <span className="text-[9px] opacity-40 truncate max-w-[60px]">{fileName}</span>
            )}
            {typeof HTMLAudioElement.prototype.setSinkId === 'function' && (
              <button
                onClick={() => setUseSpeaker(v => !v)}
                className="opacity-40 hover:opacity-100 transition-opacity"
                title={useSpeaker ? 'Switch to earpiece' : 'Switch to speaker'}
                aria-label={useSpeaker ? 'Earpiece' : 'Speaker'}
              >
                {useSpeaker ? (
                  <Volume2 className="w-3 h-3" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
