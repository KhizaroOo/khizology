/* The whole day on one chart. The static drawing is memoised; only the playhead moves while the day runs. */
import { memo, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { START, clamp, type Series } from './heatModel.ts';
import { legendItems, niceStep, nightSpans, type ChartData, type ChartTab } from './heatViews.ts';

const L = 46, R = 14, T = 18, BOT = 30;
interface Layout { W: number; H: number; X: (h: number) => number; Y: (v: number) => number }

const Drawing = memo(function Drawing({ data, hours, night, days, layout, lo, hi, st }: { data: ChartData; hours: number[]; night: [number, number][]; days: number; layout: Layout; lo: number; hi: number; st: number }) {
  const { W, H, X, Y } = layout, ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += st) ticks.push(v);
  const hourTicks: number[] = [], tickStep = days === 1 ? 3 : 6;
  for (let t = START; t <= START + 24 * days + 1e-9; t += tickStep) hourTicks.push(t);
  const path = (d: number[]) => d.map((v, k) => `${k ? 'L' : 'M'}${X(hours[k]).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const area = (d: number) => `${path(data.lines[d].d)}L${X(hours[hours.length - 1]).toFixed(1)} ${Y(0).toFixed(1)}L${X(START).toFixed(1)} ${Y(0).toFixed(1)}Z`;
  return <>
    {night.map(([a, b]) => <rect key={a} className="night" x={X(a).toFixed(1)} y={T} width={(X(b) - X(a)).toFixed(1)} height={H - T - BOT}/>)}
    {ticks.map(v => <g key={v}><line className="grid" x1={L} x2={W - R} y1={Y(v).toFixed(1)} y2={Y(v).toFixed(1)}/><text x={L - 6} y={(Y(v) + 4).toFixed(1)} textAnchor="end">{st < 1 ? v.toFixed(1) : Math.round(v)}</text></g>)}
    {hourTicks.map(t => { const hh = t % 24; return <text key={t} x={X(t).toFixed(1)} y={H - 10} textAnchor="middle">{`${(Math.round(hh) + 11) % 12 + 1}${hh >= 12 && hh < 24 ? 'p' : 'a'}`}</text>; })}
    {days > 1 ? Array.from({ length: days }, (_, d) => <g key={d}><text x={(X(START + 24 * d) + 4).toFixed(1)} y={T + 12} style={{ fontWeight: 800 }}>Day {d + 1}</text>{d > 0 && <line className="grid" x1={X(START + 24 * d).toFixed(1)} x2={X(START + 24 * d).toFixed(1)} y1={T} y2={H - BOT} style={{ strokeDasharray: '3 4' }}/>}</g>)
      : <text x={X(21).toFixed(1)} y={T + 12} textAnchor="middle" style={{ fontWeight: 800, opacity: 0.8 }}>night</text>}
    {data.area && data.lines.filter(l => l.id !== 'ref').map(l => <path key={l.id} className={`area-${l.id}`} d={area(data.lines.indexOf(l))}/>)}
    {data.ghost && <path className="line ghost" d={path(data.ghost)}/>}
    {data.lines.map(l => <path key={l.id} className={`line ${l.id}`} d={path(l.d)}/>)}
  </>;
});

interface Props { sim: Series; data: ChartData; tab: ChartTab; days: number; hour: number; changed: boolean; labelledBy: string; onScrub: (hour: number) => void; onScrubEnd: () => void }
export default function HeatChart({ sim, data, tab, days, hour, changed, labelledBy, onScrub, onScrubEnd }: Props) {
  const host = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), drag = useRef(false), [W, setW] = useState(700);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const measure = () => { const cs = getComputedStyle(el); setW(prev => { const next = Math.max(260, Math.floor(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))); return Math.abs(next - prev) > 2 ? next : prev; }); };
    measure();
    let timer = 0; const ro = new ResizeObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(measure, 80); }); ro.observe(el);
    return () => { window.clearTimeout(timer); ro.disconnect(); };
  }, []);
  const H = W < 520 ? 230 : 280, st0 = useMemo(() => {
    const all = data.lines.flatMap(l => l.d).concat(data.ghost ?? []);
    let lo = data.area ? 0 : Math.min(...all, ...(data.zero ? [0] : [])), hi = Math.max(...all);
    const st = niceStep(hi - lo || 1); lo = data.area ? 0 : Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st; if (hi <= lo) hi = lo + st;
    return { lo, hi, st };
  }, [data]);
  const layout = useMemo<Layout>(() => {
    const span = 24 * days, pw = W - L - R, ph = H - T - BOT;
    return { W, H, X: h => L + (h - START) / span * pw, Y: v => T + (1 - (v - st0.lo) / (st0.hi - st0.lo)) * ph };
  }, [W, H, days, st0]);
  const night = useMemo(() => nightSpans(sim), [sim]);
  const k = clamp(Math.round((hour - START) * 6), 0, sim.hours.length - 1), x = layout.X(hour);
  const a = data.lines.find(l => l.id === 'a')!, b = data.lines.find(l => l.id === 'b')!;
  function end() { if (drag.current) { drag.current = false; onScrubEnd(); } }
  function scrub(e: PointerEvent) { const rect = svg.current!.getBoundingClientRect(), f = (e.clientX - rect.left - L) / (rect.width - L - R); onScrub(START + clamp(f, 0, 1) * 24 * days); }
  return <div ref={host} className="ch-chart-host">
    <div className="ch-legend">{legendItems(tab, changed).map(i => <span key={i.label}><i className={`sw ${i.cls}`}/>{i.label}</span>)}</div>
    <svg ref={svg} className="ch-chart" role="img" aria-labelledby={labelledBy} viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      onPointerDown={e => { drag.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is optional */ } scrub(e); }}
      onPointerMove={e => { if (drag.current) scrub(e); }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) end(); }}>
      <Drawing data={data} hours={sim.hours} night={night} days={days} layout={layout} lo={st0.lo} hi={st0.hi} st={st0.st}/>
      <g><line className="ph" x1={x.toFixed(1)} x2={x.toFixed(1)} y1={T} y2={H - BOT}/><circle className="dot-a" r="5" cx={x.toFixed(1)} cy={layout.Y(a.d[k]).toFixed(1)}/><circle className="dot-b" r="5" cx={x.toFixed(1)} cy={layout.Y(b.d[k]).toFixed(1)}/></g>
    </svg>
  </div>;
}
