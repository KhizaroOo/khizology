import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

export default function TimeoutChainPlanner() {
  const [clientTimeout, setClientTimeout] = useState(2000);
  const [hops, setHops] = useState(3);
  const [perHopTimeout, setPerHopTimeout] = useState(500);

  const result = useMemo(() => {
    const totalChainBudget = hops * perHopTimeout;
    const margin = clientTimeout - totalChainBudget;
    const marginPct = (margin / clientTimeout) * 100;
    return { totalChainBudget, margin, marginPct };
  }, [clientTimeout, hops, perHopTimeout]);

  const chartW = 560;
  const scale = chartW / Math.max(clientTimeout, result.totalChainBudget, 1);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Client's own timeout" value={clientTimeout} onChange={setClientTimeout} min={200} max={5000} step={100} formatValue={(v) => `${v}ms`} accent="#F7933C" />
        <RangeControl label="Calls in the chain" value={hops} onChange={setHops} min={1} max={6} accent="#F7933C" />
        <RangeControl label="Timeout per call" value={perHopTimeout} onChange={setPerHopTimeout} min={50} max={2000} step={50} formatValue={(v) => `${v}ms`} accent="#F7933C" />
      </div>

      <VisualizationContainer minHeight={120}>
        <div style={{ width: '100%' }}>
          <div style={{ position: 'relative', height: '32px', background: 'var(--k-bg-card)', borderRadius: '.5rem', overflow: 'visible', display: 'flex' }}>
            {Array.from({ length: hops }, (_, i) => (
              <div
                key={i}
                style={{
                  width: `${perHopTimeout * scale}px`,
                  height: '32px',
                  background: i % 2 === 0 ? '#F7933C' : '#e0862c',
                  borderRight: '1px solid var(--k-bg-card)',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: 'relative',
              marginTop: '.5rem',
              width: `${clientTimeout * scale}px`,
              maxWidth: '100%',
            }}
          >
            <div style={{ position: 'absolute', left: `${clientTimeout * scale - 2}px`, top: '-38px', width: '2px', height: '32px', background: result.margin < 0 ? '#ef4444' : '#22c55e' }} />
            <div style={{ position: 'absolute', left: `${Math.max(0, clientTimeout * scale - 70)}px`, top: '0px', fontSize: '.7rem', fontWeight: 700, color: result.margin < 0 ? '#ef4444' : '#22c55e', fontFamily: "'Poppins', sans-serif" }}>
              client gives up: {clientTimeout}ms
            </div>
          </div>
        </div>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Total chain budget" value={`${result.totalChainBudget}ms`} />
        <Metric label="Client timeout" value={`${clientTimeout}ms`} />
        <Metric label="Margin" value={`${result.margin >= 0 ? '+' : ''}${result.margin}ms`} color={result.margin < 0 ? '#ef4444' : result.marginPct < 15 ? '#F7933C' : '#22c55e'} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {result.margin < 0 ? (
          <Warning level="danger" title="Your chain can outlive the client's patience">
            The client gives up at {clientTimeout}ms, but your own chain's timeouts allow it to keep working until {result.totalChainBudget}ms. That's wasted work at best — at worst, the client has already retried, and now two requests are running for the same thing.
          </Warning>
        ) : result.marginPct < 15 ? (
          <Warning level="warn" title="Cutting it close">
            Only {result.marginPct.toFixed(0)}% margin between when your chain gives up and when the client does. A single slow network blip could flip this — aim for 20%+ margin.
          </Warning>
        ) : (
          <Warning level="good" title={`Your chain fails ${result.marginPct.toFixed(0)}% faster than the client gives up`}>
            Healthy margin — your service has time to fail cleanly and respond before the client abandons the request.
          </Warning>
        )}
      </div>
    </div>
  );
}
