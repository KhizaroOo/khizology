import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import InputField from '../shared/InputField';
import { useLocalPref } from '../shared/useLocalPref';
import { clamp, formatNumber, safeDiv, safeNumber } from '../shared/mathHelpers';

type Level = 'info' | 'warn' | 'danger' | 'good';
type FindingKind = 'validity' | 'size' | 'depth' | 'casing' | 'nulls' | 'dates' | 'shapes';
type TargetContext = 'web' | 'mobile' | 'internal';

interface Finding {
  level: Level;
  kind: FindingKind;
  title: string;
  detail: string;
}

interface KeyShare {
  key: string;
  bytes: number;
  pct: number;
}

const EXAMPLE = `{
  "user_id": 42,
  "userName": "khizooo",
  "email": null,
  "createdAt": "2024-01-15T10:00:00Z",
  "signupDate": "03/04/2024",
  "bio": "Long-time backend engineer, loves distributed systems and terrible puns about latency.",
  "items": [
    { "id": 1, "title": "First" },
    { "id": 2, "name": "Second" }
  ]
}`;

const CONTEXT_META: Record<TargetContext, { label: string; thresholdBytes: number; slowContext: string }> = {
  web: {
    label: 'Web',
    thresholdBytes: 100_000,
    slowContext: 'slow connections and low-end devices',
  },
  mobile: {
    label: 'Mobile',
    thresholdBytes: 50_000,
    slowContext: 'mobile data connections and battery-constrained devices',
  },
  internal: {
    label: 'Internal API',
    thresholdBytes: 300_000,
    slowContext: 'internal service-to-service calls — internal networks usually have more headroom, but very large payloads still add latency and memory pressure',
  },
};

const CONTEXT_PRESETS: { label: string; values: TargetContext }[] = [
  { label: 'Web', values: 'web' },
  { label: 'Mobile', values: 'mobile' },
  { label: 'Internal API', values: 'internal' },
];

const TIPS: Record<FindingKind, string> = {
  validity: 'Check for trailing commas, unquoted keys, single quotes, or a stray comment — none of those are valid JSON.',
  size: 'Trim unused fields, paginate large lists, or split the response into a summary endpoint and a details endpoint.',
  depth: 'Flatten nested wrapper objects, or reference related data by id instead of embedding it inline.',
  casing: 'Pick one convention (camelCase is the most common for JSON APIs) and normalize every key to it.',
  nulls: 'Decide whether "null" and "missing" mean the same thing to your consumers, and document that choice.',
  dates: 'Switch to ISO 8601 (YYYY-MM-DD, or a full timestamp) so every consumer parses the same value the same way.',
  shapes: "Give every item in the array the same keys, using null for values that don't apply to a given item.",
};

const ISSUE_PRIORITY: FindingKind[] = ['validity', 'size', 'depth', 'casing', 'dates', 'shapes', 'nulls'];

const MAX_BARS = 8;

function detectCasing(key: string): string | null {
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(key)) return 'snake_case';
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(key)) return 'camelCase';
  if (/^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(key)) return 'PascalCase';
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(key)) return 'kebab-case';
  return null;
}

function collectKeys(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((v) => collectKeys(v, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      collectKeys(v, out);
    }
  }
  return out;
}

function maxDepth(value: unknown, depth = 0): number {
  if (Array.isArray(value)) {
    return value.length === 0 ? depth : Math.max(...value.map((v) => maxDepth(v, depth + 1)));
  }
  if (value && typeof value === 'object') {
    const vals = Object.values(value);
    return vals.length === 0 ? depth : Math.max(...vals.map((v) => maxDepth(v, depth + 1)));
  }
  return depth;
}

function findAmbiguousDates(value: unknown, path: string, out: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => findAmbiguousDates(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      findAmbiguousDates(v, path ? `${path}.${k}` : k, out);
    }
  } else if (typeof value === 'string' && /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value)) {
    out.push(`${path}: "${value}"`);
  }
}

