import { useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';

type Level = 'info' | 'warn' | 'danger' | 'good';

interface Finding {
  level: Level;
  title: string;
  detail: string;
}

const EXAMPLE = `{
  "user_id": 42,
  "userName": "khizooo",
  "email": null,
  "createdAt": "2024-01-15T10:00:00Z",
  "signupDate": "03/04/2024",
  "items": [
    { "id": 1, "title": "First" },
    { "id": 2, "name": "Second" }
  ]
}`;

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

function diagnose(raw: string): { findings: Finding[]; parsed: unknown | null; bytes: number } {
  const bytes = new Blob([raw]).size;
  const findings: Finding[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    findings.push({
      level: 'danger',
      title: 'Invalid JSON',
      detail: (e as Error).message,
    });
    return { findings, parsed: null, bytes };
  }

  findings.push({ level: 'good', title: 'Valid JSON', detail: 'The payload parses without errors.' });

  // Size
  if (bytes > 100_000) {
    findings.push({ level: 'warn', title: `Large payload (${(bytes / 1024).toFixed(1)} KB)`, detail: 'Payloads over ~100KB can slow down parsing on slow connections and low-end devices. Consider pagination or trimming unused fields.' });
  } else {
    findings.push({ level: 'good', title: `Payload size: ${bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`}`, detail: 'Reasonable size.' });
  }

  // Depth
  const depth = maxDepth(parsed);
  if (depth > 5) {
    findings.push({ level: 'warn', title: `Deeply nested (${depth} levels)`, detail: 'Structures nested more than 5 levels deep are harder to consume and often signal the payload is trying to do too much. Consider flattening.' });
  }

  // Casing
  const keys = collectKeys(parsed);
  const casings = new Set(keys.map(detectCasing).filter(Boolean));
  if (casings.size > 1) {
    findings.push({
      level: 'warn',
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
      title: 'Inconsistent array item shapes',
      detail: shapeIssues.slice(0, 3).join(' · '),
    });
  }

  return { findings, parsed, bytes };
}

export default function ApiPayloadDoctor() {
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<{ findings: Finding[]; bytes: number } | null>(null);

  const run = () => {
    if (!raw.trim()) return;
    const { findings, bytes } = diagnose(raw);
    setResult({ findings, bytes });
  };

  const loadExample = () => {
    setRaw(EXAMPLE);
    const { findings, bytes } = diagnose(EXAMPLE);
    setResult({ findings, bytes });
  };

  const issueCount = result?.findings.filter((f) => f.level === 'warn' || f.level === 'danger').length ?? 0;

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
          marginTop: '1rem',
        }}
      >
        Diagnose
      </button>

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
            <Metric label="Payload size" value={result.bytes < 1024 ? `${result.bytes} B` : `${(result.bytes / 1024).toFixed(1)} KB`} />
            <Metric
              label="Issues found"
              value={String(issueCount)}
              color={issueCount === 0 ? '#22c55e' : issueCount <= 2 ? '#F7933C' : '#ef4444'}
            />
            <Metric label="Checks run" value={String(result.findings.length)} />
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
