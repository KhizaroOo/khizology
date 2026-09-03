import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Warning from '../shared/Warning';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import VisualizationContainer from '../shared/VisualizationContainer';
import { clamp, safeDiv } from '../shared/mathHelpers';

type Verdict = 'HIT' | 'REVALIDATE' | 'MISS';

interface DirectiveState {
  noStore: boolean;
  noCache: boolean;
  isPrivate: boolean;
  hasEtag: boolean;
  hasLastModified: boolean;
  maxAge: number;
}

interface Checkpoint {
  label: string;
  seconds: number;
}

interface CachePreset {
  maxAge: number;
  noStore: boolean;
  noCache: boolean;
  isPrivate: boolean;
  hasEtag: boolean;
  hasLastModified: boolean;
}

const CACHE_PRESETS: { label: string; values: CachePreset }[] = [
  { label: 'Static asset', values: { maxAge: 31536000, noStore: false, noCache: false, isPrivate: false, hasEtag: true, hasLastModified: false } },
  { label: 'HTML document', values: { maxAge: 30, noStore: false, noCache: true, isPrivate: false, hasEtag: true, hasLastModified: false } },
  { label: 'API response', values: { maxAge: 15, noStore: false, noCache: false, isPrivate: true, hasEtag: true, hasLastModified: false } },
  { label: 'Versioned JS bundle', values: { maxAge: 31536000, noStore: false, noCache: false, isPrivate: false, hasEtag: true, hasLastModified: false } },
  { label: 'Avatar/image', values: { maxAge: 86400, noStore: false, noCache: false, isPrivate: false, hasEtag: true, hasLastModified: false } },
];

const HEADER_LAST_MODIFIED = 'Tue, 15 Jul 2025 09:42:18 GMT';

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function classify(checkpointSeconds: number, state: DirectiveState): { verdict: Verdict; explanation: string } {
  const { noStore, noCache, hasEtag, hasLastModified, maxAge } = state;

  if (noStore) {
    return { verdict: 'MISS', explanation: 'no-store forbids caching entirely — every request goes to the server.' };
  }

  if (noCache) {
    if (hasEtag) {
      return {
        verdict: 'REVALIDATE',
        explanation: 'The browser has it cached but must ask first — sends If-None-Match, and the server can reply 304 Not Modified (cheap).',
      };
    }
    if (hasLastModified) {
      return {
        verdict: 'REVALIDATE',
        explanation: 'The browser has it cached but must ask first — sends If-Modified-Since, and the server can reply 304 Not Modified if it hasn’t changed since then.',
      };
    }
    return {
      verdict: 'REVALIDATE',
      explanation: 'The browser has it cached but must ask first — no ETag or Last-Modified to revalidate against, so a full 200 response is needed anyway.',
    };
  }

  if (checkpointSeconds < maxAge) {
    return { verdict: 'HIT', explanation: 'Still fresh — served straight from cache with no network request at all.' };
  }

  if (hasEtag) {
    return {
      verdict: 'REVALIDATE',
      explanation: 'Stale by the clock, but the ETag allows a cheap conditional check (If-None-Match → maybe 304).',
    };
  }

  if (hasLastModified) {
    return {
      verdict: 'REVALIDATE',
      explanation: 'Stale by the clock, but Last-Modified allows a cheap conditional check (If-Modified-Since → maybe 304) — weaker than an ETag since it only has 1-second resolution, but still avoids a full re-fetch when the file is unchanged.',
    };
  }

  return { verdict: 'MISS', explanation: 'Stale with no ETag or Last-Modified to check against — a full re-fetch, every byte again.' };
}

function verdictLevel(verdict: Verdict): 'good' | 'info' | 'danger' {
  if (verdict === 'HIT') return 'good';
  if (verdict === 'REVALIDATE') return 'info';
  return 'danger';
}

function verdictColor(verdict: Verdict): string {
  if (verdict === 'HIT') return '#22c55e';
  if (verdict === 'REVALIDATE') return '#6CA6FF';
  return '#ef4444';
}

function buildCacheControlHeader(state: DirectiveState): string {
  if (state.noStore) return 'no-store';
  const parts: string[] = [state.isPrivate ? 'private' : 'public'];
  if (state.noCache) parts.push('no-cache');
  parts.push(`max-age=${state.maxAge}`);
  return parts.join(', ');
}

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '.5rem',
  fontSize: '.85rem',
  fontWeight: 700,
  color: 'var(--k-text)',
  cursor: 'pointer',
  fontFamily: "'Poppins', sans-serif",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 800,
  fontSize: '.78rem',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color: 'var(--k-text-muted)',
  margin: '0 0 .75rem',
};

