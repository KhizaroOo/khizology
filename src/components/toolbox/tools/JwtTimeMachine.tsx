import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';
import InputField from '../shared/InputField';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import { clamp, safeDiv, safeNumber, formatNumber } from '../shared/mathHelpers';

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

function base64UrlEncode(str: string): string {
  const utf8Escaped = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match: string, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return btoa(utf8Escaped).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

/** Builds a fresh demo token relative to a given "now" so the example is never stale. */
function buildExampleToken(nowSec: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = nowSec - 5400; // issued 90 minutes ago
  const payload = {
    sub: 'khizooo',
    iss: 'https://auth.khizology.dev',
    aud: 'khizology-app',
    iat,
    nbf: iat,
    exp: nowSec - 1800, // expired 30 minutes ago, by default
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.dGhpc19pc19hX2Zha2Vfc2lnbmF0dXJlX2Zvcl9kZW1v`;
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return '—';
  return new Date(sec * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const abs = Math.abs(seconds);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function toDatetimeLocal(sec: number): string {
  if (!Number.isFinite(sec)) return '';
  const d = new Date(sec * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

const TIME_PRESETS: { label: string; values: number }[] = [
  { label: 'Now', values: 0 },
  { label: '+5m', values: 300 },
  { label: '+30m', values: 1800 },
  { label: '+1h', values: 3600 },
  { label: '+1d', values: 86400 },
];

interface TimelineResult {
  iat?: number;
  nbf?: number;
  exp?: number;
  now: number;
  hasTimingClaims: boolean;
  status: 'not-yet' | 'valid' | 'expired' | 'unknown';
  pct: (t: number) => number;
  lifetimePercent?: number;
  lifetimeTotalSec?: number;
  suspiciouslyLong: boolean;
  skewSec: number;
}

interface ClaimCheck {
  label: string;
  status: 'pass' | 'fail' | 'missing';
  message: string;
}

/** Turns the computed timeline status into a plain-language What/Why/Try story. */
function describeStatus(timeline: TimelineResult, nowSec: number): { what: string; why: string; tip?: string } {
  const skewNote = timeline.skewSec > 0 ? ` (with a ${Math.round(timeline.skewSec / 60)}m clock-skew tolerance applied)` : '';

  if (timeline.status === 'expired' && timeline.exp !== undefined) {
    return {
      what: `This token expired ${fmtDuration(nowSec - timeline.exp)} ago at the simulated time.`,
      why: `Its exp claim is set to ${fmtTime(timeline.exp)}${skewNote}.`,
      tip: 'Use the custom timestamp control above to time-travel back before the expiry and see this token read as valid.',
    };
  }

  if (timeline.status === 'not-yet' && timeline.nbf !== undefined) {
    return {
      what: `This token isn't valid yet — it becomes valid in ${fmtDuration(timeline.nbf - nowSec)}.`,
      why: `Its nbf claim is set to ${fmtTime(timeline.nbf)}${skewNote}.`,
      tip: 'Fast-forward with the buttons above to see it flip to valid once nbf is reached.',
    };
  }

  if (timeline.status === 'valid') {
    let why: string;
    if (timeline.nbf !== undefined && timeline.exp !== undefined) {
      why = `The simulated time falls between its nbf (${fmtTime(timeline.nbf)}) and exp (${fmtTime(timeline.exp)}) claims${skewNote}.`;
    } else if (timeline.exp !== undefined) {
      why = `The simulated time is before its exp claim (${fmtTime(timeline.exp)})${skewNote}.`;
    } else if (timeline.nbf !== undefined) {
      why = `The simulated time is after its nbf claim (${fmtTime(timeline.nbf)})${skewNote}.`;
    } else {
      why = 'This token is valid at the simulated time.';
    }
    return {
      what: 'This token is currently valid at the simulated time.',
      why,
      tip: timeline.exp !== undefined ? 'Jump forward past the expiry above to see it flip to expired.' : undefined,
    };
  }

  return {
    what: 'No exp or nbf claims were found in this token.',
    why: 'Per the JWT spec, a token without exp or nbf never expires or activates based on time alone — validity then depends entirely on whatever logic your server layers on top.',
  };
}

