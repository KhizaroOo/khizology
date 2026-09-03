import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import VisualizationContainer from '../shared/VisualizationContainer';
import { safeNumber, clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

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

interface HitRatePreset {
  hitRatePct: number;
  requestsPerSec: string;
  dbLatencyMs: string;
  cacheLatencyMs: string;
}

const HIT_RATE_PRESETS: { label: string; values: HitRatePreset }[] = [
  { label: 'Cold cache', values: { hitRatePct: 15, requestsPerSec: '200', dbLatencyMs: '40', cacheLatencyMs: '2' } },
  { label: 'Typical API', values: { hitRatePct: 70, requestsPerSec: '500', dbLatencyMs: '35', cacheLatencyMs: '1.5' } },
  { label: 'Well-tuned cache', values: { hitRatePct: 96, requestsPerSec: '1200', dbLatencyMs: '60', cacheLatencyMs: '1' } },
  { label: 'Hot read path', values: { hitRatePct: 88, requestsPerSec: '4000', dbLatencyMs: '25', cacheLatencyMs: '0.8' } },
];

function formatMemory(totalKb: number): string {
  if (!Number.isFinite(totalKb) || totalKb <= 0) return '0 KB';
  if (totalKb < 1024) return `${formatNumber(totalKb, totalKb < 10 ? 2 : 0)} KB`;
  const mb = totalKb / 1024;
  if (mb < 1024) return `${formatNumber(mb, mb < 10 ? 2 : 1)} MB`;
  return `${formatNumber(mb / 1024, 2)} GB`;
}

const sectionHeadingStyle = { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--k-text)', margin: '0 0 .35rem' } as const;
const sectionSubStyle = { fontSize: '.82rem', color: 'var(--k-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 } as const;

export default function CacheValueSimulator() {
  // ---- Section 1: direct hit-rate -> DB load / latency model ----
  const [hitRatePct, setHitRatePct] = useState(70);
  const [requestsPerSec, setRequestsPerSec] = useState('500');
  const [dbLatencyMs, setDbLatencyMs] = useState('35');
  const [cacheLatencyMs, setCacheLatencyMs] = useState('1.5');
  const [itemCount, setItemCount] = useState('50000');
  const [objectSizeKb, setObjectSizeKb] = useState('2');
  const [activePreset, setActivePreset] = useState<string | null>('Typical API');

  const clearPreset = () => setActivePreset(null);

  const direct = useMemo(() => {
    const hitRate = clamp(hitRatePct, 0, 100) / 100;
    const rps = Math.max(0, safeNumber(requestsPerSec, 0));
    const dbMs = Math.max(0, safeNumber(dbLatencyMs, 0));
    const cacheMs = Math.max(0, safeNumber(cacheLatencyMs, 0));

    const dbAvoidedPerSec = rps * hitRate;
    const effectiveDbLoad = rps * (1 - hitRate);
    const avgLatency = hitRate * cacheMs + (1 - hitRate) * dbMs;
    const latencySaved = dbMs - avgLatency;
    const dailyReduction = dbAvoidedPerSec * 86400;

    const items = Math.max(0, safeNumber(itemCount, 0));
    const sizeKb = Math.max(0, safeNumber(objectSizeKb, 0));
    const memoryKb = items * sizeKb;

    return { hitRate, rps, dbMs, cacheMs, dbAvoidedPerSec, effectiveDbLoad, avgLatency, latencySaved, dailyReduction, memoryKb };
  }, [hitRatePct, requestsPerSec, dbLatencyMs, cacheLatencyMs, itemCount, objectSizeKb]);

  const curveW = 600;
  const curveH = 160;
  const curveSteps = 40;

  const curve = useMemo(() => {
    const { rps, dbMs, cacheMs } = direct;
    const maxDbLoad = Math.max(rps, 1e-9);
    const latMin = Math.min(dbMs, cacheMs);
    const latMax = Math.max(dbMs, cacheMs);
    const latSpan = latMax - latMin;

    const dbLoadFrac = (hr: number) => clamp(safeDiv(rps * (1 - hr), maxDbLoad, 0), 0, 1);
    const latencyFrac = (hr: number) => (latSpan > 1e-9 ? clamp((hr * cacheMs + (1 - hr) * dbMs - latMin) / latSpan, 0, 1) : 0.5);

    const dbLoadPts: string[] = [];
    const latencyPts: string[] = [];
    for (let s = 0; s <= curveSteps; s++) {
      const hr = s / curveSteps;
      const x = hr * curveW;
      dbLoadPts.push(`${x},${curveH - dbLoadFrac(hr) * curveH}`);
      latencyPts.push(`${x},${curveH - latencyFrac(hr) * curveH}`);
    }

    return {
      dbLoadPts: dbLoadPts.join(' '),
      latencyPts: latencyPts.join(' '),
      markerX: direct.hitRate * curveW,
      markerDbLoadY: curveH - dbLoadFrac(direct.hitRate) * curveH,
      markerLatencyY: curveH - latencyFrac(direct.hitRate) * curveH,
    };
  }, [direct]);

  // ---- Section 2: existing TTL/cache-size-driven simulation (unchanged) ----
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
      {/* ---- Section 1 ---- */}
      <h3 style={sectionHeadingStyle}>Hit rate → DB load &amp; latency</h3>
      <p style={sectionSubStyle}>
        Drag hit rate directly and see how it reshapes database pressure and response time — no cache configuration needed.
      </p>

      <PresetBar<HitRatePreset>
        presets={HIT_RATE_PRESETS}
        activeLabel={activePreset}
        accent="#F7933C"
        onSelect={(values, label) => {
          setHitRatePct(values.hitRatePct);
          setRequestsPerSec(values.requestsPerSec);
          setDbLatencyMs(values.dbLatencyMs);
          setCacheLatencyMs(values.cacheLatencyMs);
          setActivePreset(label);
        }}
      />

      <div style={{ background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '.875rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl
          label="Hit rate — % of requests served from cache"
          value={hitRatePct}
          onChange={(v) => { setHitRatePct(v); clearPreset(); }}
          min={0}
          max={100}
          step={1}
          formatValue={(v) => `${v}%`}
          accent="#F7933C"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <InputField label="Requests / sec" value={requestsPerSec} onChange={(v) => { setRequestsPerSec(v); clearPreset(); }} min="0" step="1" />
        <InputField label="DB latency" value={dbLatencyMs} onChange={(v) => { setDbLatencyMs(v); clearPreset(); }} min="0" step="0.5" suffix="ms" />
        <InputField label="Cache latency" value={cacheLatencyMs} onChange={(v) => { setCacheLatencyMs(v); clearPreset(); }} min="0" step="0.1" suffix="ms" />
      </div>

      <VisualizationContainer minHeight={210}>
        <svg
          viewBox={`0 0 ${curveW} ${curveH + 24}`}
          style={{ width: '100%', maxWidth: `${curveW}px`, height: 'auto' }}
          role="img"
          aria-label="Effective DB load and average latency as hit rate ranges from 0% to 100%, with a marker at the current hit rate"
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={curveW} y1={curveH * f} y2={curveH * f} stroke="var(--k-border)" strokeDasharray="3 3" strokeWidth={1} />
          ))}
          <polyline points={curve.dbLoadPts} fill="none" stroke="#6CA6FF" strokeWidth={2.5} />
          <polyline points={curve.latencyPts} fill="none" stroke="#F7933C" strokeWidth={2.5} />
          <line x1={curve.markerX} x2={curve.markerX} y1={0} y2={curveH} stroke="var(--k-text-muted)" strokeDasharray="4 4" strokeWidth={1} />
          <circle cx={curve.markerX} cy={curve.markerDbLoadY} r={4.5} fill="#6CA6FF" stroke="var(--k-bg)" strokeWidth={1.5} />
          <circle cx={curve.markerX} cy={curve.markerLatencyY} r={4.5} fill="#F7933C" stroke="var(--k-bg)" strokeWidth={1.5} />
          <text x={4} y={12} fontSize="9" fill="var(--k-text-muted)">High</text>
          <text x={4} y={curveH - 4} fontSize="9" fill="var(--k-text-muted)">Low</text>
          <text x={4} y={curveH + 18} fontSize="9" fill="var(--k-text-muted)">0% hit rate</text>
          <text x={curveW - 4} y={curveH + 18} textAnchor="end" fontSize="9" fill="var(--k-text-muted)">100% hit rate</text>
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#6CA6FF', borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />Effective DB load</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#F7933C', borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />Average latency</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1px dashed var(--k-text-muted)', marginRight: '.375rem', verticalAlign: 'middle' }} />Current hit rate</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Effective DB load" value={`${formatNumber(direct.effectiveDbLoad, 1)}/s`} color="#6CA6FF" />
        <Metric label="DB requests avoided" value={`${formatNumber(direct.dbAvoidedPerSec, 1)}/s`} color="#22c55e" />
        <Metric label="Average latency" value={`${formatNumber(direct.avgLatency, 1)}ms`} color="#F7933C" />
        <Metric
          label="Latency saved vs. no cache"
          value={`${direct.latencySaved >= 0 ? '' : '-'}${formatNumber(Math.abs(direct.latencySaved), 1)}ms`}
          color={direct.latencySaved >= 0 ? '#22c55e' : '#ef4444'}
        />
        <Metric label="Daily requests avoided" value={formatNumber(direct.dailyReduction, 0)} sublabel="approx., at a steady rate" />
      </div>

      <AdvancedDisclosure summary="Memory estimate">
        <InputField label="Item count" value={itemCount} onChange={setItemCount} min="0" step="100" />
        <InputField label="Avg. object size" value={objectSizeKb} onChange={setObjectSizeKb} min="0" step="0.1" suffix="KB" />
      </AdvancedDisclosure>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
        <Metric label="Estimated cache memory" value={formatMemory(direct.memoryKb)} sublabel="item count × avg. object size" />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Insight
          what={
            <>
              At a {hitRatePct}% hit rate, average latency is {formatNumber(direct.avgLatency, 1)}ms
              {direct.latencySaved >= 0
                ? ` — ${formatNumber(direct.latencySaved, 1)}ms faster than hitting the DB every time`
                : ` — ${formatNumber(Math.abs(direct.latencySaved), 1)}ms slower than the DB alone (cache is slower here)`}
              , and the database sees about {formatNumber(direct.effectiveDbLoad, 1)} req/s instead of {formatNumber(direct.rps, 1)} req/s.
            </>
          }
          why="Every cache hit skips the DB round-trip, so average latency and DB load are just a weighted blend of your cache and DB speeds — weighted by how often requests hit."
          tip="Drag hit rate toward 0% to see the worst case, or try the presets above to compare a cold cache against a well-tuned one."
        />
        <p style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', margin: '.75rem 0 0', lineHeight: 1.5 }}>
          Simplified model: assumes constant per-request latency at any load. Real systems also see queueing delay and cache-stampede effects, especially near very low hit rates.
        </p>
      </div>

      {/* ---- Section 2 ---- */}
      <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: '1.5rem' }}>
        <h3 style={sectionHeadingStyle}>Or: simulate hit rate from a cache configuration</h3>
        <p style={sectionSubStyle}>
          Instead of setting hit rate directly, derive it from TTL, cache size, and how many unique keys get requested — replayed over {TOTAL_REQUESTS} simulated requests.
        </p>

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

        <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '.75rem 0 0', lineHeight: 1.5 }}>
          Longer TTL raises hit rate but serves staler data — there's no single correct TTL, just a tradeoff to set deliberately for this data.
        </p>

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
    </div>
  );
}
