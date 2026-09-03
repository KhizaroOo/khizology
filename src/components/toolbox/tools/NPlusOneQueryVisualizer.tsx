import { useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { clamp, formatNumber } from '../shared/mathHelpers';

const MAX_N = 60;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;

export default function NPlusOneQueryVisualizer() {
  const [n, setN] = useState(12);
  const [eager, setEager] = useState(false);
  const [roundTripMs, setRoundTripMs] = useState(5);
  const [pageSizeRaw, setPageSizeRaw] = useState(12);
  const [pageSizeLinked, setPageSizeLinked] = useState(true);

  // Page size follows N until the user drags it independently.
  const pageSize = pageSizeLinked ? clamp(n, MIN_PAGE_SIZE, MAX_PAGE_SIZE) : pageSizeRaw;

  const withoutEager = n + 1;
  const withEager = 2;
  const current = eager ? withEager : withoutEager;
  const reduction = withoutEager > 0 ? ((withoutEager - withEager) / withoutEager) * 100 : 0;

  // N+1 queries run one at a time, each waiting on the last round trip.
  // Eager loading is still sequential, just two round trips instead of N+1.
  const latencyWithoutEager = withoutEager * roundTripMs;
  const latencyWithEager = withEager * roundTripMs;
  const currentLatency = eager ? latencyWithEager : latencyWithoutEager;
  const latencySaved = latencyWithoutEager - latencyWithEager;

  // Simplified pagination framing: the N+1/eager math above already models
  // exactly one page. When the page is smaller than the full N being
  // simulated, surface what a real page load would actually cost.
  const pageQueries = pageSize + 1;
  const isPaginated = pageSize < n;

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

      <AdvancedDisclosure summary="Latency & pagination">
        <RangeControl
          label="DB round-trip latency"
          value={roundTripMs}
          onChange={setRoundTripMs}
          min={1}
          max={50}
          step={1}
          formatValue={(v) => `${v}ms`}
          accent="#6CA6FF"
        />
        <div>
          <RangeControl
            label="Page size (records per page)"
            value={pageSize}
            onChange={(v) => { setPageSizeRaw(v); setPageSizeLinked(false); }}
            min={MIN_PAGE_SIZE}
            max={MAX_PAGE_SIZE}
            step={1}
            formatValue={(v) => `${v} / page`}
            accent="#DF78A0"
          />
          <div style={{ marginTop: '.4rem', fontSize: '.72rem', color: 'var(--k-text-muted)' }}>
            {pageSizeLinked ? (
              'Linked to the records slider above — drag to set independently.'
            ) : (
              <>
                Set independently.{' '}
                <button
                  type="button"
                  onClick={() => setPageSizeLinked(true)}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#DF78A0', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: '.72rem', textDecoration: 'underline' }}
                >
                  Relink to records slider
                </button>
              </>
            )}
          </div>
        </div>
      </AdvancedDisclosure>

      <VisualizationContainer minHeight={220}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Query count and estimated round-trip latency as the number of parent records grows, with and without eager loading">
          <polyline points={linePoints((x) => x + 1)} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.5} />
          <polyline points={linePoints(() => 2)} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.5} />
          <circle
            cx={((n - 1) / (MAX_N - 1)) * chartW}
            cy={chartH - (current / maxY) * chartH}
            r={5}
            fill={eager ? '#22c55e' : '#ef4444'}
          />
          <text x={4} y={12} fontSize="9" fill="var(--k-text-muted)">queries →</text>
          <text x={chartW - 4} y={12} textAnchor="end" fontSize="9" fontWeight="700" fill={eager ? '#22c55e' : '#ef4444'}>
            ≈ {formatNumber(currentLatency, 0)}ms at {roundTripMs}ms/round-trip
          </text>
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
        <Metric label="Est. latency, no eager" value={`${formatNumber(latencyWithoutEager, 0)}ms`} sublabel={`${withoutEager} × ${roundTripMs}ms, sequential`} color="#ef4444" />
        <Metric label="Est. latency, eager" value={`${formatNumber(latencyWithEager, 0)}ms`} sublabel={`${withEager} × ${roundTripMs}ms, sequential`} color="#22c55e" />
        <Metric label="Latency saved by eager loading" value={`${formatNumber(latencySaved, 0)}ms`} sublabel="at the current N and round-trip time" />
      </div>

      {isPaginated && (
        <p style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.75rem', lineHeight: 1.5 }}>
          The N+1 count above assumes fetching all {n} records at once. In a paginated list with a page size of {pageSize}, each page you actually load only costs {pageSize} + 1 = {pageQueries} queries per page you load — eager loading still flattens every page down to 2.
        </p>
      )}

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