export default function HttpCacheLab() {
  const [maxAge, setMaxAge] = useState(300);
  const [noStore, setNoStore] = useState(false);
  const [noCache, setNoCache] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasEtag, setHasEtag] = useState(true);
  const [hasLastModified, setHasLastModified] = useState(false);
  const [timeSinceFetch, setTimeSinceFetch] = useState(150);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const clearPreset = () => setActivePreset(null);

  const state: DirectiveState = { maxAge, noStore, noCache, isPrivate, hasEtag, hasLastModified };

  const checkpoints: Checkpoint[] = useMemo(
    () => [
      { label: 'Immediately after', seconds: 1 },
      { label: 'Halfway through max-age', seconds: maxAge / 2 },
      { label: 'After max-age expires', seconds: maxAge * 1.5 },
    ],
    [maxAge]
  );

  const results = useMemo(
    () => checkpoints.map((cp) => ({ ...cp, ...classify(cp.seconds, state) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkpoints, noStore, noCache, isPrivate, hasEtag, hasLastModified, maxAge]
  );

  const headerPreview = buildCacheControlHeader(state);

  // ---- Interactive time-progression control ----
  const sliderMax = Math.max(0, maxAge * 2);
  const sliderStep = Math.max(1, Math.round(sliderMax / 300));
  const liveSeconds = clamp(timeSinceFetch, 0, sliderMax);
  const liveResult = useMemo(() => classify(liveSeconds, state), [liveSeconds, state]);
  const canRevalidate = hasEtag || hasLastModified;

  const barW = 600;
  const vizMax = Math.max(sliderMax, 1);
  const freshFrac = clamp(safeDiv(maxAge, vizMax, 0), 0, 1);
  const nowFrac = clamp(safeDiv(liveSeconds, vizMax, 0), 0, 1);
  const markerColor = verdictColor(liveResult.verdict);
  const markerLabelX = clamp(nowFrac * barW, 42, barW - 42);
  const boundaryLabelX = clamp(freshFrac * barW, 34, barW - 34);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <PresetBar<CachePreset>
        presets={CACHE_PRESETS}
        activeLabel={activePreset}
        accent="#F7933C"
        onSelect={(values, label) => {
          setMaxAge(values.maxAge);
          setNoStore(values.noStore);
          setNoCache(values.noCache);
          setIsPrivate(values.isPrivate);
          setHasEtag(values.hasEtag);
          setHasLastModified(values.hasLastModified);
          setTimeSinceFetch(Math.max(1, Math.round(values.maxAge / 2)));
          setActivePreset(label);
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl
          label="max-age"
          value={maxAge}
          onChange={(v) => { setMaxAge(v); clearPreset(); }}
          min={0}
          max={86400}
          step={60}
          formatValue={formatDuration}
          accent="#F7933C"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.6rem', alignContent: 'center' }}>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={noStore} onChange={(e) => { setNoStore(e.target.checked); clearPreset(); }} />
            no-store
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={noCache} onChange={(e) => { setNoCache(e.target.checked); clearPreset(); }} />
            no-cache
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); clearPreset(); }} />
            private
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={hasEtag} onChange={(e) => { setHasEtag(e.target.checked); clearPreset(); }} />
            has ETag
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={hasLastModified} onChange={(e) => { setHasLastModified(e.target.checked); clearPreset(); }} />
            has Last-Modified
          </label>
        </div>
      </div>

      <div
        style={{
          background: 'var(--k-bg)',
          border: '1px solid var(--k-border)',
          borderRadius: '.75rem',
          padding: '1rem 1.125rem',
          marginBottom: '1.5rem',
          fontFamily: "'Consolas', 'Menlo', monospace",
          fontSize: '.82rem',
          lineHeight: 1.7,
          color: 'var(--k-text)',
          overflowX: 'auto',
        }}
      >
        <div style={{ color: 'var(--k-text-muted)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem', fontFamily: "'Poppins', sans-serif" }}>
          Response headers
        </div>
        <div>
          <span style={{ color: 'var(--k-text-muted)' }}>Cache-Control: </span>
          {headerPreview}
        </div>
        {hasEtag && (
          <div>
            <span style={{ color: 'var(--k-text-muted)' }}>ETag: </span>
            "a1b2c3-etag"
          </div>
        )}
        {hasLastModified && (
          <div>
            <span style={{ color: 'var(--k-text-muted)' }}>Last-Modified: </span>
            {HEADER_LAST_MODIFIED}
          </div>
        )}
      </div>

      {/* ---- Interactive time-progression ---- */}
      <h3 style={sectionHeadingStyle}>Live: what happens right now</h3>
      <div style={{ marginBottom: '1rem' }}>
        <RangeControl
          label="Time since first fetch"
          value={liveSeconds}
          onChange={setTimeSinceFetch}
          min={0}
          max={sliderMax}
          step={sliderStep}
          formatValue={formatDuration}
          accent={markerColor}
        />
      </div>

      <VisualizationContainer minHeight={150}>
        <svg
          viewBox={`0 0 ${barW} 116`}
          style={{ width: '100%', maxWidth: `${barW}px`, height: 'auto' }}
          role="img"
          aria-label={`Timeline from 0 to ${formatDuration(vizMax)}. Fresh until max-age at ${formatDuration(maxAge)}, then stale. Marker at ${formatDuration(liveSeconds)} shows verdict ${liveResult.verdict}.`}
        >
          <text x={boundaryLabelX} y={12} textAnchor="middle" fontSize="9" fill="var(--k-text-muted)">
            max-age ({formatDuration(maxAge)})
          </text>

          <rect x={0} y={20} width={freshFrac * barW} height={36} fill="color-mix(in srgb, #22c55e 16%, transparent)" />
          <rect
            x={freshFrac * barW}
            y={20}
            width={(1 - freshFrac) * barW}
            height={36}
            fill={canRevalidate ? 'color-mix(in srgb, #6CA6FF 16%, transparent)' : 'color-mix(in srgb, #ef4444 16%, transparent)'}
          />
          <line x1={freshFrac * barW} x2={freshFrac * barW} y1={16} y2={60} stroke="var(--k-text-muted)" strokeDasharray="4 4" strokeWidth={1.25} />

          <text x={6} y={42} fontSize="11" fontWeight="700" fill="#22c55e">FRESH</text>
          <text x={barW - 6} y={42} textAnchor="end" fontSize="11" fontWeight="700" fill={canRevalidate ? '#6CA6FF' : '#ef4444'}>
            {canRevalidate ? 'STALE — REVALIDATE' : 'STALE — MISS'}
          </text>

          <circle cx={2} cy={38} r={4} fill="var(--k-text-muted)" />
          <text x={2} y={72} fontSize="9" fill="var(--k-text-muted)">FETCH (t=0)</text>

          <line x1={nowFrac * barW} x2={nowFrac * barW} y1={10} y2={66} stroke={markerColor} strokeWidth={2.5} />
          <circle cx={nowFrac * barW} cy={38} r={6} fill={markerColor} stroke="var(--k-bg)" strokeWidth={2} />
          <text x={markerLabelX} y={84} textAnchor="middle" fontSize="11" fontWeight="800" fill={markerColor}>
            {liveResult.verdict} · {formatDuration(liveSeconds)}
          </text>

          <text x={0} y={106} fontSize="9" fill="var(--k-text-muted)">0s</text>
          <text x={barW} y={106} textAnchor="end" fontSize="9" fill="var(--k-text-muted)">{formatDuration(vizMax)}</text>
        </svg>
      </VisualizationContainer>

      <div style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
        <Insight
          what={
            <>
              At {formatDuration(liveSeconds)} since the first fetch, a request for this resource is a{' '}
              <span style={{ color: markerColor }}>{liveResult.verdict}</span>.
            </>
          }
          why={liveResult.explanation}
          tip={
            (noStore || noCache)
              ? 'no-store and no-cache override the freshness timeline above entirely — the verdict stays the same no matter where you drag the slider.'
              : `Drag past max-age (${formatDuration(maxAge)}) to see it flip from HIT to ${canRevalidate ? 'REVALIDATE' : 'MISS'}, or toggle ETag/Last-Modified to see which validator saves a full re-fetch.`
          }
        />
      </div>

      <h3 style={sectionHeadingStyle}>Quick reference — three fixed points in time</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {results.map((r) => (
          <Warning
            key={r.label}
            level={verdictLevel(r.verdict)}
            title={`${r.label} (${formatDuration(r.seconds)}): ${r.verdict}`}
          >
            {r.explanation}
          </Warning>
        ))}
      </div>

      {isPrivate && !noStore && (
        <div style={{ marginTop: '.75rem' }}>
          <Warning level="info" title="Shared caches are shut out">
            Cache-Control: private means only the individual browser may cache this response. CDNs, corporate
            proxies, and any other shared cache must not store a copy — every other visitor still hits your server.
          </Warning>
        </div>
      )}
    </div>
  );
}
