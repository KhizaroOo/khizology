import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
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
      // Apply the same assumed uplift twice for sensitivity, not a confidence interval or guarantee.
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
  const largestUplift = computed.withAdjusted.reduce((largest, item) =>
    item.riskAdjustedHours - item.hours > largest.riskAdjustedHours - largest.hours ? item : largest
  );

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

  // Three assumed-effort scenarios, scaled to the largest of the three.
  const scenarios = [
    {
      label: 'Base estimate',
      value: totalQuoted,
      color: '#6CA6FF',
      opacity: 0.9,
      note: 'Your entered hours, before assumed extra effort',
    },
    {
      label: 'With uplift',
      value: totalRiskAdjusted,
      color: levelColor,
      opacity: 0.55,
      note: "Each item's fixed planning uplift applied once — not a predicted outcome",
    },
    {
      label: 'Twice applied',
      value: totalRiskSafe,
      color: levelColor,
      opacity: 1,
      note: 'The same uplift compounded twice — a sensitivity scenario, not a safe upper bound',
    },
  ];
  const scenarioMax = Math.max(1, totalQuoted, totalRiskAdjusted, totalRiskSafe);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <p style={{ fontSize: '.82rem', color: 'var(--k-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
        Enter estimated hours per line item. Fixed editorial uplift percentages illustrate extra effort;
        they are not historical measurements or probabilities. Compare these assumptions with your own project evidence.
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
              {it.riskPct}% assumed extra effort
            </div>
          </div>
        ))}
      </div>

      <Insight
        what={totalQuoted === 0 ? 'No estimated hours entered yet.' : `${formatNumber(totalQuoted, 1)} estimated hours become ${formatNumber(totalRiskAdjusted, 1)}h with the assumed uplift (${formatNumber(bufferPct, 1)}% extra).`}
        why="The extra hours come from fixed editorial percentages applied to your estimates. Applying them twice is a sensitivity scenario, not a measured likelihood or guarantee."
        tip={totalQuoted === 0 ? 'Enter estimated work before comparing contingency.' : `Review ${largestUplift.name}: it contributes ${formatNumber(largestUplift.riskAdjustedHours - largestUplift.hours, 1)}h of assumed extra effort. Check scope, dependencies and your own delivery evidence before agreeing a buffer.`}
      />

      <VisualizationContainer minHeight={chartHeight + 40}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', maxWidth: `${chartWidth}px`, height: 'auto' }}
          role="img"
          aria-label="Estimated hours with assumed extra effort, sorted by uplift percentage"
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
                  {it.riskPct}% uplift
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
          Assumed extra hours (hatched, colored by uplift percentage)
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
          Compare assumed effort scenarios, not predicted outcomes or guaranteed upper bounds.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
          <Metric label="Base estimate" value={`${formatNumber(totalQuoted, 0)}h`} color="#6CA6FF" sublabel="Your entered hours" />
          <Metric label="With uplift" value={`${formatNumber(totalRiskAdjusted, 0)}h`} color={levelColor} sublabel="Assumption applied once" />
          <Metric label="Twice applied" value={`${formatNumber(totalRiskSafe, 0)}h`} color={levelColor} sublabel="Assumption compounded twice" />
          <Metric
            label="Assumed buffer"
            value={`${formatNumber(bufferPct, 0)}%`}
            sublabel="extra hours in the With uplift scenario"
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

    </div>
  );
}
