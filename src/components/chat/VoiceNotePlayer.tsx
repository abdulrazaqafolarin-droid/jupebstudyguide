import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { claimVoiceNotePlayback, releaseVoiceNotePlayback } from '@/lib/voice-note-audio';

interface VoiceNotePlayerProps {
  src: string;
  isOwn?: boolean;
  fileName?: string;
  hideControls?: boolean;
}

const BAR_COUNT = 30;

export function VoiceNotePlayer({ src, isOwn, fileName, hideControls }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);

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
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setIsLoaded(true);
      setAudioError(false);
      startFromAudio(audio);
    };
    const onPlay = () => {
      claimVoiceNotePlayback(audio);
      setIsPlaying(true);
    };
    const onPause = () => {
      releaseVoiceNotePlayback(audio);
      suspend();
      setIsPlaying(false);
    };
    const onEnded = () => {
      releaseVoiceNotePlayback(audio);
      setIsPlaying(false);
      setCurrentTime(0);
      resetWaveform();
      suspend();
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onError = () => {
      releaseVoiceNotePlayback(audio);
      suspend();
      setAudioError(true);
      setIsPlaying(false);
    };

    if (audio.readyState >= 1) onLoaded();
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('error', onError);
      audio.pause();
      releaseVoiceNotePlayback(audio);
      cleanupAnalyser();
    };
  }, [src, startFromAudio, cleanupAnalyser, resetWaveform, suspend]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      suspend();
      setIsPlaying(false);
    } else {
      try {
        claimVoiceNotePlayback(audio);
        await resume();
        if (audioError) {
          audio.load();
          setAudioError(false);
        }
        await audio.play();
        setIsPlaying(true);
      } catch {
        releaseVoiceNotePlayback(audio);
        setIsPlaying(false);
        setAudioError(true);
      }
    }
  }, [isPlaying, resume, suspend, audioError]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (rect.width <= 0) return;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const handleSeekKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;

    let nextTime = audio.currentTime;
    if (event.key === 'ArrowLeft') nextTime -= 5;
    else if (event.key === 'ArrowRight') nextTime += 5;
    else if (event.key === 'Home') nextTime = 0;
    else if (event.key === 'End') nextTime = duration;
    else return;

    event.preventDefault();
    audio.currentTime = Math.max(0, Math.min(duration, nextTime));
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error('Could not download this voice note');
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName || 'voice-note';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch {
      // A new tab is a useful fallback when the device blocks cross-origin
      // downloads or is temporarily unable to fetch the media as a blob.
      window.open(src, '_blank', 'noopener,noreferrer');
    }
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
      {!hideControls && (
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
      )}

      <div className="flex-1 min-w-0">
        <motion.div
          ref={progressRef}
          className="flex items-center gap-[2px] h-8 cursor-pointer group relative"
          onClick={!hideControls && isLoaded ? handleSeek : undefined}
          onKeyDown={!hideControls && isLoaded ? handleSeekKeyDown : undefined}
          tabIndex={!hideControls && isLoaded ? 0 : undefined}
          role="slider"
          aria-label="Voice note playback position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          aria-disabled={hideControls || !isLoaded}
          initial="init"
          animate="in"
          variants={{ init: {}, in: { transition: { staggerChildren: 0.015 } } }}
        >
          {waveform.map((h, i) => {
            const isPlayed = i / BAR_COUNT <= progress;
            const isActive = Math.floor(progress * BAR_COUNT) === i;
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
                style={isActive && isPlaying ? { transform: 'scaleY(1.25)', transition: 'transform 0.1s' } : undefined}
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
         {audioError && !hideControls && (
           <p role="status" className="text-[10px] text-destructive mt-1">
             Couldn't load this voice note. Tap play to retry.
           </p>
         )}
         {!hideControls && (
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

            </div>
          </div>
         )}
      </div>
      <audio key={src} ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
