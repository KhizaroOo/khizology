import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Insight from '../shared/Insight';
import { safeNumber, clamp, formatNumber } from '../shared/mathHelpers';

const TICKS = 30;
const MAX_WORKERS_SEARCH = 200;

function simulate(
  arrivalRate: number,
  processingRatePerWorker: number,
  workers: number,
  startingQueueDepth: number = 0,
  spikeDuration: number = 0,
  spikeArrivalRate: number = arrivalRate
) {
  const totalCapacity = workers * processingRatePerWorker;
  const startDepth = Math.max(0, startingQueueDepth);
  const series: number[] = [];
  let queueDepth = startDepth;
  for (let t = 0; t < TICKS; t++) {
    const rate = t < spikeDuration ? spikeArrivalRate : arrivalRate;
    queueDepth = Math.max(0, queueDepth + rate - totalCapacity);
    series.push(queueDepth);
  }
  const seriesPeak = Math.max(...series);
  const peak = Math.max(startDepth, seriesPeak);
  const stable = totalCapacity >= arrivalRate;
  const utilization = totalCapacity > 0 ? (arrivalRate / totalCapacity) * 100 : 0;

  // first tick where depth is still climbing and capacity can't keep up (only meaningful once unstable long-term)
  let saturationTick: number | null = null;
  if (!stable) {
    let prev = startDepth;
    for (let t = 0; t < TICKS; t++) {
      const rate = t < spikeDuration ? spikeArrivalRate : arrivalRate;
      if (series[t] > prev && rate > totalCapacity) {
        saturationTick = t;
        break;
      }
      prev = series[t];
    }
  }

  // ticks from the in-window peak back down to an empty queue, if it happens within the window
  let drainTicks: number | null = null;
  if (seriesPeak > 0) {
    const peakIndex = series.indexOf(seriesPeak);
    for (let t = peakIndex; t < TICKS; t++) {
      if (series[t] === 0) {
        drainTicks = t - peakIndex;
        break;
      }
    }
  } else {
    drainTicks = 0;
  }

  return { series, totalCapacity, peak, stable, utilization, saturationTick, drainTicks };
}

/** Increasing worker counts (processing rate per worker held fixed) until the queue empties within targetTicks. */
function findMinWorkersForTarget(
  targetTicks: number,
  arrivalRate: number,
  processingRatePerWorker: number,
  startingQueueDepth: number,
  spikeDuration: number,
  spikeArrivalRate: number
): number | null {
  for (let w = 1; w <= MAX_WORKERS_SEARCH; w++) {
    const trial = simulate(arrivalRate, processingRatePerWorker, w, startingQueueDepth, spikeDuration, spikeArrivalRate);
    const clearIndex = trial.series.findIndex((depth) => depth === 0);
    if (clearIndex !== -1 && clearIndex + 1 <= targetTicks) return w;
  }
  return null;
}

interface QueuePresetValues {
  arrivalRate: number;
  processingRate: number;
  workers: number;
  startingQueueDepth: number;
  spikeDuration: number;
  spikeArrivalRate: number;
  messageSizeKb: number;
}

const PRESETS: { label: string; values: QueuePresetValues }[] = [
  { label: 'Steady load', values: { arrivalRate: 20, processingRate: 5, workers: 3, startingQueueDepth: 0, spikeDuration: 0, spikeArrivalRate: 40, messageSizeKb: 2 } },
  { label: 'Black Friday spike', values: { arrivalRate: 15, processingRate: 5, workers: 4, startingQueueDepth: 0, spikeDuration: 8, spikeArrivalRate: 60, messageSizeKb: 4 } },
  { label: 'Under-provisioned', values: { arrivalRate: 30, processingRate: 4, workers: 3, startingQueueDepth: 5, spikeDuration: 0, spikeArrivalRate: 30, messageSizeKb: 1 } },
  { label: 'Post-deploy backlog', values: { arrivalRate: 10, processingRate: 8, workers: 2, startingQueueDepth: 40, spikeDuration: 0, spikeArrivalRate: 10, messageSizeKb: 8 } },
];

