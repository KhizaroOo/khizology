import { CENTERS, COMMS, HEIGHT, HUBS, N, TOWN, WIDTH, degree, type RunResult } from './misinfoModel.ts';

const R = (i: number) => HUBS.includes(i) ? 14 : 8;
const LABELS: [number, number][] = [[15, 23], [325, 23], [15, 273], [325, 273]];
const KIND = ['n', 'r', 'f', 'f'] as const;

/** The town as one picture: four neighborhoods, who-told-whom trails, three colors. */
export default function MisinfoMap({ run, hour, playing, rings, seed, label, focus = false, tags, hubLabel = 'HUB' }: { run: RunResult | null; hour: number; playing: boolean; rings: boolean; seed: number; label: string; focus?: boolean; tags?: { id: number; text: string }[]; hubLabel?: string }) {
  const frame = run?.frames[hour], lines = [], ringEls = [];
  if (run) for (let j = 0; j < N; j++) {
    if (run.fromC[j] >= 0 && run.hourC[j] <= hour) { const [x1, y1] = TOWN.pos[run.fromC[j]], [x2, y2] = TOWN.pos[j]; lines.push(<line key={`c${j}`} x1={x1} y1={y1} x2={x2} y2={y2} className={`mi-tr${playing && run.hourC[j] === hour ? ' mi-now' : ''}`}/>); }
    if (run.fromX[j] >= 0 && run.hourX[j] <= hour) { const [x1, y1] = TOWN.pos[run.fromX[j]], [x2, y2] = TOWN.pos[j]; lines.push(<line key={`x${j}`} x1={x1} y1={y1} x2={x2} y2={y2} className={`mi-tx${playing && run.hourX[j] === hour ? ' mi-now' : ''}`}/>); }
    if (rings && run.recvC[j] >= 2) ringEls.push(<circle key={`g${j}`} cx={TOWN.pos[j][0]} cy={TOWN.pos[j][1]} r={R(j) + 4} className="mi-rep"/>);
  }
  const [sx, sy] = TOWN.pos[seed], sr = R(seed);
  /** A name tag above or below a person, kept inside the picture. */
  const pill = (id: number, text: string, key: string, cls = 'mi-flag') => { const [x, y] = TOWN.pos[id], r = R(id), w = Math.max(80, text.length * 7.6 + 18), py = y > 430 ? y + r + 24 : y - r - 14, px = Math.max(4, Math.min(WIDTH - w - 4, x - w / 2)); return <g key={key}><rect x={px} y={py - 14} width={w} height={20} rx={10} className="mi-flagbg"/><text x={px + w / 2} y={py + 1} textAnchor="middle" className={cls}>{text}</text></g>; };
  /** The challenge marks the first post's own friends: bold lines plus a count, so it never relies on color. */
  const hl = focus ? TOWN.adj[seed].map(j => <line key={`h${j}`} x1={sx} y1={sy} x2={TOWN.pos[j][0]} y2={TOWN.pos[j][1]} className="mi-hl"/>) : [];
  return <svg className="mi-net" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
    <g aria-hidden="true">
      {CENTERS.map(([cx, cy], c) => <ellipse key={`hood${c}`} cx={cx} cy={cy} rx={128} ry={110} className="mi-hood"/>)}
      {COMMS.map((name, c) => <text key={name} x={LABELS[c][0]} y={LABELS[c][1]} className="mi-nb">{name}</text>)}
      <g>{lines}</g>
      <g>{ringEls}</g>
      <g>{hl}</g>
      {TOWN.pos.map(([x, y], i) => <circle key={`p${i}`} cx={x} cy={y} r={R(i)} className={`mi-p${frame ? KIND[frame[i]] : 'n'}`}/>)}
      {HUBS.map(h => <text key={`hub${h}`} x={TOWN.pos[h][0]} y={TOWN.pos[h][1] + 27} textAnchor="middle" className="mi-hubtxt">{hubLabel}</text>)}
      <circle cx={sx} cy={sy} r={sr + 6} className="mi-first"/>
      {tags ? tags.map(t => pill(t.id, t.text, `t${t.id}`)) : pill(seed, focus ? `First post · ${degree(seed)} friends` : 'First post', 'first')}
    </g>
  </svg>;
}
