/* Continuous playback of one simulated day (or three), pausing on the key moments so each can be read.
   The shared useInfoooPlayback steps through whole scenes; this world needs a running clock, so it keeps its own. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { START } from './heatModel.ts';
import { buildBeats, endHour } from './heatStory.ts';

export const SPEED = 1.5;        // simulated hours per real second
const FRAME_MS = 32;             // about 30 updates a second is plenty for a slow-moving scene

interface Options { days: number; hour: number; moveTo: (hour: number) => void; reduced: boolean }
export function useDayPlayback({ days, hour, moveTo, reduced }: Options) {
  const [playing, setPlaying] = useState(false);
  const live = useRef({ days, hour, moveTo }); live.current = { days, hour, moveTo };
  const on = useRef(false), raf = useRef(0), last = useRef(0), hold = useRef(0);

  const pause = useCallback(() => { on.current = false; cancelAnimationFrame(raf.current); setPlaying(false); }, []);
  const tick = useCallback((ts: number) => {
    if (!on.current) return;
    if (ts < hold.current) { last.current = ts; raf.current = requestAnimationFrame(tick); return; }
    if (ts - last.current < FRAME_MS) { raf.current = requestAnimationFrame(tick); return; }
    const dt = Math.min(0.1, (ts - last.current) / 1000); last.current = ts;
    const { days: d, hour: prev, moveTo: go } = live.current, end = endHour(d);
    let next = Math.min(end, prev + dt * SPEED);
    for (const beat of buildBeats(d)) if (beat.h > prev + 1e-9 && beat.h <= next + 1e-9) { next = beat.h; hold.current = ts + beat.hold; break; }
    live.current.hour = next; go(next);
    if (next >= end - 1e-9) pause(); else raf.current = requestAnimationFrame(tick);
  }, [pause]);

  /** Reduced motion: no animation at all. Each press jumps to the next key moment. */
  const next = useCallback(() => {
    const { days: d, hour: h, moveTo: go } = live.current;
    go(buildBeats(d).find(b => b.h > h + 1e-6)?.h ?? START);
  }, []);
  const play = useCallback(() => {
    if (reduced) { next(); return; }
    const { days: d, hour: h, moveTo: go } = live.current;
    if (h >= endHour(d) - 1e-6) { live.current.hour = START; go(START); }
    on.current = true; setPlaying(true); last.current = performance.now(); hold.current = 0;
    cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(tick);
  }, [reduced, next, tick]);

  useEffect(() => { if (reduced && on.current) pause(); }, [reduced, pause]);
  useEffect(() => {
    const hidden = () => { if (document.hidden && on.current) pause(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); cancelAnimationFrame(raf.current); on.current = false; };
  }, [pause]);
  return { playing, play, pause, next };
}