export default function JwtTimeMachine() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<Decoded | null>(null);

  // One-time real-clock read at mount. From here on, time only moves via the controls below.
  const [simulatedNowSec, setSimulatedNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [activeTimeLabel, setActiveTimeLabel] = useState<string | null>(null);

  const [expectedIss, setExpectedIss] = useState('');
  const [expectedAud, setExpectedAud] = useState('');
  const [skewMinutes, setSkewMinutes] = useState('0');

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
    const now = Math.floor(Date.now() / 1000);
    const example = buildExampleToken(now);
    setToken(example);
    decode(example);
    setSimulatedNowSec(now);
    setActiveTimeLabel(null);
  };

  const handleTimePreset = (offsetSec: number, label: string) => {
    setActiveTimeLabel(label);
    if (label === 'Now') setSimulatedNowSec(Math.floor(Date.now() / 1000));
    else setSimulatedNowSec((s) => s + offsetSec);
  };

  const handleCustomTime = (value: string) => {
    const parsed = fromDatetimeLocal(value);
    if (parsed !== null) {
      setSimulatedNowSec(parsed);
      setActiveTimeLabel(null);
    }
  };

  const timeline = useMemo<TimelineResult | null>(() => {
    if (!decoded) return null;
    const payload = decoded.payload;
    const iat = typeof payload.iat === 'number' && Number.isFinite(payload.iat) ? payload.iat : undefined;
    const nbf = typeof payload.nbf === 'number' && Number.isFinite(payload.nbf) ? payload.nbf : undefined;
    const exp = typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : undefined;
    const hasTimingClaims = iat !== undefined || nbf !== undefined || exp !== undefined;

    // Clock-skew tolerance, clamped to a sane range (0–24h) so a stray input can't break the math.
    const skewSec = clamp(safeNumber(skewMinutes, 0), 0, 1440) * 60;

    let status: TimelineResult['status'] = 'unknown';
    if (nbf !== undefined && simulatedNowSec < nbf - skewSec) status = 'not-yet';
    else if (exp !== undefined && simulatedNowSec >= exp + skewSec) status = 'expired';
    else if (exp !== undefined || nbf !== undefined) status = 'valid';

    const points = [iat, nbf, exp, simulatedNowSec].filter((v): v is number => typeof v === 'number');
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = Math.max(max - min, 1);
    const pct = (t: number) => clamp(((t - min) / span) * 100, 0, 100);

    const lifetimeStart = iat ?? nbf;
    let lifetimePercent: number | undefined;
    let lifetimeTotalSec: number | undefined;
    if (lifetimeStart !== undefined && exp !== undefined && exp > lifetimeStart) {
      lifetimeTotalSec = exp - lifetimeStart;
      lifetimePercent = clamp(safeDiv(simulatedNowSec - lifetimeStart, lifetimeTotalSec, 0) * 100, 0, 100);
    }

    const suspiciouslyLong = lifetimeTotalSec !== undefined && lifetimeTotalSec > 30 * 86400;

    return { iat, nbf, exp, now: simulatedNowSec, hasTimingClaims, status, pct, lifetimePercent, lifetimeTotalSec, suspiciouslyLong, skewSec };
  }, [decoded, simulatedNowSec, skewMinutes]);

  const claimChecks = useMemo<ClaimCheck[] | null>(() => {
    if (!decoded) return null;
    const payload = decoded.payload;
    const checks: ClaimCheck[] = [];

    const issExpected = expectedIss.trim();
    if (issExpected) {
      if (payload.iss === undefined) {
        checks.push({ label: 'Issuer (iss)', status: 'missing', message: 'This token has no iss claim to check against.' });
      } else {
        const actual = String(payload.iss);
        checks.push(
          actual === issExpected
            ? { label: 'Issuer (iss)', status: 'pass', message: `Matches the expected issuer "${issExpected}".` }
            : { label: 'Issuer (iss)', status: 'fail', message: `Token iss is "${actual}", expected "${issExpected}".` }
        );
      }
    }

    const audExpected = expectedAud.trim();
    if (audExpected) {
      if (payload.aud === undefined) {
        checks.push({ label: 'Audience (aud)', status: 'missing', message: 'This token has no aud claim to check against.' });
      } else {
        const audList = Array.isArray(payload.aud) ? payload.aud.map((a) => String(a)) : [String(payload.aud)];
        checks.push(
          audList.includes(audExpected)
            ? { label: 'Audience (aud)', status: 'pass', message: `Matches the expected audience "${audExpected}".` }
            : { label: 'Audience (aud)', status: 'fail', message: `Token aud is ${audList.map((a) => `"${a}"`).join(', ')}, expected "${audExpected}".` }
        );
      }
    }

    return checks;
  }, [decoded, expectedIss, expectedAud]);

  const insight = timeline ? describeStatus(timeline, simulatedNowSec) : null;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.375rem', flexWrap: 'wrap', gap: '.5rem' }}>
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

      <p style={{ fontFamily: "'Mulish', sans-serif", fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '0 0 .75rem' }}>
        Decodes claims and timing only — this never checks or requires a signature.
      </p>

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--k-text-muted)', margin: 0 }}>
              Time machine — simulated &quot;now&quot;
            </h3>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '.92rem', color: 'var(--k-text)' }}>
              {fmtTime(simulatedNowSec)}
            </span>
          </div>

          <PresetBar presets={TIME_PRESETS} activeLabel={activeTimeLabel} onSelect={handleTimePreset} accent="#6CA6FF" />

          <div style={{ maxWidth: '260px', marginBottom: '1.25rem' }}>
            <InputField label="Jump to a specific time" type="datetime-local" value={toDatetimeLocal(simulatedNowSec)} onChange={handleCustomTime} />
          </div>

          <AdvancedDisclosure summary="Advanced: issuer, audience &amp; clock skew">
            <InputField label="Expected issuer (iss)" type="text" value={expectedIss} onChange={setExpectedIss} placeholder="https://auth.example.com" />
            <InputField label="Expected audience (aud)" type="text" value={expectedAud} onChange={setExpectedAud} placeholder="my-api" />
            <InputField label="Clock-skew tolerance" type="number" min="0" step="1" value={skewMinutes} onChange={setSkewMinutes} suffix="min" />
          </AdvancedDisclosure>

          {timeline.hasTimingClaims && (
            <>
              <VisualizationContainer minHeight={140}>
                <div style={{ width: '100%' }}>
                  <div style={{ position: 'relative', height: '8px', background: 'var(--k-border)', borderRadius: '999px', marginBottom: '1.75rem' }}>
                    {timeline.nbf !== undefined && timeline.exp !== undefined && (
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
                      const val = (timeline as unknown as Record<string, number | undefined>)[key];
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
                {timeline.iat !== undefined && <Metric label="Issued at" value={fmtTime(timeline.iat)} />}
                {timeline.nbf !== undefined && <Metric label="Valid from" value={fmtTime(timeline.nbf)} />}
                {timeline.exp !== undefined && (
                  <Metric
                    label="Expires"
                    value={fmtTime(timeline.exp)}
                    sublabel={timeline.status === 'expired' ? `${fmtDuration(simulatedNowSec - timeline.exp)} ago` : `in ${fmtDuration(timeline.exp - simulatedNowSec)}`}
                    color={timeline.status === 'expired' ? '#ef4444' : '#22c55e'}
                  />
                )}
                {timeline.lifetimePercent !== undefined && (
                  <Metric
                    label="Lifetime consumed"
                    value={`${formatNumber(timeline.lifetimePercent, 0)}%`}
                    sublabel={timeline.lifetimeTotalSec !== undefined ? `of ${fmtDuration(timeline.lifetimeTotalSec)} total lifetime` : undefined}
                    color={timeline.status === 'expired' ? '#ef4444' : timeline.lifetimePercent >= 80 ? '#F7933C' : '#22c55e'}
                  />
                )}
              </div>
            </>
          )}

          {timeline.suspiciouslyLong && timeline.lifetimeTotalSec !== undefined && (
            <div style={{ marginTop: '1.25rem' }}>
              <Warning level="warn" title="Unusually long lifetime for an access token">
                This token stays valid for {fmtDuration(timeline.lifetimeTotalSec)} — that&apos;s common for refresh tokens, but unusual for a typical short-lived access token.
              </Warning>
            </div>
          )}

          {claimChecks && claimChecks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem', marginTop: '1.25rem' }}>
              {claimChecks.map((c) => (
                <Warning key={c.label} level={c.status === 'pass' ? 'good' : c.status === 'fail' ? 'danger' : 'info'} title={c.label}>
                  {c.message}
                </Warning>
              ))}
            </div>
          )}

          {insight && (
            <div style={{ marginTop: '1.25rem' }}>
              <Insight what={insight.what} why={insight.why} tip={insight.tip} />
            </div>
          )}

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
