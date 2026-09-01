import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';

const EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJraGl6b29vIiwiaWF0IjoxNzA2NzAwMDAwLCJuYmYiOjE3MDY3MDAwMDAsImV4cCI6MTcwNjcwMzYwMH0.dGhpc19pc19hX2Zha2Vfc2lnbmF0dXJlX2Zvcl9kZW1v';

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return decodeURIComponent(
    atob(withPadding)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
}

interface Decoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

function decodeJwt(token: string): Decoded {
  const parts = token.trim().split('.');
  if (parts.length < 2) throw new Error('A JWT should have at least a header and payload separated by dots (header.payload.signature).');
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  return { header, payload };
}

function fmtTime(sec: number): string {
  return new Date(sec * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtDuration(seconds: number): string {
  const abs = Math.abs(seconds);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function JwtTimeMachine() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<Decoded | null>(null);

  const decode = (raw: string) => {
    try {
      setDecoded(decodeJwt(raw));
      setError(null);
    } catch (e) {
      setDecoded(null);
      setError((e as Error).message);
    }
  };

  const loadExample = () => {
    setToken(EXAMPLE);
    decode(EXAMPLE);
  };

  const timeline = useMemo(() => {
    if (!decoded) return null;
    const now = Math.floor(Date.now() / 1000);
    const { iat, nbf, exp } = decoded.payload as { iat?: number; nbf?: number; exp?: number };
    if (!exp && !nbf && !iat) return null;

    const points = [iat, nbf, exp, now].filter((v): v is number => typeof v === 'number');
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = Math.max(max - min, 1);
    const pct = (t: number) => ((t - min) / span) * 100;

    let status: 'not-yet' | 'valid' | 'expired' | 'unknown' = 'unknown';
    if (nbf && now < nbf) status = 'not-yet';
    else if (exp && now >= exp) status = 'expired';
    else if (exp || nbf) status = 'valid';

    return { now, iat, nbf, exp, pct, status };
  }, [decoded]);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)', margin: 0 }}>
          Paste a JWT
        </h2>
        <button
          onClick={loadExample}
          style={{ background: 'transparent', border: '1px solid var(--k-border)', color: 'var(--k-text-muted)', padding: '.4rem .875rem', borderRadius: '.5rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
        >
          Load example
        </button>
      </div>

      <textarea
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          if (e.target.value.trim()) decode(e.target.value);
          else { setDecoded(null); setError(null); }
        }}
        placeholder="eyJhbGciOi... . eyJzdWIiOi... . signature"
        rows={4}
        style={{
          width: '100%', padding: '.875rem', borderRadius: '.625rem', border: '1.5px solid var(--k-border)',
          background: 'var(--k-bg)', color: 'var(--k-text)', fontSize: '.78rem', fontFamily: "'Courier New', monospace",
          outline: 'none', boxSizing: 'border-box', resize: 'vertical', wordBreak: 'break-all',
        }}
      />

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <Warning level="danger" title="Couldn't decode this token">{error}</Warning>
        </div>
      )}

      {decoded && timeline && (
        <div style={{ marginTop: '1.5rem' }}>
          <VisualizationContainer minHeight={140}>
            <div style={{ width: '100%' }}>
              <div style={{ position: 'relative', height: '8px', background: 'var(--k-border)', borderRadius: '999px', marginBottom: '1.75rem' }}>
                {timeline.nbf && timeline.exp && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${timeline.pct(timeline.nbf)}%`,
                      width: `${timeline.pct(timeline.exp) - timeline.pct(timeline.nbf)}%`,
                      height: '100%',
                      background: '#22c55e',
                      borderRadius: '999px',
                    }}
                  />
                )}
                {[
                  { key: 'iat', label: 'Issued', color: '#6CA6FF' },
                  { key: 'nbf', label: 'Valid from', color: '#F7933C' },
                  { key: 'exp', label: 'Expires', color: '#ef4444' },
                  { key: 'now', label: 'Now', color: 'var(--k-text)' },
                ].map(({ key, label, color }) => {
                  const val = (timeline as Record<string, number | undefined>)[key];
                  if (typeof val !== 'number') return null;
                  return (
                    <div key={key} style={{ position: 'absolute', left: `${timeline.pct(val)}%`, top: 0, transform: 'translateX(-50%)' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, border: '2px solid var(--k-bg-card)', marginTop: '-2px' }} />
                      <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '.68rem', fontWeight: 700, color, fontFamily: "'Poppins', sans-serif" }}>
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </VisualizationContainer>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
            {timeline.iat && <Metric label="Issued at" value={fmtTime(timeline.iat)} />}
            {timeline.nbf && <Metric label="Valid from" value={fmtTime(timeline.nbf)} />}
            {timeline.exp && (
              <Metric
                label="Expires"
                value={fmtTime(timeline.exp)}
                sublabel={timeline.status === 'expired' ? `${fmtDuration(timeline.now - timeline.exp)} ago` : `in ${fmtDuration(timeline.exp - timeline.now)}`}
                color={timeline.status === 'expired' ? '#ef4444' : '#22c55e'}
              />
            )}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            {timeline.status === 'expired' && <Warning level="danger" title="This token is expired" />}
            {timeline.status === 'not-yet' && <Warning level="warn" title="This token isn't valid yet" />}
            {timeline.status === 'valid' && <Warning level="good" title="This token is currently valid" />}
            {timeline.status === 'unknown' && <Warning level="info" title="No exp/nbf claims found — this token never expires by JWT standard rules" />}
          </div>

          <details style={{ marginTop: '1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif" }}>
              Decoded header &amp; payload
            </summary>
            <pre style={{ fontSize: '.75rem', background: 'var(--k-bg)', padding: '.875rem', borderRadius: '.625rem', overflow: 'auto', marginTop: '.5rem' }}>
              {JSON.stringify(decoded.header, null, 2)}{'\n\n'}{JSON.stringify(decoded.payload, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