function checkArrayShapeConsistency(value: unknown, path: string, out: string[]): void {
  if (Array.isArray(value)) {
    const objectItems = value.filter((v) => v && typeof v === 'object' && !Array.isArray(v));
    if (objectItems.length > 1) {
      const shapes = objectItems.map((o) => Object.keys(o as object).sort().join(','));
      const uniqueShapes = new Set(shapes);
      if (uniqueShapes.size > 1) {
        out.push(`${path || 'root array'}: items have ${uniqueShapes.size} different key sets`);
      }
    }
    value.forEach((v, i) => checkArrayShapeConsistency(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      checkArrayShapeConsistency(v, path ? `${path}.${k}` : k, out);
    }
  }
}

/** Formats a byte count as B / KB / MB / GB, using formatNumber so it never prints NaN. */
function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${formatNumber(bytes, 0)} B`;
  if (bytes < 1024 ** 2) return `${formatNumber(bytes / 1024, decimals)} KB`;
  if (bytes < 1024 ** 3) return `${formatNumber(bytes / 1024 ** 2, decimals)} MB`;
  return `${formatNumber(bytes / 1024 ** 3, decimals)} GB`;
}

/** Honest, simple heuristic: JSON typically gzips to roughly 25%-40% of its raw size. Not exact — real gzip size depends on server config. */
function estimateGzipRange(bytes: number): { low: number; high: number } {
  if (!Number.isFinite(bytes) || bytes <= 0) return { low: 0, high: 0 };
  return { low: bytes * 0.25, high: bytes * 0.4 };
}

/** Approximates each top-level key's share of the payload by comparing stringified byte lengths. Only meaningful for object payloads. */
function computeSizeBreakdown(parsed: unknown): { items: KeyShare[]; otherCount: number; otherBytes: number; totalBytes: number } {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { items: [], otherCount: 0, otherBytes: 0, totalBytes: 0 };
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) return { items: [], otherCount: 0, otherBytes: 0, totalBytes: 0 };

  const sized = entries
    .map(([key, value]) => {
      let bytes = 0;
      try {
        bytes = new Blob([JSON.stringify(value)]).size;
      } catch {
        bytes = 0;
      }
      return { key, bytes };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const totalBytes = sized.reduce((sum, s) => sum + s.bytes, 0);
  const top = sized.slice(0, MAX_BARS);
  const rest = sized.slice(MAX_BARS);
  const otherBytes = rest.reduce((sum, s) => sum + s.bytes, 0);

  const items: KeyShare[] = top.map((s) => ({ key: s.key, bytes: s.bytes, pct: safeDiv(s.bytes, totalBytes, 0) * 100 }));
  return { items, otherCount: rest.length, otherBytes, totalBytes };
}

function pickTopIssue(findings: Finding[]): Finding | null {
  const issues = findings.filter((f) => f.level === 'warn' || f.level === 'danger');
  if (issues.length === 0) return null;
  for (const kind of ISSUE_PRIORITY) {
    const match = issues.find((f) => f.kind === kind);
    if (match) return match;
  }
  return issues[0] ?? null;
}

function diagnose(raw: string, context: TargetContext): { findings: Finding[]; parsed: unknown | null; bytes: number } {
  const meta = CONTEXT_META[context];
  const bytes = new Blob([raw]).size;
  const findings: Finding[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    findings.push({
      level: 'danger',
      kind: 'validity',
      title: 'Invalid JSON',
      detail: (e as Error).message,
    });
    return { findings, parsed: null, bytes };
  }

  findings.push({ level: 'good', kind: 'validity', title: 'Valid JSON', detail: 'The payload parses without errors.' });

  // Size, relative to the selected target context's threshold
  if (bytes > meta.thresholdBytes) {
    findings.push({
      level: 'warn',
      kind: 'size',
      title: `Large payload for ${meta.label} (${formatBytes(bytes)})`,
      detail: `Payloads over ~${formatBytes(meta.thresholdBytes)} can slow down parsing on ${meta.slowContext}. Consider pagination, trimming unused fields, or splitting into a summary + detail response.`,
    });
  } else {
    findings.push({
      level: 'good',
      kind: 'size',
      title: `Payload size: ${formatBytes(bytes)}`,
      detail: `Comfortably under the ~${formatBytes(meta.thresholdBytes)} guideline for a ${meta.label} target.`,
    });
  }

  // Depth
  const depth = maxDepth(parsed);
  if (depth > 5) {
    findings.push({
      level: 'warn',
      kind: 'depth',
      title: `Deeply nested (${depth} levels)`,
      detail: 'Structures nested more than 5 levels deep are harder to consume and often signal the payload is trying to do too much. Consider flattening.',
    });
  }

  // Casing
  const keys = collectKeys(parsed);
  const casings = new Set(keys.map(detectCasing).filter(Boolean));
  if (casings.size > 1) {
    findings.push({
      level: 'warn',
      kind: 'casing',
      title: 'Inconsistent key casing',
      detail: `Found ${Array.from(casings).join(', ')} mixed in the same payload. Consumers often assume one convention — pick one (e.g. camelCase) and stick with it.`,
    });
  }

  // Null values
  const nullKeys: string[] = [];
  const findNulls = (v: unknown, path: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => findNulls(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if (val === null) nullKeys.push(path ? `${path}.${k}` : k);
        else findNulls(val, path ? `${path}.${k}` : k);
      }
    }
  };
  findNulls(parsed, '');
  if (nullKeys.length > 0) {
    findings.push({
      level: 'info',
      kind: 'nulls',
      title: `${nullKeys.length} field${nullKeys.length === 1 ? '' : 's'} explicitly null`,
      detail: `${nullKeys.slice(0, 6).join(', ')}${nullKeys.length > 6 ? ', …' : ''} — make sure your consumer distinguishes "null" from "missing" if that matters to you.`,
    });
  }

  // Ambiguous dates
  const ambiguous: string[] = [];
  findAmbiguousDates(parsed, '', ambiguous);
  if (ambiguous.length > 0) {
    findings.push({
      level: 'warn',
      kind: 'dates',
      title: `${ambiguous.length} ambiguous date-like value${ambiguous.length === 1 ? '' : 's'}`,
      detail: `${ambiguous.slice(0, 4).join(', ')}${ambiguous.length > 4 ? ', …' : ''} — formats like "03/04/2024" are read as MM/DD in the US and DD/MM almost everywhere else. Use ISO 8601 (YYYY-MM-DD) instead.`,
    });
  }

  // Array shape consistency
  const shapeIssues: string[] = [];
  checkArrayShapeConsistency(parsed, '', shapeIssues);
  if (shapeIssues.length > 0) {
    findings.push({
      level: 'warn',
      kind: 'shapes',
      title: 'Inconsistent array item shapes',
      detail: shapeIssues.slice(0, 3).join(' · '),
    });
  }

  return { findings, parsed, bytes };
}

/** Reads a File as text without ever persisting it — used for the optional .json upload. */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsText(file);
  });
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '.8rem',
  fontWeight: 700,
  color: 'var(--k-text-muted)',
  marginBottom: '.375rem',
  fontFamily: "'Poppins', sans-serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '.06em',
};

export default function ApiPayloadDoctor() {
  const [raw, setRaw] = useState('');
  const [diagnosedRaw, setDiagnosedRaw] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [targetContext, setTargetContext] = useLocalPref<TargetContext>('apiPayloadDoctorContext', 'web');
  const [estimateGzip, setEstimateGzip] = useState(false);
  const [requestsPerDayStr, setRequestsPerDayStr] = useState('');

  const meta = CONTEXT_META[targetContext];

  const result = useMemo(() => {
    if (!diagnosedRaw.trim()) return null;
    return diagnose(diagnosedRaw, targetContext);
  }, [diagnosedRaw, targetContext]);

  const run = () => {
    if (!raw.trim()) return;
    setDiagnosedRaw(raw);
  };

  const loadExample = () => {
    setRaw(EXAMPLE);
    setDiagnosedRaw(EXAMPLE);
    setFileError(null);
    setUploadedFileName(null);
  };

  const handleFile = (file: File) => {
    setFileError(null);
    readFileAsText(file)
      .then((text) => {
        setRaw(text);
        setDiagnosedRaw(text);
        setUploadedFileName(file.name);
      })
      .catch(() => {
        setFileError("Couldn't read that file — try pasting its contents instead.");
      });
  };

  const issueCount = result?.findings.filter((f) => f.level === 'warn' || f.level === 'danger').length ?? 0;
  const topIssue = result ? pickTopIssue(result.findings) : null;
  const breakdown = useMemo(() => computeSizeBreakdown(result?.parsed ?? null), [result]);
  const gzipRange = result ? estimateGzipRange(result.bytes) : { low: 0, high: 0 };
  const requestsPerDayNum = clamp(safeNumber(requestsPerDayStr, 0), 0, 1_000_000_000);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)', margin: 0 }}>
          Paste your payload
        </h2>
        <button
          onClick={loadExample}
          style={{ background: 'transparent', border: '1px solid var(--k-border)', color: 'var(--k-text-muted)', padding: '.4rem .875rem', borderRadius: '.5rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
        >
          Load example
        </button>
      </div>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste a JSON request or response body here…"
        rows={12}
        style={{
          width: '100%',
          padding: '.875rem',
          borderRadius: '.625rem',
          border: '1.5px solid var(--k-border)',
          background: 'var(--k-bg)',
          color: 'var(--k-text)',
          fontSize: '.82rem',
          fontFamily: "'Courier New', monospace",
          outline: 'none',
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button
          onClick={run}
          disabled={!raw.trim()}
          style={{
            background: raw.trim() ? '#DF78A0' : 'var(--k-border)',
            color: '#fff',
            border: 'none',
            padding: '.6rem 1.5rem',
            borderRadius: '.5rem',
            fontWeight: 700,
            fontSize: '.875rem',
            fontFamily: "'Poppins', sans-serif",
            cursor: raw.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Diagnose
        </button>
        <span style={{ fontSize: '.78rem', color: 'var(--k-text-muted)' }}>
          Target: <strong style={{ color: 'var(--k-text)' }}>{meta.label}</strong> (~{formatBytes(meta.thresholdBytes)} guideline)
        </span>
      </div>

      <AdvancedDisclosure summary="Advanced: upload a file, target context, traffic estimate">
        <div>
          <label style={labelStyle}>Load from a .json file</label>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
            style={{ fontSize: '.8rem', color: 'var(--k-text)', width: '100%' }}
          />
          {uploadedFileName && !fileError && (
            <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.35rem' }}>Loaded: {uploadedFileName}</div>
          )}
          {fileError && (
            <div style={{ fontSize: '.72rem', color: '#ef4444', marginTop: '.35rem' }}>{fileError}</div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Target context</label>
          <PresetBar
            presets={CONTEXT_PRESETS}
            activeLabel={meta.label}
            onSelect={(values: TargetContext) => setTargetContext(values)}
          />
        </div>

        <InputField
          label="Expected requests / day"
          type="number"
          min="0"
          value={requestsPerDayStr}
          onChange={setRequestsPerDayStr}
          placeholder="e.g. 50000"
        />

        <div>
          <label style={labelStyle}>Compression</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
            <input
              type="checkbox"
              checked={estimateGzip}
              onChange={(e) => setEstimateGzip(e.target.checked)}
              style={{ accentColor: '#DF78A0', width: '16px', height: '16px' }}
            />
            Estimate gzip size
          </label>
        </div>
      </AdvancedDisclosure>

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            {topIssue ? (
              <Insight
                what={topIssue.title}
                why={topIssue.detail}
                tip={TIPS[topIssue.kind]}
              />
            ) : (
              <Insight
                what="No major issues found"
                why={`This payload parses cleanly, keeps consistent key casing, isn't unusually deep, and stays under the ~${formatBytes(meta.thresholdBytes)} guideline for a ${meta.label} target.`}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
            <Metric label="Payload size" value={formatBytes(result.bytes)} />
            {estimateGzip && (
              <Metric
                label="Est. gzip size"
                value={`${formatBytes(gzipRange.low)}–${formatBytes(gzipRange.high)}`}
                sublabel="~25–40% of raw — estimate, not exact; real gzip size depends on server config"
              />
            )}
            <Metric
              label="Issues found"
              value={String(issueCount)}
              color={issueCount === 0 ? '#22c55e' : issueCount <= 2 ? '#F7933C' : '#ef4444'}
            />
            <Metric label="Checks run" value={String(result.findings.length)} />
            {requestsPerDayNum > 0 && (
              <Metric
                label="Daily bandwidth (est.)"
                value={formatBytes(result.bytes * requestsPerDayNum)}
                sublabel={`${formatNumber(requestsPerDayNum, 0)} req/day × ${formatBytes(result.bytes)}`}
              />
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '.85rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Size breakdown by top-level key
            </h3>
            <VisualizationContainer minHeight={breakdown.items.length ? 200 : 100}>
              {breakdown.items.length === 0 ? (
                <p style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', textAlign: 'center', margin: 0 }}>
                  {Array.isArray(result.parsed)
                    ? "Top level is an array, not an object, so there's nothing to break down by key. Inspect an individual item instead."
                    : "Top level isn't an object with keys, so there's no breakdown to show."}
                </p>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                  {breakdown.items.map((item, i) => (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text)', marginBottom: '.25rem', fontFamily: "'Mulish', sans-serif" }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.key}</span>
                        <span style={{ color: 'var(--k-text-muted)', flexShrink: 0 }}>
                          {formatNumber(item.pct, 1)}% · {formatBytes(item.bytes)}
                        </span>
                      </div>
                      <div style={{ background: 'var(--k-bg-card)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${clamp(item.pct, 0, 100)}%`,
                            height: '100%',
                            background: 'var(--k-accent)',
                            opacity: Math.max(0.35, 1 - i * 0.09),
                            transition: 'width .2s',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {breakdown.otherCount > 0 && (
                    <div style={{ fontSize: '.75rem', color: 'var(--k-text-muted)' }}>
                      + {breakdown.otherCount} more key{breakdown.otherCount === 1 ? '' : 's'} ({formatBytes(breakdown.otherBytes)}, {formatNumber(safeDiv(breakdown.otherBytes, breakdown.totalBytes, 0) * 100, 1)}%)
                    </div>
                  )}
                </div>
              )}
            </VisualizationContainer>

            {breakdown.items.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.75rem' }}>
                {breakdown.items.slice(0, 5).map((item, i) => (
                  <span
                    key={item.key}
                    style={{
                      fontSize: '.75rem',
                      fontWeight: 700,
                      color: 'var(--k-text-muted)',
                      background: 'var(--k-bg-elevated)',
                      border: '1px solid var(--k-border)',
                      borderRadius: '999px',
                      padding: '.25rem .65rem',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    #{i + 1} {item.key} · {formatBytes(item.bytes)}
                  </span>
                ))}
              </div>
            )}

            <p style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginTop: '.6rem', lineHeight: 1.5 }}>
              Estimated from each top-level value's own JSON size — structural characters like braces and commas aren't split out, so treat this as a close approximation, not an exact byte count.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
            {result.findings.map((f, i) => (
              <Warning key={i} level={f.level} title={f.title}>
                {f.detail}
              </Warning>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
