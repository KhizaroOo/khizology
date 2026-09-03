import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import { clamp, formatNumber, safeDiv, safeNumber } from '../shared/mathHelpers';

const LINE_ITEMS_INIT = [
  { name: 'Design', riskPct: 15 },
  { name: 'Frontend Development', riskPct: 25 },
  { name: 'Backend Development', riskPct: 35 },
  { name: 'Third-Party Integrations', riskPct: 50 },
  { name: 'Testing & QA', riskPct: 15 },
  { name: 'Client Revisions', riskPct: 40 },
];

const HOURS_INIT = [20, 30, 30, 10, 10, 15];

const MAX_HOURS = 100_000;

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
    const parsed = clamp(safeNumber(value, 0), 0, MAX_HOURS);
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, hours: parsed } : it)));
  };

  const computed = useMemo(() => {
    const withAdjusted = items.map((it) => {
      const riskAdjustedHours = it.hours * (1 + it.riskPct / 100);
      // Risk-safe applies the same historical risk a second time, on top of the
      // already-adjusted hours -- a deliberately conservative "quote this if you
      // need certainty" number, not a second independent risk.
      const riskSafeHours = riskAdjustedHours * (1 + it.riskPct / 100);
      return { ...it, riskAdjustedHours, riskSafeHours };
    });
    const totalQuoted = withAdjusted.reduce((sum, it) => sum + it.hours, 0);
    const totalRiskAdjusted = withAdjusted.reduce((sum, it) => sum + it.riskAdjustedHours, 0);
    const totalRiskSafe = withAdjusted.reduce((sum, it) => sum + it.riskSafeHours, 0);
    const bufferPct = safeDiv(totalRiskAdjusted - totalQuoted, totalQuoted, 0) * 100;
    const sortedForChart = [...withAdjusted].sort((a, b) => b.riskPct - a.riskPct);
    const highestRisk = withAdjusted.reduce((max, it) => (it.riskPct > max.riskPct ? it : max), withAdjusted[0]);
    return { withAdjusted, totalQuoted, totalRiskAdjusted, totalRiskSafe, bufferPct, sortedForChart, highestRisk };
  }, [items]);

  const { totalQuoted, totalRiskAdjusted, totalRiskSafe, bufferPct, sortedForChart, highestRisk } = computed;

  const level = highestRisk.riskPct >= 40 ? 'danger' : highestRisk.riskPct >= 25 ? 'warn' : 'good';
  const levelColor = level === 'danger' ? '#ef4444' : level === 'warn' ? '#F7933C' : '#22c55e';

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

  // three-scenario comparison (Optimistic -> Likely -> Risk-safe), scaled to the largest of the three
  const scenarios = [
    {
      label: 'Optimistic',
      value: totalQuoted,
      color: '#6CA6FF',
      opacity: 0.9,
      note: 'No risk applied — the raw quoted hours',
    },
    {
      label: 'Likely',
      value: totalRiskAdjusted,
      color: levelColor,
      opacity: 0.55,
      note: "Each item's historical risk applied once — the realistic total",
    },
    {
      label: 'Risk-safe',
      value: totalRiskSafe,
      color: levelColor,
      opacity: 1,
      note: 'That same risk applied a second time — quote this when the client needs certainty',
    },
  ];
  const scenarioMax = Math.max(1, totalQuoted, totalRiskAdjusted, totalRiskSafe);

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

      <div style={{ marginTop: '2rem' }}>
        <h3
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: '.85rem',
            color: 'var(--k-text)',
            margin: '0 0 .25rem',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Three numbers to quote from
        </h3>
        <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          This is a planning aid, not an exact estimator — treat these as three defensible totals to choose between,
          not three guaranteed outcomes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
          <Metric label="Optimistic" value={`${formatNumber(totalQuoted, 0)}h`} color="#6CA6FF" sublabel="No risk applied" />
          <Metric label="Likely" value={`${formatNumber(totalRiskAdjusted, 0)}h`} color={levelColor} sublabel="Risk applied once" />
          <Metric label="Risk-safe" value={`${formatNumber(totalRiskSafe, 0)}h`} color={levelColor} sublabel="Risk applied twice" />
          <Metric
            label="Recommended buffer"
            value={`${formatNumber(bufferPct, 0)}%`}
            sublabel="add this to reach Likely"
            color={levelColor}
          />
        </div>

        <VisualizationContainer minHeight={150}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
            {scenarios.map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '.75rem',
                    marginBottom: '.3rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700,
                      fontSize: '.8rem',
                      color: 'var(--k-text)',
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '.85rem', color: s.color }}>
                    {formatNumber(s.value, 0)}h
                  </span>
                </div>
                <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '999px', height: '14px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${clamp(safeDiv(s.value, scenarioMax, 0) * 100, 0, 100)}%`,
                      height: '100%',
                      background: s.color,
                      opacity: s.opacity,
                      transition: 'width .2s',
                    }}
                  />
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.25rem', fontFamily: "'Mulish', sans-serif" }}>
                  {s.note}
                </div>
              </div>
            ))}
          </div>
        </VisualizationContainer>
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
