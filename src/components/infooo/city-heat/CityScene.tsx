/* One city block as pure SVG, drawn from model output. Colour = surface temperature; orange glow = stored heat. */
import { memo } from 'react';
import { PHYS, SUNRISE, SUNSET, clamp, type Block, type Frame, type LeverId, type WeatherId } from './heatModel.ts';

type RGB = [number, number, number];
const STOPS: [number, RGB][] = [[18, [74, 163, 216]], [28, [127, 208, 181]], [36, [255, 212, 94]], [46, [255, 154, 61]], [56, [242, 82, 46]], [68, [150, 16, 40]]];
const lerpC = (a: RGB, b: RGB, f: number): RGB => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const rgb = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function heatColor(t: number) {
  if (t <= STOPS[0][0]) return rgb(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) return rgb(lerpC(STOPS[i - 1][1], STOPS[i][1], (t - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])));
  return rgb(STOPS[STOPS.length - 1][1]);
}
const SKY = { night: [hex('#0b1233'), hex('#1d2b5a')], dusk: [hex('#3a4a8f'), hex('#f4a261')], day: [hex('#4da3e8'), hex('#bfe3ff')] };
const STARS = [[40, 30, 1.3], [92, 62, 1], [150, 24, 1.4], [205, 52, 1], [262, 20, 1.2], [318, 58, 1.5], [372, 28, 1], [430, 50, 1.3], [455, 18, 1], [120, 96, 1], [300, 94, 1], [410, 88, 1.2], [60, 110, 1], [225, 100, 1]];
const STREET = 232, WALL_A = '#59627a', WALL_B = '#aab3c5';
interface Building { x: number; w: number; top: number }
interface Tree { x: number; r: number; h: number }
interface Config { p: string; wall: string; cool: boolean; buildings: Building[]; trees: Tree[]; grass: { x: number; w: number }[] }

function sceneCfg(which: 'A' | 'B', lever: LeverId): Config {
  if (which === 'B') return { p: 'b', wall: WALL_B, cool: true, buildings: [{ x: 22, w: 98, top: 152 }, { x: 262, w: 106, top: 128 }, { x: 414, w: 50, top: 170 }],
    trees: [{ x: 162, r: 27, h: 34 }, { x: 214, r: 23, h: 28 }, { x: 391, r: 14, h: 18 }], grass: [{ x: 120, w: 142 }, { x: 368, w: 46 }] };
  const c: Config = { p: 'a', wall: WALL_A, cool: false, buildings: [{ x: 26, w: 114, top: 86 }, { x: 188, w: 126, top: 58 }, { x: 362, w: 92, top: 106 }], trees: [{ x: 164, r: 9, h: 14 }], grass: [] };
  if (lever === 'trees') c.trees = [{ x: 164, r: 22, h: 30 }, { x: 338, r: 19, h: 26 }, { x: 467, r: 11, h: 18 }, { x: 13, r: 11, h: 18 }];
  if (lever === 'roofs') c.cool = true;
  if (lever === 'grass') c.grass = [{ x: 0, w: 26 }, { x: 140, w: 48 }, { x: 314, w: 48 }, { x: 454, w: 26 }];
  if (lever === 'sky') c.buildings = [{ x: 30, w: 88, top: 136 }, { x: 204, w: 96, top: 116 }, { x: 386, w: 70, top: 150 }];
  return c;
}

