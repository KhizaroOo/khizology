import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const LINE_ITEMS_INIT = [
  { name: 'Design', riskPct: 15 },
  { name: 'Frontend Development', riskPct: 25 },
  { name: 'Backend Development', riskPct: 35 },
  { name: 'Third-Party Integrations', riskPct: 50 },
  { name: 'Testing & QA', riskPct: 15 },
  { name: 'Client Revisions', riskPct: 40 },
];

const HOURS_INIT = [20, 30, 30, 10, 10, 15];

interface LineItem {
  name: string;
  riskPct: number;
  hours: number;
}

function riskColor(riskPct: number): string {
  if (riskPct >= 40) return '#ef4444';
  if (riskPct >= 25) return '#F7933C';
  return '#22c55e';
}

export default function ProjectQuoteRiskPlanner() {
  const [items, setItems] = useState<LineItem[]>(() =>
    LINE_ITEMS_INIT.map((it, i) => ({ ...it, hours: HOURS_INIT[i] }))
  );

  const updateHours = (index: number, value: string) => {
    const parsed = Math.max(0, parseFloat(value) || 0);
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, hours: parsed } : it)));
  };

  const computed = useMemo(() => {
    const withAdjusted = items.map((it) => ({
      ...it,
      riskAdjustedHours: it.hours * (1 + it.riskPct / 100),
    }));
    const totalQuoted = withAdjusted.reduce((sum, it) => sum + it.hours, 0);
    const totalRiskAdjusted = withAdjusted.reduce((sum, it) => sum + it.riskAdjustedHours, 0);
    const bufferPct = totalQuoted > 0 ? ((totalRiskAdjusted - totalQuoted) / totalQuoted) * 100 : 0;
    const sortedForChart = [...withAdjusted].sort((a, b) => b.riskPct - a.riskPct);
    const highestRisk = withAdjusted.reduce((max, it) => (it.riskPct > max.riskPct ? it : max), withAdjusted[0]);
    return { withAdjusted, totalQuoted, totalRiskAdjusted, bufferPct, sortedForChart, highestRisk };
  }, [items]);

  const { totalQuoted, totalRiskAdjusted, bufferPct, sortedForChart, highestRisk } = computed;

  const level = highestRisk.riskPct >= 40 ? 'danger' : highestRisk.riskPct >= 25 ? 'warn' : 'good';

  // chart layout
  const labelWidth = 178;
  const barAreaWidth = 300;
  const rightTextWidth = 162;
  const chartWidth = labelWidth + barAreaWidth + rightTextWidth;
  const rowHeight = 48;
  const barHeight = 20;
  const topPad = 8;
  const chartHeight = sortedForChart.length * rowHeight + topPad;
  const maxScale = Math.max(1, ...sortedForChart.map((it) => it.riskAdjustedHours)) * 1.08;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <p style={{ fontSize: '.82rem', color: 'var(--k-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
        Enter your estimated hours per line item. Each item carries an editorial "historical overrun risk" — how
        often work like this runs past its estimate in real projects. Nobody bills for risk, so we show you where
        it's hiding before the quote goes out.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {items.map((it, i) => (
          <div key={it.name}>
            <InputField
              label={it.name}
              value={it.hours}
              onChange={(v) => updateHours(i, v)}
              suffix="hrs"
              min="0"
              step="1"
            />
            <div
              style={{
                marginTop: '.35rem',
                fontSize: '.72rem',
                fontWeight: 700,
                color: riskColor(it.riskPct),
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {it.riskPct}% historical overrun risk
            </div>
          </div>
        ))}
      </div>

      <VisualizationContainer minHeight={chartHeight + 40}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', maxWidth: `${chartWidth}px`, height: 'auto' }}
          role="img"
          aria-label="Quoted hours per line item with risk-adjusted overrun extension, sorted by risk"
        >
          <defs>
            {sortedForChart.map((it, i) => {
              const c = riskColor(it.riskPct);
              return (
                <pattern
                  key={`pat-${it.name}`}
                  id={`hatch-${i}`}
                  patternUnits="userSpaceOnUse"
                  width={6}
                  height={6}
                  patternTransform="rotate(45)"
                >
                  <rect width={6} height={6} fill={c} opacity={0.22} />
                  <line x1={0} y1={0} x2={0} y2={6} stroke={c} strokeWidth={3} opacity={0.65} />
                </pattern>
              );
            })}
          </defs>
          {sortedForChart.map((it, i) => {
            const y = i * rowHeight + topPad;
            const barY = y + 11;
            const c = riskColor(it.riskPct);
            const quotedW = (it.hours / maxScale) * barAreaWidth;
            const extraHours = it.riskAdjustedHours - it.hours;
            const extraW = (extraHours / maxScale) * barAreaWidth;
            const x0 = labelWidth;
            return (
              <g key={it.name}>
                <text
                  x={0}
                  y={barY + 8}
                  fontSize="11.5"
                  fontWeight={700}
                  fill="var(--k-text)"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {it.name}
                </text>
                <text x={0} y={barY + 21} fontSize="9.5" fill={c} style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                  {it.riskPct}% risk
                </text>
                <rect x={x0} y={barY} width={Math.max(0, quotedW)} height={barHeight} rx={4} fill="#6CA6FF" opacity={0.9} />
                <rect x={x0 + quotedW} y={barY} width={Math.max(0, extraW)} height={barHeight} rx={4} fill={`url(#hatch-${i})`} />
                <text
                  x={x0 + quotedW + extraW + 8}
                  y={barY + 14}
                  fontSize="9.5"
                  fill="var(--k-text-muted)"
                  style={{ fontFamily: "'Mulish', sans-serif" }}
                >
                  {`${it.hours}h → ${it.riskAdjustedHours.toFixed(1)}h`}
                </text>
              </g>
            );
          })}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#6CA6FF', borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />
          Quoted hours
        </span>
        <span>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'repeating-linear-gradient(45deg, #F7933C, #F7933C 2px, transparent 2px, transparent 4px)', borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />
          Risk-adjusted extra hours (hatched, colored by severity)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Total quoted hours" value={`${totalQuoted}h`} />
        <Metric
          label="Risk-adjusted hours"
          value={`${totalRiskAdjusted.toFixed(0)}h`}
          color={level === 'danger' ? '#ef4444' : level === 'warn' ? '#F7933C' : '#22c55e'}
        />
        <Metric
          label="Recommended buffer"
          value={`${bufferPct.toFixed(0)}%`}
          sublabel="add this to your quoted total"
          color={level === 'danger' ? '#ef4444' : level === 'warn' ? '#F7933C' : '#22c55e'}
        />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {level === 'danger' && (
          <Warning level="danger" title={`${highestRisk.name} is your riskiest line item at ${highestRisk.riskPct}% historical overrun`}>
            Line items this volatile blow through estimates more often than not. Either pad this line item's hours
            specifically, or draw a hard scope boundary with the client in writing before you send the quote —
            don't let the buffer get lost in the total.
          </Warning>
        )}
        {level === 'warn' && (
          <Warning level="warn" title={`${highestRisk.name} carries the most risk at ${highestRisk.riskPct}% historical overrun`}>
            Not a red flag on its own, but worth a specific note to the client about what's in and out of scope for
            this line item before you commit to the number.
          </Warning>
        )}
        {level === 'good' && (
          <Warning level="good" title={`${highestRisk.name} is your highest-risk item, and even that is only ${highestRisk.riskPct}%`}>
            This quote is low-volatility overall — the recommended buffer above is mostly a cushion, not a rescue.
          </Warning>
        )}
      </div>
    </div>
  );
}
