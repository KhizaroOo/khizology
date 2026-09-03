import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import { clamp } from '../shared/mathHelpers';

interface SlaPreset {
  numServices: number;
  perServiceSLA: number;
  redundantIndices: number[];
}

const PRESETS: { label: string; values: SlaPreset }[] = [
  { label: 'Simple API chain', values: { numServices: 3, perServiceSLA: 99.9, redundantIndices: [] } },
  { label: 'Payment pipeline', values: { numServices: 5, perServiceSLA: 99.95, redundantIndices: [1, 3] } },
  { label: 'Legacy 2-hop dependency', values: { numServices: 2, perServiceSLA: 99.5, redundantIndices: [] } },
  { label: 'Fully redundant critical path', values: { numServices: 4, perServiceSLA: 99.9, redundantIndices: [0, 1, 2, 3] } },
];

function downtimeMinutesPerYearFor(availabilityPct: number): number {
  return (1 - clamp(availabilityPct, 0, 100) / 100) * 365 * 24 * 60;
}

function formatDowntime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0.0m';
  if (minutes > 1440) return `${(minutes / 1440).toFixed(1)}d`;
  if (minutes > 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${minutes.toFixed(1)}m`;
}

function severityColor(availabilityPct: number): string {
  if (availabilityPct < 99) return '#ef4444';
  if (availabilityPct < 99.9) return '#F7933C';
  return '#22c55e';
}

/**
 * Availability numbers this close to 100% get rounded away at a fixed decimal count (a redundant
 * service can read as a misleading "100.000%"). Escalate decimals only as far as needed to keep
 * the number honest, otherwise stick to the tool's usual 3 decimals.
 */
function formatAvailability(pct: number): string {
  if (!Number.isFinite(pct)) return '0.000%';
  const value = clamp(pct, 0, 100);
  let decimals = 3;
  while (decimals < 8 && value < 100 && parseFloat(value.toFixed(decimals)) >= 100) {
    decimals += 1;
  }
  return `${value.toFixed(decimals)}%`;
}

/** Two independent instances of the same SLA in parallel -- either one being up is enough. */
function redundantAvailability(baseSlaPct: number): number {
  const p = clamp(baseSlaPct, 0, 100) / 100;
  return (1 - Math.pow(1 - p, 2)) * 100;
}

function simulate(numServices: number, perServiceSLA: number, redundant: Set<number>) {
  const effective: number[] = [];
  const cumulative: number[] = [];
  let runningFraction = 1;
  for (let i = 0; i < numServices; i++) {
    const availabilityPct = redundant.has(i) ? redundantAvailability(perServiceSLA) : perServiceSLA;
    effective.push(availabilityPct);
    runningFraction *= availabilityPct / 100;
    cumulative.push(runningFraction * 100);
  }
  const combinedAvailability = cumulative.length ? cumulative[cumulative.length - 1] : 100;
  // Same chain, no backups -- the tool's original formula, kept as-is for comparison.
  const baselineCombinedAvailability = Math.pow(perServiceSLA / 100, numServices) * 100;
  const perServiceDowntimeMinutes = downtimeMinutesPerYearFor(perServiceSLA);
  const combinedDowntimeMinutes = downtimeMinutesPerYearFor(combinedAvailability);
  const baselineDowntimeMinutes = downtimeMinutesPerYearFor(baselineCombinedAvailability);
  return {
    effective,
    cumulative,
    combinedAvailability,
    baselineCombinedAvailability,
    perServiceDowntimeMinutes,
    combinedDowntimeMinutes,
    baselineDowntimeMinutes,
  };
}

export default function SlaChainVisualizer() {
  const [numServices, setNumServices] = useState(3);
  const [perServiceSLA, setPerServiceSLA] = useState(99.9);
  const [redundant, setRedundant] = useState<Set<number>>(() => new Set());
  const [activePreset, setActivePreset] = useState<string | null>('Simple API chain');

  const result = useMemo(() => simulate(numServices, perServiceSLA, redundant), [numServices, perServiceSLA, redundant]);
  const activeRedundantIndices = useMemo(
    () => Array.from(redundant).filter((i) => i < numServices).sort((a, b) => a - b),
    [redundant, numServices]
  );
  const combinedColor = severityColor(result.combinedAvailability);
  const downtimeMultiplier = result.combinedDowntimeMinutes / result.perServiceDowntimeMinutes;
  const downtimeSavedByRedundancy = Math.max(0, result.baselineDowntimeMinutes - result.combinedDowntimeMinutes);

  function handleNumServicesChange(v: number) {
    setNumServices(Math.round(v));
    setActivePreset(null);
  }
  function handlePerServiceSLAChange(v: number) {
    setPerServiceSLA(v);
    setActivePreset(null);
  }
  function handleToggleRedundant(i: number) {
    setRedundant((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setActivePreset(null);
  }
  function handlePresetSelect(values: SlaPreset, label: string) {
    setNumServices(values.numServices);
    setPerServiceSLA(values.perServiceSLA);
    setRedundant(new Set(values.redundantIndices));
    setActivePreset(label);
  }

  const boxW = 100;
  const boxH = 50;
  const gap = 40;
  const finalBoxW = 170;
  const boxY = 30;
  const finalBoxY = 12;
  const finalBoxH = 86;
  const centerY = boxY + boxH / 2;
  const totalW = numServices * (boxW + gap) + finalBoxW;
  const finalX = numServices * (boxW + gap);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={handlePresetSelect} accent="#F7933C" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl
          label="Services in the chain"
          value={numServices}
          onChange={handleNumServicesChange}
          min={2}
          max={8}
          formatValue={(v) => `${v} services`}
          accent="#F7933C"
        />
        <RangeControl
          label="Per-service SLA (uptime)"
          value={perServiceSLA}
          onChange={handlePerServiceSLAChange}
          min={95}
          max={99.99}
          step={0.01}
          formatValue={(v) => `${v.toFixed(2)}%`}
          accent="#F7933C"
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--k-text-muted)',
            fontFamily: "'Poppins', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: '.5rem',
          }}
        >
          Which services have a redundant backup? (2× parallel instances)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          {Array.from({ length: numServices }, (_, i) => {
            const active = redundant.has(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={active}
                onClick={() => handleToggleRedundant(i)}
                style={{
                  padding: '.4rem .875rem',
                  borderRadius: '999px',
                  border: `1.5px solid ${active ? '#22c55e' : 'var(--k-border)'}`,
                  background: active ? 'color-mix(in srgb, #22c55e 14%, transparent)' : 'var(--k-bg)',
                  color: active ? '#22c55e' : 'var(--k-text-muted)',
                  fontSize: '.78rem',
                  fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif",
                  cursor: 'pointer',
                  transition: 'border-color .15s, color .15s, background .15s',
                }}
              >
                Service {i + 1}{active ? ' ×2' : ''}
              </button>
            );
          })}
        </div>

        {activeRedundantIndices.length > 0 && (
          <div
            style={{
              background: 'var(--k-bg-elevated)',
              border: '1px solid var(--k-border)',
              borderRadius: '.75rem',
              padding: '.75rem 1rem',
              marginTop: '.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '.35rem',
            }}
          >
            <div style={{ fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif" }}>
              Redundancy impact (per service)
            </div>
            {activeRedundantIndices.map((i) => (
              <div key={i} style={{ fontSize: '.8rem', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--k-text)' }}>Service {i + 1}:</span>{' '}
                <span style={{ color: 'var(--k-text-muted)' }}>{perServiceSLA.toFixed(2)}%</span>
                {' → '}
                <span style={{ fontWeight: 700, color: '#22c55e' }}>{formatAvailability(result.effective[i])}</span>
                <span style={{ color: 'var(--k-text-muted)' }}> with a second instance in parallel</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <VisualizationContainer minHeight={200}>
        <svg
          viewBox={`0 0 ${totalW} 120`}
          style={{ width: '100%', maxWidth: `${totalW}px`, height: 'auto' }}
          role="img"
          aria-label={`A chain of ${numServices} services, each ${perServiceSLA.toFixed(2)}% available${
            activeRedundantIndices.length > 0 ? ` (${activeRedundantIndices.length} with a redundant backup)` : ''
          }, compounding down to ${formatAvailability(result.combinedAvailability)} combined availability`}
        >
          <defs>
            <marker id="sla-chain-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--k-text-muted)" />
            </marker>
          </defs>

          {Array.from({ length: numServices }, (_, i) => {
            const x = i * (boxW + gap);
            const isRedundant = redundant.has(i);
            const cum = result.cumulative[i];
            const cumColor = severityColor(cum);
            const boxStroke = isRedundant ? '#22c55e' : 'var(--k-border)';
            return (
              <g key={i}>
                {i > 0 && (
                  <line x1={x - gap} x2={x} y1={centerY} y2={centerY} stroke="var(--k-text-muted)" strokeWidth={2} markerEnd="url(#sla-chain-arrow)" />
                )}
                {isRedundant && (
                  <rect
                    x={x - 5}
                    y={boxY - 5}
                    width={boxW + 10}
                    height={boxH + 10}
                    rx={11}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                    opacity={0.7}
                  />
                )}
                <rect x={x} y={boxY} width={boxW} height={boxH} rx={8} fill="var(--k-bg-elevated)" stroke={boxStroke} strokeWidth={1.5} />
                <text
                  x={x + boxW / 2}
                  y={boxY + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isRedundant ? '#22c55e' : 'var(--k-text-muted)'}
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Service {i + 1}{isRedundant ? ' ×2' : ''}
                </text>
                <text x={x + boxW / 2} y={boxY + 38} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--k-text)" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {isRedundant ? formatAvailability(result.effective[i]) : `${perServiceSLA.toFixed(2)}%`}
                </text>
                <text x={x + boxW / 2} y={boxY + boxH + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill={cumColor} style={{ fontFamily: "'Poppins', sans-serif" }}>
                  chain so far: {formatAvailability(cum)}
                </text>
              </g>
            );
          })}

          <line x1={finalX - gap} x2={finalX} y1={centerY} y2={centerY} stroke="var(--k-text-muted)" strokeWidth={2} markerEnd="url(#sla-chain-arrow)" />
          <rect
            x={finalX}
            y={finalBoxY}
            width={finalBoxW}
            height={finalBoxH}
            rx={10}
            fill={`color-mix(in srgb, ${combinedColor} 16%, var(--k-bg-card))`}
            stroke={combinedColor}
            strokeWidth={2}
          />
          <text x={finalX + finalBoxW / 2} y={finalBoxY + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--k-text-muted)" style={{ fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Combined chain
          </text>
          <text x={finalX + finalBoxW / 2} y={finalBoxY + 50} textAnchor="middle" fontSize="20" fontWeight="800" fill={combinedColor} style={{ fontFamily: "'Poppins', sans-serif" }}>
            {formatAvailability(result.combinedAvailability)}
          </text>
          <text x={finalX + finalBoxW / 2} y={finalBoxY + 70} textAnchor="middle" fontSize="10" fill="var(--k-text-muted)" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {formatDowntime(result.combinedDowntimeMinutes)} downtime/yr
          </text>
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Combined availability" value={formatAvailability(result.combinedAvailability)} color={combinedColor} />
        <Metric
          label="Downtime per service/year"
          value={formatDowntime(result.perServiceDowntimeMinutes)}
          sublabel="assuming this SLA holds all year"
        />
        <Metric
          label="Combined downtime/year"
          value={formatDowntime(result.combinedDowntimeMinutes)}
          color={combinedColor}
          sublabel={`${downtimeMultiplier.toFixed(1)}× a single service's downtime`}
        />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {result.combinedAvailability < 99 ? (
          <Warning level="danger" title={`${numServices} services at "${perServiceSLA.toFixed(2)}%" each compound into ${formatAvailability(result.combinedAvailability)} — worse than any one of them alone`}>
            Availability multiplies down a chain, it doesn't average. Every service in the request path has to be up at the same time, so each one only ever subtracts from the total — never adds. {numServices} services each individually rated "{perServiceSLA.toFixed(2)}%" turn into {formatDowntime(result.combinedDowntimeMinutes)} of expected downtime a year, versus {formatDowntime(result.perServiceDowntimeMinutes)} for any single one of them. The chain is exactly as reliable as its weakest link, multiplied by how many links there are.
            {activeRedundantIndices.length > 0 && (
              <>
                {' '}Redundancy is already softening this: the same chain with no backups at all would only hold {formatAvailability(result.baselineCombinedAvailability)} ({formatDowntime(result.baselineDowntimeMinutes)}/yr) — the {activeRedundantIndices.length} backed-up service{activeRedundantIndices.length > 1 ? 's' : ''} buy back {formatDowntime(downtimeSavedByRedundancy)} of downtime a year. It still isn't enough on its own, because the services without a backup are the ones now setting the ceiling.
              </>
            )}
          </Warning>
        ) : (
          <Warning level="good" title={`Still ${formatAvailability(result.combinedAvailability)} — but already below every service in it`}>
            The combined number still looks respectable, but it's already worse than the {perServiceSLA.toFixed(2)}% each individual service promises — that's what chaining does, on purpose or not. Add a 4th, 5th, or 6th service to this same chain and watch it keep eroding: nothing here degrades gracefully, it just compounds.
            {activeRedundantIndices.length > 0 && (
              <>
                {' '}Redundancy is doing real work here: without backups, this same chain would land at {formatAvailability(result.baselineCombinedAvailability)} instead — the {activeRedundantIndices.length} backed-up service{activeRedundantIndices.length > 1 ? 's' : ''} recover {formatDowntime(downtimeSavedByRedundancy)} of downtime a year. Two independent instances only go down together if both fail at once, which is why doubling up on your weakest link matters more than doubling up on one that's already solid.
              </>
            )}
          </Warning>
        )}
      </div>
    </div>
  );
}
