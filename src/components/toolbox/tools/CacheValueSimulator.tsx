import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const TOTAL_REQUESTS = 400;

function seededRandom(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function zipfKey(i: number, cardinality: number): number {
  // 20% of keys receive ~80% of traffic
  const r = seededRandom(i * 7 + 3);
  if (r < 0.8) {
    return Math.floor(seededRandom(i * 13 + 1) * Math.max(1, Math.floor(cardinality * 0.2)));
  }
  return Math.floor(seededRandom(i * 17 + 5) * cardinality);
}

function simulate(ttl: number, cacheSize: number, cardinality: number, skewed: boolean) {
  const cache = new Map<number, { insertedAt: number; lastUsed: number }>();
  const hitPoints: number[] = [];
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  let staleTotal = 0;
  const bucketSize = Math.ceil(TOTAL_REQUESTS / 40);

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const key = skewed ? zipfKey(i, cardinality) : Math.floor(seededRandom(i * 11 + 2) * cardinality);
    const entry = cache.get(key);
    const isHit = entry !== undefined && i - entry.insertedAt < ttl;

    if (isHit) {
      hits++;
      staleTotal += i - entry!.insertedAt;
      entry!.lastUsed = i;
    } else {
      misses++;
      if (cache.size >= cacheSize && !cache.has(key)) {
        let oldestKey = -1;
        let oldestUsed = Infinity;
        for (const [k, v] of cache) {
          if (v.lastUsed < oldestUsed) { oldestUsed = v.lastUsed; oldestKey = k; }
        }
        if (oldestKey !== -1) { cache.delete(oldestKey); evictions++; }
      }
      cache.set(key, { insertedAt: i, lastUsed: i });
    }

    if ((i + 1) % bucketSize === 0 || i === TOTAL_REQUESTS - 1) {
      hitPoints.push(hits / (i + 1));
    }
  }

  return {
    hitRate: hits / TOTAL_REQUESTS,
    avgStaleness: hits > 0 ? staleTotal / hits : 0,
    evictions,
    hitPoints,
  };
}

export default function CacheValueSimulator() {
  const [ttl, setTtl] = useState(30);
  const [cacheSize, setCacheSize] = useState(50);
  const [cardinality, setCardinality] = useState(200);
  const [skewed, setSkewed] = useState(true);

  const result = useMemo(() => simulate(ttl, cacheSize, cardinality, skewed), [ttl, cacheSize, cardinality, skewed]);

  const chartW = 600;
  const chartH = 160;
  const points = result.hitPoints
    .map((v, i) => `${(i / (result.hitPoints.length - 1)) * chartW},${chartH - v * chartH}`)
    .join(' ');

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl label="Cache TTL" value={ttl} onChange={setTtl} min={1} max={200} formatValue={(v) => `${v}s`} accent="#5CCFAF" />
        <RangeControl label="Cache size" value={cacheSize} onChange={setCacheSize} min={5} max={300} step={5} formatValue={(v) => `${v} items`} accent="#5CCFAF" />
        <RangeControl label="Unique keys requested" value={cardinality} onChange={setCardinality} min={10} max={500} step={10} accent="#5CCFAF" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginBottom: '1.5rem' }}>
        <input type="checkbox" checked={skewed} onChange={(e) => setSkewed(e.target.checked)} style={{ accentColor: '#5CCFAF', width: '16px', height: '16px' }} />
        Realistic traffic (20% of keys get 80% of requests) — off means uniformly random
      </label>

      <VisualizationContainer minHeight={200}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }} role="img" aria-label="Cache hit rate over the course of the simulated traffic">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={chartW} y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke="var(--k-border)" strokeDasharray="3 3" strokeWidth={1} />
          ))}
          <polyline points={points} fill="none" stroke="#5CCFAF" strokeWidth={2.5} />
          <text x={4} y={12} fontSize="9" fill="var(--k-text-muted)">100% hit rate</text>
          <text x={4} y={chartH - 4} fontSize="9" fill="var(--k-text-muted)">0%</text>
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Overall hit rate" value={`${(result.hitRate * 100).toFixed(1)}%`} color={result.hitRate > 0.7 ? '#22c55e' : result.hitRate > 0.4 ? '#F7933C' : '#ef4444'} />
        <Metric label="Avg. staleness on hit" value={`${result.avgStaleness.toFixed(1)}s`} sublabel="how old the served value was" />
        <Metric label="Evictions" value={String(result.evictions)} sublabel="items removed for space" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {result.hitRate < 0.4 && (
          <Warning level="warn" title="Low hit rate — this cache isn't earning its keep">
            Either the cache is too small for how many unique keys are requested, or the TTL expires values before they get reused. Try raising cache size or TTL.
          </Warning>
        )}
        {result.hitRate >= 0.4 && result.avgStaleness > ttl * 0.7 && (
          <Warning level="warn" title="Values served are often nearly stale">
            Hits are common, but data being served is frequently close to its TTL expiry — consider a shorter TTL if freshness matters more than hit rate here.
          </Warning>
        )}
        {result.hitRate >= 0.7 && (
          <Warning level="good" title="Healthy hit rate for this workload" />
        )}
      </div>
    </div>
  );
}
