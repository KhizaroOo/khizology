import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import { clamp } from '../shared/mathHelpers';

type DiagramSegment = { type: 'hop'; hopNumber: number } | { type: 'ellipsis'; hiddenCount: number };

/** hops <= 8: one labeled box per hop. hops > 8: first 3, an ellipsis, then the last hop --
 *  keeps the diagram a fixed, legible width no matter how large hops gets. */
function buildDiagramSegments(hops: number): DiagramSegment[] {
  if (hops <= 8) {
    return Array.from({ length: hops }, (_, i) => ({ type: 'hop', hopNumber: i + 1 }));
  }
  const hiddenCount = hops - 4; // hops minus the 3 shown up front and the 1 shown at the end
  return [
    { type: 'hop', hopNumber: 1 },
    { type: 'hop', hopNumber: 2 },
    { type: 'hop', hopNumber: 3 },
    { type: 'ellipsis', hiddenCount },
    { type: 'hop', hopNumber: hops },
  ];
}

type GrowthKind = 'linear' | 'accelerating' | 'saturating';

interface ComplexityCategory {
  key: string;
  label: string;
  kind: GrowthKind;
  coeff: number;
}

// Heuristic, not a formula: each category is scored 1-10 with a growth shape that reflects
// roughly how that concern tends to scale as hop count grows -- network & coordination scale
// close to linearly with the number of hops; observability & testing scale faster because the
// number of interactions between services multiplies, not adds; security & deployment scale
// slower because much of that cost is paid once per service, not once per hop.
const COMPLEXITY_CATEGORIES: ComplexityCategory[] = [
  { key: 'network', label: 'Network', kind: 'linear', coeff: 0.18 },
  { key: 'coordination', label: 'Coordination', kind: 'linear', coeff: 0.19 },
  { key: 'dataConsistency', label: 'Data consistency', kind: 'linear', coeff: 0.21 },
  { key: 'observability', label: 'Observability', kind: 'accelerating', coeff: 1.35 },
  { key: 'testing', label: 'Testing', kind: 'accelerating', coeff: 1.25 },
  { key: 'security', label: 'Security surface', kind: 'saturating', coeff: 2.3 },
  { key: 'deployment', label: 'Deployment', kind: 'saturating', coeff: 2.0 },
];

function complexityScore(hops: number, kind: GrowthKind, coeff: number): number {
  const raw =
    kind === 'linear' ? 1 + coeff * hops : kind === 'accelerating' ? 1 + coeff * Math.sqrt(hops) : 1 + coeff * Math.log(1 + hops);
  return clamp(raw, 1, 10);
}