export default function QueueCapacityPlanner() {
  const [arrivalRate, setArrivalRate] = useState(20);
  const [processingRate, setProcessingRate] = useState(5);
  const [workers, setWorkers] = useState(3);
  const [startingQueueDepth, setStartingQueueDepth] = useState(0);
  const [spikeDuration, setSpikeDuration] = useState(0);
  const [spikeArrivalRate, setSpikeArrivalRate] = useState(40);
  const [messageSizeKb, setMessageSizeKb] = useState('2');
  const [targetSeconds, setTargetSeconds] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const clearPreset = () => setActivePreset(null);

  const applyPreset = (values: QueuePresetValues, label: string) => {
    setArrivalRate(values.arrivalRate);
    setProcessingRate(values.processingRate);
    setWorkers(values.workers);
    setStartingQueueDepth(values.startingQueueDepth);
    setSpikeDuration(values.spikeDuration);
    setSpikeArrivalRate(values.spikeArrivalRate);
    setMessageSizeKb(String(values.messageSizeKb));
    setActivePreset(label);
  };

  const sim = useMemo(
    () => simulate(arrivalRate, processingRate, workers, startingQueueDepth, spikeDuration, spikeArrivalRate),
    [arrivalRate, processingRate, workers, startingQueueDepth, spikeDuration, spikeArrivalRate]
  );

  const messageSizeNum = clamp(safeNumber(messageSizeKb, 0), 0, 1_000_000);
  const storageKb = sim.peak * messageSizeNum;
  const storageLabel = storageKb >= 1024 ? `${formatNumber(storageKb / 1024, 1)} MB` : `${formatNumber(storageKb, storageKb < 10 ? 1 : 0)} KB`;

  const targetTicks = targetSeconds.trim() === '' ? null : clamp(Math.round(safeNumber(targetSeconds, 0)), 1, 600);

  const reverseSolveWorkers = useMemo(() => {
    if (targetTicks === null) return null;
    return findMinWorkersForTarget(targetTicks, arrivalRate, processingRate, startingQueueDepth, spikeDuration, spikeArrivalRate);
  }, [targetTicks, arrivalRate, processingRate, startingQueueDepth, spikeDuration, spikeArrivalRate]);

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

  const spikeBoundaryX =
    spikeDuration > 0 ? padL + ((Math.min(spikeDuration, TICKS) - 1 + 0.5) / (TICKS - 1)) * plotW : null;

  const seriesPeakVal = Math.max(...sim.series);
  const peakIndex = sim.series.indexOf(seriesPeakVal);
  const showPeakMarker = seriesPeakVal > 0 && peakIndex < TICKS - 1;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
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
        Try a scenario
      </div>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyPreset} accent="#F7933C" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl
          label="Arrival rate"
          value={arrivalRate}
          onChange={(v) => { setArrivalRate(v); clearPreset(); }}
          min={1}
          max={100}
          formatValue={(v) => `${v}/s`}
          accent="#F7933C"
        />
        <RangeControl
          label="Processing rate / worker"
          value={processingRate}
          onChange={(v) => { setProcessingRate(v); clearPreset(); }}
          min={1}
          max={50}
          formatValue={(v) => `${v}/s`}
          accent="#F7933C"
        />
        <RangeControl label="Number of workers" value={workers} onChange={(v) => { setWorkers(v); clearPreset(); }} min={1} max={20} accent="#F7933C" />
      </div>

      <AdvancedDisclosure summary="Spike mode, message size & reverse-solve">
        <RangeControl
          label="Starting queue depth"
          value={startingQueueDepth}
          onChange={(v) => { setStartingQueueDepth(v); clearPreset(); }}
          min={0}
          max={200}
          formatValue={(v) => `${v}`}
          accent="#6CA6FF"
        />
        <RangeControl
          label="Spike duration (ticks)"
          value={spikeDuration}
          onChange={(v) => { setSpikeDuration(v); clearPreset(); }}
          min={0}
          max={TICKS}
          formatValue={(v) => (v === 0 ? 'off' : `${v}s`)}
          accent="#6CA6FF"
        />
        <RangeControl
          label="Spike arrival rate"
          value={spikeArrivalRate}
          onChange={(v) => { setSpikeArrivalRate(v); clearPreset(); }}
          min={1}
          max={300}
          formatValue={(v) => `${v}/s`}
          accent="#6CA6FF"
        />
        <InputField
          label="Message size"
          type="number"
          step="0.1"
          min="0"
          suffix="KB"
          value={messageSizeKb}
          onChange={(v) => { setMessageSizeKb(v); clearPreset(); }}
        />
        <div style={{ gridColumn: '1 / -1' }}>
          <InputField
            label="Target: clear the queue within"
            type="number"
            step="1"
            min="1"
            suffix="s"
            placeholder="e.g. 10"
            value={targetSeconds}
            onChange={setTargetSeconds}
          />
        </div>
        {targetTicks !== null && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Insight
              what={
                reverseSolveWorkers != null
                  ? `You'd need at least ${reverseSolveWorkers} worker${reverseSolveWorkers === 1 ? '' : 's'} to clear the queue within ${targetTicks}s.`
                  : `Even ${MAX_WORKERS_SEARCH} workers can't clear this queue within ${targetTicks}s at the current rates.`
              }
              why={
                reverseSolveWorkers != null
                  ? `At ${processingRate}/s per worker, ${reverseSolveWorkers} workers give ${reverseSolveWorkers * processingRate}/s of capacity — enough to absorb ${
                      startingQueueDepth > 0 ? `the ${startingQueueDepth}-deep starting backlog` : 'the starting state'
                    }${spikeDuration > 0 ? ' and the spike' : ''} and reach an empty queue in time. This is a simplified model — it holds processing rate per worker fixed and searches worker counts one by one.`
                  : `Even at ${MAX_WORKERS_SEARCH} workers (${MAX_WORKERS_SEARCH * processingRate}/s capacity), the backlog and arrivals outpace what ${processingRate}/s per worker can drain in ${targetTicks}s — lower the arrival rate or spike, shrink the starting backlog, or raise processing rate per worker instead.`
              }
              tip={
                reverseSolveWorkers != null && reverseSolveWorkers !== workers
                  ? `Currently set to ${workers} worker${workers === 1 ? '' : 's'} — move "Number of workers" to ${reverseSolveWorkers} to match.`
                  : undefined
              }
            />
          </div>
        )}
      </AdvancedDisclosure>

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

          {spikeBoundaryX !== null && (
            <g>
              <rect x={padL} y={padT} width={Math.max(0, spikeBoundaryX - padL)} height={plotH} fill="#6CA6FF" opacity={0.12} />
              <text x={padL + 4} y={padT + 12} fontSize="9" fontWeight={700} fill="#6CA6FF" fontFamily="'Poppins', sans-serif">
                SPIKE WINDOW
              </text>
            </g>
          )}

          <path d={areaPath} fill="url(#queueFill)" />
          <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={accent} />
          ))}

          {showPeakMarker && (
            <g>
              <circle cx={points[peakIndex].x} cy={points[peakIndex].y} r={5} fill="none" stroke={accent} strokeWidth={2} />
              <text x={points[peakIndex].x} y={points[peakIndex].y - 10} textAnchor="middle" fontSize="10" fontWeight={700} fill={accent} fontFamily="'Poppins', sans-serif">
                peak {seriesPeakVal}
              </text>
            </g>
          )}

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
        <Metric
          label="Time to saturation"
          value={sim.stable ? 'Never' : `Unstable from tick ${(sim.saturationTick ?? 0) + 1}`}
          color={sim.stable ? '#22c55e' : '#ef4444'}
          sublabel={sim.stable ? 'capacity keeps up long-term' : 'grows without bound past this point'}
        />
        <Metric
          label="Queue drain time"
          value={sim.peak <= 0 ? 'No backlog' : sim.drainTicks !== null ? `${sim.drainTicks}s` : 'Does not drain within 30s'}
          color={sim.peak <= 0 || sim.drainTicks !== null ? '#22c55e' : '#ef4444'}
          sublabel="ticks from peak back down to zero"
        />
        <Metric label="Peak storage estimate" value={storageLabel} color="#6CA6FF" sublabel={`${formatNumber(sim.peak)} msgs × ${formatNumber(messageSizeNum, 1)} KB, rough estimate`} />
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
