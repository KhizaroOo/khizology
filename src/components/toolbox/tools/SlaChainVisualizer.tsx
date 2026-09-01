import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

function downtimeMinutesPerYearFor(slaPct: number): number {
  return (1 - slaPct / 100) * 365 * 24 * 60;
}

function formatDowntime(minutes: number): string {
  if (minutes > 1440) return `${(minutes / 1440).toFixed(1)}d`;
  if (minutes > 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${minutes.toFixed(1)}m`;
}

function severityColor(availabilityPct: number): string {
  if (availabilityPct < 99) return '#ef4444';
  if (availabilityPct < 99.9) return '#F7933C';
  return '#22c55e';
}

function simulate(numServices: number, perServiceSLA: number) {
  const combinedAvailability = Math.pow(perServiceSLA / 100, numServices) * 100;
  const perServiceDowntimeMinutes = downtimeMinutesPerYearFor(perServiceSLA);
  const combinedDowntimeMinutes = downtimeMinutesPerYearFor(combinedAvailability);
  const cumulative: number[] = Array.from({ length: numServices }, (_, i) => Math.pow(perServiceSLA / 100, i + 1) * 100);
  return { combinedAvailability, perServiceDowntimeMinutes, combinedDowntimeMinutes, cumulative };
}

export default function SlaChainVisualizer() {
  const [numServices, setNumServices] = useState(3);
  const [perServiceSLA, setPerServiceSLA] = useState(99.9);

  const result = useMemo(() => simulate(numServices, perServiceSLA), [numServices, perServiceSLA]);
  const combinedColor = severityColor(result.combinedAvailability);
  const downtimeMultiplier = result.combinedDowntimeMinutes / result.perServiceDowntimeMinutes;

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl
          label="Services in the chain"
          value={numServices}
          onChange={(v) => setNumServices(Math.round(v))}
          min={2}
          max={8}
          formatValue={(v) => `${v} services`}
          accent="#F7933C"
        />
        <RangeControl
          label="Per-service SLA (uptime)"
          value={perServiceSLA}
          onChange={setPerServiceSLA}
          min={95}
          max={99.99}
          step={0.01}
          formatValue={(v) => `${v.toFixed(2)}%`}
          accent="#F7933C"
        />
      </div>

      <VisualizationContainer minHeight={200}>
        <svg
          viewBox={`0 0 ${totalW} 120`}
          style={{ width: '100%', maxWidth: `${totalW}px`, height: 'auto' }}
          role="img"
          aria-label={`A chain of ${numServices} services, each ${perServiceSLA.toFixed(2)}% available, compounding down to ${result.combinedAvailability.toFixed(3)}% combined availability`}
        >
          <defs>
            <marker id="sla-chain-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--k-text-muted)" />
            </marker>
          </defs>

          {Array.from({ length: numServices }, (_, i) => {
            const x = i * (boxW + gap);
            const cum = result.cumulative[i];
            const cumColor = severityColor(cum);
            return (
              <g key={i}>
                {i > 0 && (
                  <line x1={x - gap} x2={x} y1={centerY} y2={centerY} stroke="var(--k-text-muted)" strokeWidth={2} markerEnd="url(#sla-chain-arrow)" />
                )}
                <rect x={x} y={boxY} width={boxW} height={boxH} rx={8} fill="var(--k-bg-elevated)" stroke="var(--k-border)" strokeWidth={1.5} />
                <text x={x + boxW / 2} y={boxY + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--k-text-muted)" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Service {i + 1}
                </text>
                <text x={x + boxW / 2} y={boxY + 38} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--k-text)" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {perServiceSLA.toFixed(2)}%
                </text>
                <text x={x + boxW / 2} y={boxY + boxH + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill={cumColor} style={{ fontFamily: "'Poppins', sans-serif" }}>
                  chain so far: {cum.toFixed(2)}%
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
          <text x={finalX + finalBoxW / 2} y={finalBoxY + 50} textAnchor="middle" fontSize="22" fontWeight="800" fill={combinedColor} style={{ fontFamily: "'Poppins', sans-serif" }}>
            {result.combinedAvailability.toFixed(3)}%
          </text>
          <text x={finalX + finalBoxW / 2} y={finalBoxY + 70} textAnchor="middle" fontSize="10" fill="var(--k-text-muted)" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {formatDowntime(result.combinedDowntimeMinutes)} downtime/yr
          </text>
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Combined availability" value={`${result.combinedAvailability.toFixed(3)}%`} color={combinedColor} />
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
          <Warning level="danger" title={`${numServices} services at "${perServiceSLA.toFixed(2)}%" each compound into ${result.combinedAvailability.toFixed(3)}% — worse than any one of them alone`}>
            Availability multiplies down a chain, it doesn't average. Every service in the request path has to be up at the same time, so each one only ever subtracts from the total — never adds. {numServices} services each individually rated "{perServiceSLA.toFixed(2)}%" turn into {formatDowntime(result.combinedDowntimeMinutes)} of expected downtime a year, versus {formatDowntime(result.perServiceDowntimeMinutes)} for any single one of them. The chain is exactly as reliable as its weakest link, multiplied by how many links there are.
          </Warning>
        ) : (
          <Warning level="good" title={`Still ${result.combinedAvailability.toFixed(3)}% — but already below every service in it`}>
            The combined number still looks respectable, but it's already worse than the {perServiceSLA.toFixed(2)}% each individual service promises — that's what chaining does, on purpose or not. Add a 4th, 5th, or 6th service to this same chain and watch it keep eroding: nothing here degrades gracefully, it just compounds.
          </Warning>
        )}
      </div>
    </div>
  );
}
