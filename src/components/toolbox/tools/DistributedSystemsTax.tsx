import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

export default function DistributedSystemsTax() {
  const [hops, setHops] = useState(2);
  const [latencyPerHop, setLatencyPerHop] = useState(15);
  const [failureRate, setFailureRate] = useState(0.5);

  const result = useMemo(() => {
    const addedLatency = hops * latencyPerHop;
    const combinedSuccess = Math.pow(1 - failureRate / 100, hops) * 100;
    const failureModesAdded = hops * 3; // network partition, timeout/retry config, serialization per hop
    return { addedLatency, combinedSuccess, failureModesAdded };
  }, [hops, latencyPerHop, failureRate]);

  const boxW = 90;
  const gap = 30;
  const totalW = boxW + hops * (boxW + gap);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Additional network hops" value={hops} onChange={setHops} min={1} max={5} accent="#DF78A0" />
        <RangeControl label="Latency per hop" value={latencyPerHop} onChange={setLatencyPerHop} min={1} max={150} formatValue={(v) => `${v}ms`} accent="#DF78A0" />
        <RangeControl label="Failure rate per hop" value={failureRate} onChange={setFailureRate} min={0} max={5} step={0.1} formatValue={(v) => `${v.toFixed(1)}%`} accent="#DF78A0" />
      </div>

      <VisualizationContainer minHeight={140}>
        <svg viewBox={`0 0 ${totalW} 100`} style={{ width: '100%', maxWidth: `${totalW}px`, height: 'auto' }} role="img" aria-label="A single in-process call vs the same call split across network hops">
          <defs>
            <marker id="tax-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--k-text-muted)" />
            </marker>
          </defs>
          <rect x={0} y={30} width={boxW} height={40} rx={8} fill="#22c55e" opacity={0.85} />
          <text x={boxW / 2} y={54} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">In-process</text>
          {Array.from({ length: hops }, (_, i) => {
            const x = boxW + gap + i * (boxW + gap);
            return (
              <g key={i}>
                <line x1={x - gap} x2={x} y1={50} y2={50} stroke="var(--k-text-muted)" strokeWidth={2} markerEnd="url(#tax-arrow)" />
                <rect x={x} y={30} width={boxW} height={40} rx={8} fill="#ef4444" opacity={0.85} />
                <text x={x + boxW / 2} y={48} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">Network hop {i + 1}</text>
                <text x={x + boxW / 2} y={62} textAnchor="middle" fontSize="9" fill="#fff">+{latencyPerHop}ms</text>
              </g>
            );
          })}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Added latency" value={`+${result.addedLatency}ms`} color="#ef4444" sublabel="vs. 0ms in-process" />
        <Metric label="Combined success rate" value={`${result.combinedSuccess.toFixed(2)}%`} color={result.combinedSuccess > 99 ? '#22c55e' : result.combinedSuccess > 95 ? '#F7933C' : '#ef4444'} />
        <Metric label="New failure modes" value={String(result.failureModesAdded)} sublabel="timeouts, partitions, serialization — per hop" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <Warning level={result.combinedSuccess > 99 && result.addedLatency < 50 ? 'info' : 'warn'} title="This is the tax, not a verdict">
          Every hop you add buys something — independent scaling, independent deploys, a clearer boundary — but it isn't free. {hops} hop{hops === 1 ? '' : 's'} costs you {result.addedLatency}ms and drops your success rate from 100% to {result.combinedSuccess.toFixed(2)}% before you've written a single line of business logic. Decide if what you're buying is worth that, on purpose.
        </Warning>
      </div>
    </div>
  );
}