interface Props { which: 'A' | 'B'; lever: LeverId; block: Block; fr: Frame; hour: number; weather: WeatherId; storeMax: number; label: string }
function CityScene({ which, lever, block, fr, hour, weather, storeMax, label }: Props) {
  const c = sceneCfg(which, which === 'A' ? lever : 'none'), p = `ch-${c.p}`;
  const hh = ((hour % 24) + 24) % 24, up = hh > SUNRISE && hh < SUNSET, dist = Math.min(Math.abs(hh - SUNRISE), Math.abs(hh - SUNSET));
  const night = up ? 0 : smooth(0, 1.6, dist), sunFrac = clamp(fr.sun / PHYS.S0, 0, 1);
  let top: RGB, bot: RGB;
  if (up) { const k = smooth(0, 2.2, dist); top = lerpC(SKY.dusk[0], SKY.day[0], k); bot = lerpC(SKY.dusk[1], SKY.day[1], k); }
  else { top = lerpC(SKY.dusk[0], SKY.night[0], night); bot = lerpC(SKY.dusk[1], SKY.night[1], night); }
  let sx = 0, sy = 0, sunOp = 0, moonX = 0, moonY = 0, moonOp = 0;
  if (up) { const a = Math.PI * (hh - SUNRISE) / (SUNSET - SUNRISE); sx = 240 - 215 * Math.cos(a); sy = 150 - 124 * Math.sin(a); sunOp = clamp(Math.sin(a) * 5 + 0.15, 0, 1); }
  else { const t = hh >= SUNSET ? hh : hh + 24, am = Math.PI * (t - SUNSET) / (24 - SUNSET + SUNRISE); moonX = 240 - 215 * Math.cos(am); moonY = 150 - 124 * Math.sin(am); moonOp = clamp(Math.sin(am) * 5, 0, 1); }
  const ft = clamp((fr.ta - 24) / 16, 0, 1), haze = rgb(lerpC([120, 190, 240], [255, 150, 50], ft));
  const surf = heatColor(fr.ts), f = clamp(fr.store / storeMax, 0, 1), glow = 0.05 + 0.8 * Math.pow(f, 0.8);
  const wall = rgb(lerpC(hex(c.wall), hex('#10162b'), night * 0.55));
  const q = fr.toMass, release = q < 0 ? Math.pow(clamp(-q / 55, 0, 1), 0.6) * smooth(0.05, 0.6, fr.store) : 0, charge = q > 0 ? Math.pow(clamp(q / 320, 0, 1), 0.6) : 0;
  const upX = which === 'A' ? [164, 338] : [190, 391], downX = [48, 100, 164, 250, 338, 408, 460];
  return <svg viewBox="0 0 480 300" role="img" focusable="false" aria-label={label}>
    <defs>
      <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={rgb(top)}/><stop offset="1" stopColor={rgb(bot)}/></linearGradient>
      <linearGradient id={`${p}-ag`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={haze} stopOpacity="0"/><stop offset="1" stopColor={haze} stopOpacity={0.12 + 0.5 * ft}/></linearGradient>
      <pattern id={`${p}-win`} width="12" height="14" patternUnits="userSpaceOnUse"><rect x="3" y="4" width="5" height="6" fill="#fff" opacity=".2"/></pattern>
      <marker id={`${p}-ar`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffb347"/></marker>
    </defs>
    <rect width="480" height="300" fill={`url(#${p}-sky)`}/>
    <g opacity={night > 0.35 ? night : 0}>{STARS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff"/>)}</g>
    <g opacity={sunOp} transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}><circle r="30" fill="#fff7c2" opacity=".4"/><circle r="15" fill="#ffd23f"/></g>
    <g opacity={moonOp} transform={`translate(${moonX.toFixed(1)} ${moonY.toFixed(1)})`}><circle r="12" fill="#e8ecff"/><circle cx="-4" cy="-3" r="2.2" fill="#c7cde8"/><circle cx="4" cy="4" r="1.6" fill="#c7cde8"/></g>
    <g opacity={weather === 'cloudy' ? 0.92 : 0} fill={rgb(lerpC([255, 255, 255], [70, 82, 130], night))}><ellipse cx="90" cy="48" rx="36" ry="12"/><ellipse cx="114" cy="41" rx="24" ry="11"/><ellipse cx="70" cy="43" rx="20" ry="9"/><ellipse cx="300" cy="70" rx="40" ry="13"/><ellipse cx="326" cy="62" rx="26" ry="12"/><ellipse cx="276" cy="64" rx="22" ry="9"/><ellipse cx="420" cy="36" rx="30" ry="10"/><ellipse cx="438" cy="30" rx="18" ry="9"/></g>
    <g className="flow" opacity={weather === 'windy' ? 0.8 : 0} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M18 100q30-10 60 0t60 0"/><path d="M200 84q30-10 60 0t60 0"/><path d="M330 120q30-10 60 0t50 0"/><path d="M60 140q25-8 50 0t50 0"/></g>
    <rect y="120" width="480" height="112" fill={`url(#${p}-ag)`}/>
    {c.buildings.map((b, i) => {
      const tx = b.x + b.w / 2, ty = b.top, on = up && sunFrac > 0.01;
      const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, L = 6 + 36 * block.albedo;
      return <g key={i}>
        {on && <line x1={(sx + ux * 26).toFixed(1)} y1={(sy + uy * 26).toFixed(1)} x2={(tx - ux * 3).toFixed(1)} y2={(ty - uy * 3).toFixed(1)} stroke="#ffd23f" strokeLinecap="round" strokeDasharray="1 6" strokeWidth={(1.5 + 2.4 * sunFrac).toFixed(1)} opacity={clamp(sunFrac * 1.3, 0, 0.85).toFixed(2)}/>}
        <rect x={b.x} y={b.top + 8} width={b.w} height={STREET - b.top - 8} fill={wall}/>
        <rect x={b.x} y={b.top + 8} width={b.w} height={STREET - b.top - 8} fill="#ff7a1a" opacity={glow.toFixed(2)}/>
        <rect x={b.x} y={b.top + 8} width={b.w} height={STREET - b.top - 8} fill={`url(#${p}-win)`}/>
        <rect x={b.x - 2} y={b.top} width={b.w + 4} height="8" rx="2" fill={surf}/>
        {c.cool && <rect x={b.x - 2} y={b.top} width={b.w + 4} height="2.5" rx="1" fill="#fff" opacity=".85"/>}
        {on && <line x1={(tx - ux * 2).toFixed(1)} y1={(ty + uy * 2).toFixed(1)} x2={(tx + ux * L).toFixed(1)} y2={(ty - uy * L).toFixed(1)} stroke="#fff" strokeLinecap="round" strokeWidth={(1 + 3 * block.albedo).toFixed(1)} opacity={clamp(sunFrac * block.albedo * 2.6, 0, 0.95).toFixed(2)}/>}
      </g>;
    })}
    <rect y={STREET} width="480" height="8" fill={surf}/>
    {c.grass.map(g => <g key={g.x}><rect x={g.x} y={STREET} width={g.w} height="8" fill="#3f9d58"/><rect x={g.x} y={STREET - 2} width={g.w} height="3" fill="#56b36d"/></g>)}
    <rect y="240" width="480" height="40" fill="#4a4038"/><rect y="240" width="480" height="40" fill="#ff7a1a" opacity={glow.toFixed(2)}/><rect y="280" width="480" height="20" fill="#2b2622"/>
    {c.trees.map(t => <g key={t.x}>
      <ellipse cx={t.x} cy={STREET + 3} rx={t.r * 1.35} ry="3.5" fill="#000" opacity={(0.32 * sunFrac).toFixed(2)}/>
      <rect x={t.x - 2} y={STREET - t.h} width="4" height={t.h} fill="#6b4f3a"/>
      <circle cx={t.x} cy={STREET - t.h} r={t.r} fill="#2f8f4e"/><circle cx={t.x - t.r * 0.35} cy={STREET - t.h - t.r * 0.25} r={t.r * 0.62} fill="#43a862"/>
    </g>)}
    <g className="flow" fill="none" stroke="#ffb347" strokeWidth="3" strokeLinecap="round" opacity={charge.toFixed(2)}>{downX.map(x => <path key={x} d={`M${x} 244V268`} markerEnd={`url(#${p}-ar)`}/>)}</g>
    <g className="flow" fill="none" stroke="#ffb347" strokeWidth="3" strokeLinecap="round" opacity={release.toFixed(2)}>
      {upX.map(x => <path key={x} d={`M${x} 226q6-10 0-20t0-20`} markerEnd={`url(#${p}-ar)`}/>)}
      {c.buildings.map((b, i) => <path key={i} d={`M${b.x + b.w / 2} ${b.top - 4}q6-10 0-20t0-20`} markerEnd={`url(#${p}-ar)`}/>)}
    </g>
  </svg>;
}
export default memo(CityScene);
