import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

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

  const {
    waveform: liveWaveform,
    startFromAudio,
    resume,
    suspend,
    cleanup: cleanupAnalyser,
    resetWaveform,
  } = useAudioAnalyser();

  const [staticBars] = useState(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => {
      const mid = BAR_COUNT / 2;
      const dist = Math.abs(i - mid) / mid;
      return Math.round(3 + (1 - dist * 0.6) * 14);
    })
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      startFromAudio(audio);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      resetWaveform();
      suspend();
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
      cleanupAnalyser();
    };
  }, [src, startFromAudio, cleanupAnalyser, resetWaveform, suspend]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof (audio as HTMLAudioElement).setSinkId === 'function') {
      (audio as HTMLAudioElement).setSinkId(useSpeaker ? 'default' : 'earpiece').catch(() => {});
    }
  }, [useSpeaker]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      suspend();
      setIsPlaying(false);
    } else {
      await resume();
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, resume, suspend]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = src;
    a.download = fileName || 'voice-note';
    a.click();
  }, [src, fileName]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const remaining = Math.max(0, duration - currentTime);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const waveform = isPlaying ? liveWaveform : staticBars;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] max-w-full">
      <motion.button
        onClick={togglePlay}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm',
          isOwn
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        )}
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.05 }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </motion.button>

      <div className="flex-1 min-w-0">
        <motion.div
          ref={progressRef}
          className="flex items-center gap-[2px] h-8 cursor-pointer group relative"
          onClick={isLoaded ? handleSeek : undefined}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          initial="init"
          animate="in"
          variants={{ init: {}, in: { transition: { staggerChildren: 0.015 } } }}
        >
          {waveform.map((h, i) => {
            const isPlayed = i / BAR_COUNT <= progress;
            return (
              <motion.div
                key={i}
                custom={i}
                variants={{
                  init: { height: 0, opacity: 0 },
                  in: {
                    height: `${Math.max(3, h)}px`,
                    opacity: 1,
                    transition: { type: 'spring', stiffness: 140, damping: 12, mass: 0.5 },
                  },
                }}
                className={cn(
                  'w-[3px] rounded-full',
                  isOwn
                    ? isPlayed ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.4)]' : 'bg-white/30'
                    : isPlayed ? 'bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.4)]' : 'bg-foreground/20'
                )}
              />
            );
          })}
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full pointer-events-none"
            style={{
              width: `${progress * 100}%`,
              background: isOwn
                ? 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)'
                : 'linear-gradient(90deg, hsl(var(--primary) / 0.08), transparent)',
            }}
          />
         </motion.div>
         <div className="flex justify-between items-center mt-0.5">
          <span className="text-[10px] tabular-nums opacity-50 font-mono">
            {formatTime(isPlaying ? remaining : duration)}
          </span>
          <div className="flex items-center gap-1.5">
            {fileName && (
              <span className="text-[9px] opacity-30 truncate max-w-[60px]">{fileName}</span>
            )}
            <button
              onClick={handleDownload}
              className="opacity-30 hover:opacity-80 transition-opacity p-0.5 rounded hover:bg-foreground/5"
              title="Download"
              aria-label="Download voice note"
            >
              <Download className="w-3 h-3" />
            </button>
            {typeof HTMLAudioElement.prototype.setSinkId === 'function' && (
              <button
                onClick={() => setUseSpeaker(v => !v)}
                className="opacity-30 hover:opacity-80 transition-opacity p-0.5 rounded hover:bg-foreground/5"
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
