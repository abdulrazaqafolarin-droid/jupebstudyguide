import { useRef, useCallback, useState } from 'react';

const BAR_COUNT = 30;

export function useAudioAnalyser() {
  const [waveform, setWaveform] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 2 + Math.random() * 3)
  );
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close();
    }
    ctxRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    streamRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);

    const values: number[] = [];
    const binSize = Math.floor(dataArray.length / BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += dataArray[i * binSize + j] || 0;
      }
      const avg = sum / binSize;
      const normalized = Math.max(2, (avg / 255) * 28);
      values.push(normalized);
    }
    setWaveform(values);

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startFromStream = useCallback(async (stream: MediaStream) => {
    cleanup();
    streamRef.current = stream;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setWaveform(Array.from({ length: BAR_COUNT }, () => 2 + Math.random() * 3));
    }
  }, [cleanup, tick]);

  const startFromAudio = useCallback((audioEl: HTMLAudioElement) => {
    cleanup();

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaElementSource(audioEl);
      sourceRef.current = source;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setWaveform(Array.from({ length: BAR_COUNT }, () => 2 + Math.random() * 3));
    }
  }, [cleanup, tick]);

  const resetWaveform = useCallback(() => {
    setWaveform(Array.from({ length: BAR_COUNT }, () => 2 + Math.random() * 3));
  }, []);

  return {
    waveform,
    startFromStream,
    startFromAudio,
    cleanup,
    resetWaveform,
  };
}
