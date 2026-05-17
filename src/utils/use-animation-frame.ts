import { useEffect, useRef } from 'react';

export function useAnimationFrame(
  callback: (deltaSeconds: number, elapsedSeconds: number, timestampMs: number) => void,
  enabled: boolean = true
) {
  const requestRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const animate = (time: number) => {
      const prev = prevTimeRef.current ?? time;
      const deltaMs = time - prev;
      prevTimeRef.current = time;
      const deltaSeconds = Math.min(deltaMs / 1000, 0.05);
      elapsedRef.current += deltaSeconds;

      callbackRef.current(deltaSeconds, elapsedRef.current, time);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      prevTimeRef.current = null;
      elapsedRef.current = 0;
    };
  }, [enabled]);
}
