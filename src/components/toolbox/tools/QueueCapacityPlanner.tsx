import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const TICKS = 30;

function simulate(arrivalRate: number, processingRatePerWorker: number, workers: number) {
  const totalCapacity = workers * processingRatePerWorker;
  const series: number[] = [];
  let queueDepth = 0;
  for (let t = 0; t < TICKS; t++) {
    queueDepth = Math.max(0, queueDepth + arrivalRate - totalCapacity);
    series.push(queueDepth);
  }
  const peak = Math.max(...series);
  const stable = totalCapacity >= arrivalRate;
  const utilization = (arrivalRate / totalCapacity) * 100;
  return { series, totalCapacity, peak, stable, utilization };
}

export default function QueueCapacityPlanner() {
  const [arrivalRate, setArrivalRate] = useState(20);
  const [processingRate, setProcessingRate] = useState(5);
  const [workers, setWorkers] = useState(3);

  const sim = useMemo(() => simulate(arrivalRate, processingRate, workers), [arrivalRate, processingRate, workers]);

  const accent = !sim.stable ? '#ef4444' : sim.utilization >= 80 ? '#F7933C' : '#93B96A';

  // chart geometry
  const chartW = 640;
  const chartH = 260;
  const padL = 46;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const bottomY = padT + plotH;
  const maxVal = Math.max(sim.peak * 1.15, 5);

  const points = sim.series.map((depth, i) => {
    const x = padL + (i / (TICKS - 1)) * plotW;
    const y = bottomY - (depth / maxVal) * plotH;
    return { x, y, depth };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)},${bottomY} L ${points[0].x.toFixed(2)},${bottomY} Z`;

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const tickLabels = [0, 4, 9, 14, 19, 24, 29];

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Arrival rate" value={arrivalRate} onChange={setArrivalRate} min={1} max={100} formatValue={(v) => `${v}/s`} accent="#F7933C" />
        <RangeControl label="Processing rate / worker" value={processingRate} onChange={setProcessingRate} min={1} max={50} formatValue={(v) => `${v}/s`} accent="#F7933C" />
        <RangeControl label="Number of workers" value={workers} onChange={setWorkers} min={1} max={20} accent="#F7933C" />
      </div>

      <div
        style={{
          fontSize: '.8rem',
          fontWeight: 700,
          color: 'var(--k-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          fontFamily: "'Poppins', sans-serif",
          marginBottom: '.5rem',
        }}
      >
        Queue depth over 30 seconds
      </div>

      <VisualizationContainer minHeight={240}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
          role="img"
          aria-label={`Queue depth across 30 seconds, peaking at ${sim.peak} requests waiting${sim.stable ? ' before draining back down' : ' and still climbing'}`}
        >
          <defs>
            <linearGradient id="queueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridSteps.map((g) => {
            const y = bottomY - g * plotH;
            const val = Math.round(g * maxVal);
            return (
              <g key={g}>
                <line x1={padL} x2={chartW - padR} y1={y} y2={y} stroke="var(--k-border)" strokeWidth={1} />
                <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--k-text-muted)" fontFamily="'Mulish', sans-serif">
                  {val}
                </text>
              </g>
            );
          })}

          {/* zero-depth baseline, dashed to mark "queue empty" */}
          <line x1={padL} x2={chartW - padR} y1={bottomY} y2={bottomY} stroke="var(--k-text-muted)" strokeDasharray="4 4" strokeWidth={1.25} />

          <path d={areaPath} fill="url(#queueFill)" />
          <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={accent} />
          ))}

          {tickLabels.map((i) => (
            <text key={i} x={points[i].x} y={chartH - 10} textAnchor="middle" fontSize="10" fill="var(--k-text-muted)" fontFamily="'Mulish', sans-serif">
              {i + 1}s
            </text>
          ))}

          {!sim.stable && (
            <text x={points[points.length - 1].x - 6} y={points[points.length - 1].y - 10} textAnchor="end" fontSize="11" fontWeight={700} fill={accent} fontFamily="'Poppins', sans-serif">
              still climbing ↑
            </text>
          )}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Peak queue depth" value={`${sim.peak}`} color={accent} sublabel="requests waiting, worst tick" />
        <Metric
          label="Stable?"
          value={sim.stable ? 'Yes' : 'No — growing'}
          color={sim.stable ? '#22c55e' : '#ef4444'}
          sublabel={`${sim.totalCapacity}/s capacity vs ${arrivalRate}/s arrivals`}
        />
        <Metric label="Utilization" value={`${sim.utilization.toFixed(0)}%`} color={accent} sublabel="of total processing capacity" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {!sim.stable ? (
          <Warning level="danger" title="Your queue will grow forever at this rate — you need more capacity, not more queue">
            Workers can only clear {sim.totalCapacity} requests/sec, but {arrivalRate}/sec keep arriving. Every second the backlog grows by{' '}
            {arrivalRate - sim.totalCapacity}, forever — a bigger queue just delays the crash, it doesn't prevent it.
          </Warning>
        ) : sim.utilization >= 80 ? (
          <Warning level="warn" title="Close to saturation — a spike will start piling up fast">
            You're running at {sim.utilization.toFixed(0)}% of capacity. The queue drains at this steady rate, but there's little headroom left for
            a burst before depth starts climbing.
          </Warning>
        ) : (
          <Warning level="good" title="Comfortably stable — capacity clears the queue with room to spare">
            Workers process {sim.totalCapacity} requests/sec against {arrivalRate}/sec arriving, so the queue never builds up under steady load.
          </Warning>
        )}
      </div>
    </div>
  );
}
