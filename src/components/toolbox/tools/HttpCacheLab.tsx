import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Warning from '../shared/Warning';

type Verdict = 'HIT' | 'REVALIDATE' | 'MISS';

interface DirectiveState {
  noStore: boolean;
  noCache: boolean;
  isPrivate: boolean;
  hasEtag: boolean;
  maxAge: number;
}

interface Checkpoint {
  label: string;
  seconds: number;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function classify(checkpointSeconds: number, state: DirectiveState): { verdict: Verdict; explanation: string } {
  const { noStore, noCache, hasEtag, maxAge } = state;

  if (noStore) {
    return { verdict: 'MISS', explanation: 'no-store forbids caching entirely — every request goes to the server.' };
  }

  if (noCache) {
    return {
      verdict: 'REVALIDATE',
      explanation: hasEtag
        ? 'The browser has it cached but must ask first — sends If-None-Match, and the server can reply 304 Not Modified (cheap).'
        : 'The browser has it cached but must ask first — no ETag to revalidate against, so a full 200 response is needed anyway.',
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

  return { verdict: 'MISS', explanation: 'Stale with no ETag to check against — a full re-fetch, every byte again.' };
}

function verdictLevel(verdict: Verdict): 'good' | 'info' | 'danger' {
  if (verdict === 'HIT') return 'good';
  if (verdict === 'REVALIDATE') return 'info';
  return 'danger';
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

export default function HttpCacheLab() {
  const [maxAge, setMaxAge] = useState(300);
  const [noStore, setNoStore] = useState(false);
  const [noCache, setNoCache] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasEtag, setHasEtag] = useState(true);

  const state: DirectiveState = { maxAge, noStore, noCache, isPrivate, hasEtag };

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
    [checkpoints, noStore, noCache, isPrivate, hasEtag, maxAge]
  );

  const headerPreview = buildCacheControlHeader(state);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <RangeControl
          label="max-age"
          value={maxAge}
          onChange={setMaxAge}
          min={0}
          max={86400}
          step={60}
          formatValue={formatDuration}
          accent="#F7933C"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.6rem', alignContent: 'center' }}>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={noStore} onChange={(e) => setNoStore(e.target.checked)} />
            no-store
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={noCache} onChange={(e) => setNoCache(e.target.checked)} />
            no-cache
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            private
          </label>
          <label style={checkboxLabelStyle}>
            <input type="checkbox" checked={hasEtag} onChange={(e) => setHasEtag(e.target.checked)} />
            has ETag
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
      </div>

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