export default function DistributedSystemsTax() {
  const [hops, setHops] = useState(2);
  const [latencyPerHop, setLatencyPerHop] = useState(15);
  const [failureRate, setFailureRate] = useState(0.5);

  const result = useMemo(() => {
    const addedLatency = hops * latencyPerHop;
    const combinedSuccess = Math.pow(1 - failureRate / 100, hops) * 100;
    return { addedLatency, combinedSuccess };
  }, [hops, latencyPerHop, failureRate]);

  const categoryScores = useMemo(
    () => COMPLEXITY_CATEGORIES.map((cat) => ({ ...cat, score: complexityScore(hops, cat.kind, cat.coeff) })),
    [hops]
  );

  const diagram = useMemo(() => {
    const boxW = 90;
    const ellipsisW = 64;
    const gap = 30;
    const segments = buildDiagramSegments(hops);
    let x = boxW; // right edge of the in-process box
    const items = segments.map((seg) => {
      const width = seg.type === 'hop' ? boxW : ellipsisW;
      const boxX = x + gap;
      x = boxX + width;
      return { seg, boxX, width };
    });
    return { items, totalW: x, boxW };
  }, [hops]);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Additional network hops" value={hops} onChange={setHops} min={1} max={50} accent="#DF78A0" />
        <RangeControl label="Latency per hop" value={latencyPerHop} onChange={setLatencyPerHop} min={1} max={150} formatValue={(v) => `${v}ms`} accent="#DF78A0" />
        <RangeControl label="Failure rate per hop" value={failureRate} onChange={setFailureRate} min={0} max={5} step={0.1} formatValue={(v) => `${v.toFixed(1)}%`} accent="#DF78A0" />
      </div>

      <VisualizationContainer minHeight={140}>
        <svg
          viewBox={`0 0 ${diagram.totalW} 100`}
          style={{ width: '100%', maxWidth: `${diagram.totalW}px`, height: 'auto' }}
          role="img"
          aria-label="A single in-process call vs the same call split across network hops"
        >
          <defs>
            <marker id="tax-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--k-text-muted)" />
            </marker>
          </defs>
          <rect x={0} y={30} width={diagram.boxW} height={40} rx={8} fill="#22c55e" opacity={0.85} />
          <text x={diagram.boxW / 2} y={54} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">In-process</text>
          {diagram.items.map((item, i) => {
            const prevRight = i === 0 ? diagram.boxW : diagram.items[i - 1].boxX + diagram.items[i - 1].width;
            const seg = item.seg;
            return (
              <g key={i}>
                <line x1={prevRight} x2={item.boxX} y1={50} y2={50} stroke="var(--k-text-muted)" strokeWidth={2} markerEnd="url(#tax-arrow)" />
                {seg.type === 'hop' ? (
                  <>
                    <rect x={item.boxX} y={30} width={item.width} height={40} rx={8} fill="#ef4444" opacity={0.85} />
                    <text x={item.boxX + item.width / 2} y={48} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">
                      Network hop {seg.hopNumber}
                    </text>
                    <text x={item.boxX + item.width / 2} y={62} textAnchor="middle" fontSize="9" fill="#fff">+{latencyPerHop}ms</text>
                  </>
                ) : (
                  <>
                    <rect x={item.boxX} y={30} width={item.width} height={40} rx={8} fill="none" stroke="var(--k-text-muted)" strokeWidth={1.5} strokeDasharray="4 3" />
                    <text x={item.boxX + item.width / 2} y={47} textAnchor="middle" fontSize="14" fill="var(--k-text-muted)" fontWeight="700">⋯</text>
                    <text x={item.boxX + item.width / 2} y={62} textAnchor="middle" fontSize="8" fill="var(--k-text-muted)">
                      +{seg.hiddenCount} more
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Added latency" value={`+${result.addedLatency}ms`} color="#ef4444" sublabel="vs. 0ms in-process" />
        <Metric
          label="Combined success rate"
          value={`${result.combinedSuccess.toFixed(2)}%`}
          color={result.combinedSuccess > 99 ? '#22c55e' : result.combinedSuccess > 95 ? '#F7933C' : '#ef4444'}
        />
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: '.8rem',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            color: 'var(--k-text-muted)',
            marginBottom: '.5rem',
          }}
        >
          New complexity, by category
        </div>
        <VisualizationContainer minHeight={240}>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', marginBottom: '.9rem', fontStyle: 'italic', lineHeight: 1.4 }}>
              These are illustrative relative scores (1-10) from a simple heuristic, not an academic formula — use them to spot which
              concerns to plan for early, not to benchmark a real system.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
              {categoryScores.map((cat) => (
                <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                  <div style={{ width: '128px', flexShrink: 0, fontSize: '.74rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: 'var(--k-text)' }}>
                    {cat.label}
                  </div>
                  <div style={{ flex: 1, minWidth: '60px', background: 'var(--k-bg-elevated)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${(cat.score / 10) * 100}%`, height: '100%', borderRadius: '999px', background: '#DF78A0' }} />
                  </div>
                  <div style={{ width: '30px', flexShrink: 0, textAlign: 'right', fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '.8rem', color: 'var(--k-text)' }}>
                    {cat.score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </VisualizationContainer>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <Warning level={result.combinedSuccess > 99 && result.addedLatency < 50 ? 'info' : 'warn'} title="This is the tax, not a verdict">
          Every hop you add buys something — independent scaling, independent deploys, a clearer boundary — but it isn't free. {hops} hop
          {hops === 1 ? '' : 's'} costs you {result.addedLatency}ms and drops your success rate from 100% to{' '}
          {result.combinedSuccess.toFixed(2)}% before you've written a single line of business logic. Decide if what you're buying is worth
          that, on purpose.
        </Warning>
      </div>
    </div>
  );
}
