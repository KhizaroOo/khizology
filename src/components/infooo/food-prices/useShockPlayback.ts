/* Slides the chosen cost from 0% up to the demo size (+50%) and stops, so the first aha takes a few seconds.
   The shared useInfoooPlayback steps through whole scenes; this world needs a continuous slider, so it keeps its own small loop. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RATE, TARGET } from './foodStory.ts';

const FRAME_MS = 32;   // about 30 updates a second is plenty for a growing bar
interface Options { pct: number; goTo: (pct: number) => void; onEnd: () => void; reduced: boolean }

export function useShockPlayback({ pct, goTo, onEnd, reduced }: Options) {
  const [playing, setPlaying] = useState(false);
  const live = useRef({ pct, goTo, onEnd }); live.current = { pct, goTo, onEnd };
  const on = useRef(false), raf = useRef(0), last = useRef(0);

  const pause = useCallback(() => { on.current = false; cancelAnimationFrame(raf.current); setPlaying(false); }, []);
  const tick = useCallback((ts: number) => {
    if (!on.current) return;
    if (ts - last.current < FRAME_MS) { raf.current = requestAnimationFrame(tick); return; }
    const dt = Math.min(0.1, (ts - last.current) / 1000); last.current = ts;
    const next = Math.min(TARGET, live.current.pct + dt * RATE);
    live.current.pct = next; live.current.goTo(next);
    if (next >= TARGET - 1e-9) { pause(); live.current.onEnd(); } else raf.current = requestAnimationFrame(tick);
  }, [pause]);

  /** Reduced motion: no animation at all. Play jumps straight to the demo size. */
  const play = useCallback(() => {
    if (reduced) { live.current.goTo(TARGET); live.current.onEnd(); return; }
    if (live.current.pct >= TARGET - 1e-6) { live.current.pct = 0; live.current.goTo(0); }
    on.current = true; setPlaying(true); last.current = performance.now();
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(tick);
  }, [reduced, tick]);

  useEffect(() => { if (reduced && on.current) pause(); }, [reduced, pause]);
  useEffect(() => {
    const hidden = () => { if (document.hidden && on.current) pause(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); cancelAnimationFrame(raf.current); on.current = false; };
  }, [pause]);
  return { playing, play, pause };
}
