import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const MAX_N = 60;

export default function NPlusOneQueryVisualizer() {
  const [n, setN] = useState(12);
  const [eager, setEager] = useState(false);

  const withoutEager = n + 1;
  const withEager = 2;
  const current = eager ? withEager : withoutEager;
  const reduction = withoutEager > 0 ? ((withoutEager - withEager) / withoutEager) * 100 : 0;

  const chartW = 560;
  const chartH = 180;
  const maxY = MAX_N + 1;
  const linePoints = (fn: (x: number) => number) =>
    Array.from({ length: MAX_N }, (_, i) => i + 1)
      .map((x) => `${((x - 1) / (MAX_N - 1)) * chartW},${chartH - (fn(x) / maxY) * chartH}`)
      .join(' ');

  const dotsToShow = Math.min(current, 61);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <RangeControl label="Parent records fetched" value={n} onChange={setN} min={1} max={MAX_N} formatValue={(v) => `${v} records`} accent="#DF78A0" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginBottom: '1.5rem' }}>
        <input type="checkbox" checked={eager} onChange={(e) => setEager(e.target.checked)} style={{ accentColor: '#DF78A0', width: '16px', height: '16px' }} />
        Eager load related records (JOIN / IN-clause) instead of one query per record
      </label>

      <VisualizationContainer minHeight={220}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Query count as the number of parent records grows, with and without eager loading">
          <polyline points={linePoints((x) => x + 1)} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.5} />
          <polyline points={linePoints(() => 2)} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.5} />
          <circle
            cx={((n - 1) / (MAX_N - 1)) * chartW}
            cy={chartH - (current / maxY) * chartH}
            r={5}
            fill={eager ? '#22c55e' : '#ef4444'}
          />
          <text x={4} y={chartH - 4} fontSize="9" fill="var(--k-text-muted)">1 record</text>
          <text x={chartW - 60} y={chartH - 4} fontSize="9" fill="var(--k-text-muted)">{MAX_N} records</text>
        </svg>
      </VisualizationContainer>
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '2px', background: '#ef4444', marginRight: '.375rem', verticalAlign: 'middle' }} />Without eager loading (N+1)</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '2px', background: '#22c55e', marginRight: '.375rem', verticalAlign: 'middle' }} />With eager loading</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '1.25rem', maxWidth: '100%' }}>
        {Array.from({ length: dotsToShow }, (_, i) => (
          <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: eager ? '#22c55e' : '#ef4444', opacity: 0.85 }} />
        ))}
      </div>
      <p style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.5rem' }}>
        Every square above is one real query sent to the database for this request.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Without eager loading" value={String(withoutEager)} sublabel="queries" color="#ef4444" />
        <Metric label="With eager loading" value={String(withEager)} sublabel="queries" color="#22c55e" />
        <Metric label="Reduction" value={`${reduction.toFixed(0)}%`} sublabel="fewer round-trips" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {!eager && n >= 10 && (
          <Warning level="danger" title={`${withoutEager} queries for ${n} records — this scales linearly with every page of results`}>
            Turn on eager loading above to see the fix: one query for the parents, one more (with a JOIN or WHERE id IN (...)) for every related record at once.
          </Warning>
        )}
        {eager && (
          <Warning level="good" title="Flat query count, regardless of how many records you fetch">
            The number of queries no longer depends on N — it depends on how many distinct relations you're loading.
          </Warning>
        )}
        {!eager && n < 10 && (
          <Warning level="warn" title="Not painful yet — but it will be">
            At small N this looks harmless. Raise the slider to see why N+1 is a classic "works fine in dev, dies in production" bug.
          </Warning>
        )}
      </div>
    </div>
  );
}
