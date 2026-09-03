import { useMemo, useRef, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import Insight from '../shared/Insight';
import VisualizationContainer from '../shared/VisualizationContainer';
import { clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

interface Hop {
  id: string;
  name: string;
  timeoutMs: number;
  retries: number;
}

const MIN_HOPS = 1;
const MAX_HOPS = 6;
const HOP_COLORS = ['#F7933C', '#6CA6FF', '#DF78A0', '#93B96A', '#f2c14e', '#8b7fd6'];

const DEFAULT_HOPS: Hop[] = [
  { id: 'h0', name: 'Gateway', timeoutMs: 1500, retries: 0 },
  { id: 'h1', name: 'API', timeoutMs: 1000, retries: 1 },
  { id: 'h2', name: 'Service', timeoutMs: 600, retries: 1 },
  { id: 'h3', name: 'Database', timeoutMs: 300, retries: 0 },
];

interface Issue {
  level: 'warn' | 'danger';
  title: string;
  body: string;
}

function colorFor(index: number): string {
  return HOP_COLORS[index % HOP_COLORS.length];
}

export default function TimeoutChainPlanner() {
  const [clientTimeout, setClientTimeout] = useState(2000);
  const [hops, setHops] = useState<Hop[]>(DEFAULT_HOPS);
  const nextId = useRef(DEFAULT_HOPS.length);

  function updateHop(index: number, patch: Partial<Hop>) {
    setHops((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function addHop() {
    setHops((prev) => {
      if (prev.length >= MAX_HOPS) return prev;
      const id = `h${nextId.current}`;
      nextId.current += 1;
      return [...prev, { id, name: `Hop ${prev.length + 1}`, timeoutMs: 500, retries: 0 }];
    });
  }

  function removeHop(index: number) {
    setHops((prev) => (prev.length <= MIN_HOPS ? prev : prev.filter((_, i) => i !== index)));
  }

  const hopsComputed = useMemo(
    () =>
      hops.map((h, i) => {
        const timeoutMs = Math.max(1, h.timeoutMs);
        const retries = clamp(h.retries, 0, 3);
        const effectiveMs = timeoutMs * (retries + 1);
        return { ...h, timeoutMs, retries, effectiveMs, color: colorFor(i) };
      }),
    [hops]
  );

  const result = useMemo(() => {
    let cumulativeBefore = 0;
    const cumulativeAfter: number[] = [];
    const issues: Issue[] = [];

    hopsComputed.forEach((h) => {
      const remainingBefore = clientTimeout - cumulativeBefore;

      // A single hop whose own (pre-retry) timeout alone would already exhaust whatever
      // budget the client had left going into it -- only flag the hop that first does this,
      // not every hop downstream once the budget is already blown.
      if (remainingBefore > 0 && h.timeoutMs >= remainingBefore) {
        issues.push({
          level: 'danger',
          title: `"${h.name}" eats the whole remaining budget on its own`,
          body: `By the time the chain reaches ${h.name}, only ${formatNumber(remainingBefore)}ms of the client's patience is left -- but ${h.name}'s own timeout is ${formatNumber(h.timeoutMs)}ms, before any retries. One slow attempt here and the client has already given up.`,
        });
      }

      // Retries amplify a hop's own timeout into something that, alone, can eat most or all
      // of the client's budget -- distinct from the plain "timeout too long" case above.
      if (h.retries > 0) {
        const marginAlone = clientTimeout - h.effectiveMs;
        const marginPctAlone = safeDiv(marginAlone, clientTimeout, 0) * 100;
        if (marginPctAlone < 15) {
          issues.push({
            level: marginAlone < 0 ? 'danger' : 'warn',
            title: `"${h.name}"'s retries leave no safety margin`,
            body: `${h.name} retries ${h.retries}× at ${formatNumber(h.timeoutMs)}ms each -- ${formatNumber(h.effectiveMs)}ms worst case ${
              marginAlone < 0
                ? `already exceeds the client's own ${formatNumber(clientTimeout)}ms timeout`
                : `is only ${marginPctAlone.toFixed(0)}% under the client's ${formatNumber(clientTimeout)}ms timeout`
            }, and every other hop still has to run.`,
          });
        }
      }

      cumulativeBefore += h.effectiveMs;
      cumulativeAfter.push(cumulativeBefore);
    });

    const totalChainBudget = cumulativeBefore;
    const margin = clientTimeout - totalChainBudget;
    const marginPct = safeDiv(margin, clientTimeout, 0) * 100;

    if (margin < 0) {
      issues.unshift({
        level: 'danger',
        title: "Your chain can outlive the client's patience",
        body: `The client gives up at ${formatNumber(clientTimeout)}ms, but the chain's own worst-case timeouts allow it to keep working until ${formatNumber(totalChainBudget)}ms. That's wasted work at best -- at worst the client has already retried, and now two requests are running for the same thing.`,
      });
    } else if (marginPct < 15) {
      issues.push({
        level: 'warn',
        title: 'Cutting it close',
        body: `Only ${marginPct.toFixed(0)}% margin between when the chain gives up worst-case and when the client does. A single slow blip could flip this -- aim for 20%+ margin.`,
      });
    }

    const tippingIndex = cumulativeAfter.findIndex((c) => c > clientTimeout);
    const riskiestHop =
      tippingIndex >= 0
        ? { hop: hopsComputed[tippingIndex], label: 'First hop to blow the budget' }
        : hopsComputed.length > 0
        ? {
            hop: hopsComputed.reduce((a, b) => (b.effectiveMs > a.effectiveMs ? b : a)),
            label: 'Biggest single hop',
          }
        : null;

    return { totalChainBudget, margin, marginPct, issues, cumulativeAfter, riskiestHop };
  }, [hopsComputed, clientTimeout]);

  // Suggested budget: split the client's timeout evenly across every hop, holding back ~15%
  // as headroom, then shrink each hop's own timeout to fit its configured retry count so the
  // *effective* (post-retry) time still lands on its even share. A starting point, not a promise.
  const suggested = useMemo(() => {
    const targetTotal = clientTimeout * 0.85;
    const share = safeDiv(targetTotal, hopsComputed.length, 0);
    return hopsComputed.map((h) => ({
      id: h.id,
      timeoutMs: Math.max(10, Math.round(safeDiv(share, h.retries + 1, share) / 10) * 10),
    }));
  }, [clientTimeout, hopsComputed]);

  function applySuggestedBudget() {
    setHops((prev) =>
      prev.map((h) => {
        const s = suggested.find((x) => x.id === h.id);
        return s ? { ...h, timeoutMs: s.timeoutMs } : h;
      })
    );
  }

  const CHART_W = 560;
  const PAD = 36;
  const denom = Math.max(clientTimeout, result.totalChainBudget, 1);
  const scale = CHART_W / denom;
  const markerX = PAD + clamp(clientTimeout * scale, 0, CHART_W);
  const svgWidth = PAD * 2 + CHART_W;
  const barY = 40;
  const barH = 40;
  const svgHeight = 100;
  const markerColor = result.margin < 0 ? '#ef4444' : result.marginPct < 15 ? '#F7933C' : '#22c55e';
  const labelAnchor = markerX > svgWidth - 90 ? 'end' : markerX < 90 ? 'start' : 'middle';

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Client's own timeout" value={clientTimeout} onChange={setClientTimeout} min={200} max={5000} step={100} formatValue={(v) => `${v}ms`} accent="var(--k-accent)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '.85rem' }}>
        {hopsComputed.map((h, i) => (
          <div key={h.id} style={{ background: 'var(--k-bg)', border: '1px solid var(--k-border)', borderRadius: '.75rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: h.color, display: 'inline-block', flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: '.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: 'var(--k-text-muted)',
                }}
              >
                Hop {i + 1}
              </span>
              {hops.length > MIN_HOPS && (
                <button
                  type="button"
                  onClick={() => removeHop(i)}
                  aria-label={`Remove ${h.name}`}
                  style={{
                    marginLeft: 'auto',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: '1.5px solid var(--k-border)',
                    background: 'var(--k-bg-card)',
                    color: 'var(--k-text-muted)',
                    fontSize: '.85rem',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <InputField label="Name" type="text" value={h.name} onChange={(v) => updateHop(i, { name: v })} placeholder={`Hop ${i + 1}`} />
              <RangeControl
                label="Timeout"
                value={h.timeoutMs}
                onChange={(v) => updateHop(i, { timeoutMs: Math.round(v) })}
                min={50}
                max={3000}
                step={50}
                formatValue={(v) => `${v}ms`}
                accent={h.color}
              />
              <RangeControl
                label="Retries"
                value={h.retries}
                onChange={(v) => updateHop(i, { retries: Math.round(v) })}
                min={0}
                max={3}
                step={1}
                formatValue={(v) => `${v}×`}
                accent={h.color}
              />
            </div>
            <div style={{ marginTop: '.65rem', fontSize: '.72rem', color: 'var(--k-text-muted)', lineHeight: 1.4 }}>
              Worst case: <strong style={{ color: 'var(--k-text)' }}>{formatNumber(h.effectiveMs)}ms</strong>
              {h.retries > 0 ? ` — 1 try + ${h.retries} retr${h.retries === 1 ? 'y' : 'ies'} × ${formatNumber(h.timeoutMs)}ms` : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <span style={{ fontSize: '.78rem', color: 'var(--k-text-muted)' }}>
          {hops.length} of {MAX_HOPS} hops
        </span>
        <button
          type="button"
          onClick={addHop}
          disabled={hops.length >= MAX_HOPS}
          style={{
            padding: '.5rem 1rem',
            borderRadius: '.6rem',
            border: '1.5px dashed var(--k-border)',
            background: 'var(--k-bg)',
            color: hops.length >= MAX_HOPS ? 'var(--k-text-muted)' : 'var(--k-accent)',
            fontSize: '.8rem',
            fontWeight: 700,
            fontFamily: "'Poppins', sans-serif",
            cursor: hops.length >= MAX_HOPS ? 'not-allowed' : 'pointer',
            opacity: hops.length >= MAX_HOPS ? 0.5 : 1,
          }}
        >
          + Add hop
        </button>
      </div>

      <VisualizationContainer minHeight={140}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', maxWidth: `${svgWidth}px`, height: 'auto' }}
          role="img"
          aria-label={`Stacked bar of ${hopsComputed.length} hops totaling ${formatNumber(result.totalChainBudget)}ms worst-case, against a client timeout of ${formatNumber(clientTimeout)}ms`}
        >
          {(() => {
            let x = PAD;
            return hopsComputed.map((h) => {
              const w = Math.max(h.effectiveMs * scale, 2);
              const barX = x;
              x += w;
              const showFull = w >= 56;
              const showShort = !showFull && w >= 20;
              return (
                <g key={h.id}>
                  <rect x={barX} y={barY} width={w} height={barH} fill={h.color} opacity={0.9} stroke="var(--k-bg-card)" strokeWidth={1} />
                  <title>{`${h.name}: ${formatNumber(h.effectiveMs)}ms worst case${h.retries > 0 ? ` (1 try + ${h.retries} retry × ${formatNumber(h.timeoutMs)}ms)` : ''}`}</title>
                  {showFull && (
                    <>
                      <text x={barX + w / 2} y={barY + barH / 2 - 4} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#1a1a1a" fontFamily="'Poppins', sans-serif">
                        {h.name.length > Math.floor(w / 6) ? `${h.name.slice(0, Math.max(1, Math.floor(w / 6) - 1))}…` : h.name}
                      </text>
                      <text x={barX + w / 2} y={barY + barH / 2 + 11} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1a1a1a" fontFamily="'Poppins', sans-serif">
                        {formatNumber(h.effectiveMs)}ms
                      </text>
                    </>
                  )}
                  {showShort && (
                    <text x={barX + w / 2} y={barY + barH / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="800" fill="#1a1a1a" fontFamily="'Poppins', sans-serif">
                      {h.name.slice(0, 1)}
                    </text>
                  )}
                </g>
              );
            });
          })()}

          <line x1={markerX} x2={markerX} y1={barY - 8} y2={barY + barH + 8} stroke={markerColor} strokeWidth={2} />
          <text
            x={labelAnchor === 'start' ? Math.max(0, markerX) : labelAnchor === 'end' ? Math.min(svgWidth, markerX) : markerX}
            y={barY - 16}
            textAnchor={labelAnchor}
            fontSize="10.5"
            fontWeight="700"
            fill={markerColor}
            fontFamily="'Poppins', sans-serif"
          >
            client gives up: {formatNumber(clientTimeout)}ms
          </text>
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Total chain budget" value={`${formatNumber(result.totalChainBudget)}ms`} sublabel="sum of every hop's worst case" />
        <Metric label="Client timeout" value={`${formatNumber(clientTimeout)}ms`} />
        <Metric
          label="Margin"
          value={`${result.margin >= 0 ? '+' : ''}${formatNumber(result.margin)}ms`}
          color={result.margin < 0 ? '#ef4444' : result.marginPct < 15 ? '#F7933C' : '#22c55e'}
        />
        {result.riskiestHop && (
          <Metric
            label={result.riskiestHop.label}
            value={result.riskiestHop.hop.name}
            color={result.riskiestHop.label.startsWith('First') ? '#ef4444' : 'var(--k-text)'}
            sublabel={`${formatNumber(result.riskiestHop.hop.effectiveMs)}ms of the total`}
          />
        )}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <Insight
          what={`Even split across ${hopsComputed.length} hop${hopsComputed.length === 1 ? '' : 's'}: about ${formatNumber(safeDiv(clientTimeout * 0.85, hopsComputed.length, 0))}ms of client budget each, before dividing by each hop's own retries.`}
          why="Splitting the client's timeout evenly across every hop -- then shrinking each hop's own timeout to fit its retry count -- keeps any single slow hop from silently eating the whole budget, and holds back about 15% as headroom. It's a planning aid, a sane starting split, not an exact optimizer."
          tip={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                {hopsComputed.map((h, i) => (
                  <span
                    key={h.id}
                    style={{
                      fontSize: '.78rem',
                      padding: '.3rem .6rem',
                      borderRadius: '.5rem',
                      background: 'var(--k-bg-card)',
                      border: '1px solid var(--k-border)',
                      fontFamily: "'Mulish', sans-serif",
                    }}
                  >
                    <strong style={{ color: h.color, fontFamily: "'Poppins', sans-serif" }}>{h.name}</strong>: {formatNumber(suggested[i]?.timeoutMs ?? 0)}ms
                  </span>
                ))}
              </div>
              <div>
                <button
                  type="button"
                  onClick={applySuggestedBudget}
                  style={{
                    padding: '.5rem 1rem',
                    borderRadius: '.6rem',
                    border: 'none',
                    background: 'var(--k-accent)',
                    color: '#1a1a1a',
                    fontSize: '.8rem',
                    fontWeight: 700,
                    fontFamily: "'Poppins', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Reset hops to suggested budget
                </button>
              </div>
            </div>
          }
        />
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {result.issues.length > 0 ? (
          result.issues.map((issue, i) => (
            <Warning key={i} level={issue.level} title={issue.title}>
              {issue.body}
            </Warning>
          ))
        ) : (
          <Warning level="good" title={`Your chain fails ${result.marginPct.toFixed(0)}% faster than the client gives up`}>
            Healthy margin across every hop -- the chain has time to fail cleanly and respond before the client abandons the request.
          </Warning>
        )}
      </div>
    </div>
  );
}
