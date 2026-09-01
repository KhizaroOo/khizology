import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';

type StepStatus = 'pass' | 'fail' | 'info' | 'skipped';

interface Step {
  status: StepStatus;
  title: string;
  detail: string;
}

const SIMPLE_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

function parseOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function splitList(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

function diagnose(input: {
  pageOrigin: string;
  requestUrl: string;
  method: string;
  contentType: string;
  customHeaders: string;
  withCredentials: boolean;
  allowOrigin: string;
  allowCredentials: boolean;
  allowMethods: string;
  allowHeaders: string;
}): { steps: Step[]; blocked: boolean } {
  const steps: Step[] = [];
  const requestOrigin = parseOrigin(input.requestUrl);
  const pageOrigin = input.pageOrigin.trim().replace(/\/$/, '');

  if (!requestOrigin) {
    return { steps: [{ status: 'fail', title: 'Invalid request URL', detail: 'Enter a full URL like https://api.example.com/data.' }], blocked: true };
  }

  if (requestOrigin === pageOrigin) {
    steps.push({ status: 'info', title: 'Same-origin request', detail: `${input.requestUrl} is on the same origin as your page. CORS doesn't apply at all — the browser never checks it.` });
    return { steps, blocked: false };
  }
  steps.push({ status: 'info', title: 'Cross-origin request detected', detail: `Your page (${pageOrigin}) is calling a different origin (${requestOrigin}), so the browser enforces CORS.` });

  const customHeaders = splitList(input.customHeaders);
  const isSimple =
    ['GET', 'HEAD', 'POST'].includes(input.method) &&
    customHeaders.length === 0 &&
    (input.method !== 'POST' || SIMPLE_CONTENT_TYPES.includes(input.contentType));

  let blocked = false;

  if (!isSimple) {
    steps.push({ status: 'info', title: 'Preflight required (OPTIONS request)', detail: `${input.method} with ${customHeaders.length ? `custom headers (${customHeaders.join(', ')})` : `content-type "${input.contentType}"`} isn't a "simple request", so the browser sends an OPTIONS preflight first.` });

    const allowMethods = splitList(input.allowMethods).map((m) => m.toUpperCase());
    if (!allowMethods.includes(input.method)) {
      steps.push({ status: 'fail', title: `Preflight fails: method not allowed`, detail: `The server's Access-Control-Allow-Methods (${input.allowMethods || 'none'}) doesn't include ${input.method}. The browser stops here — your actual request never gets sent.` });
      blocked = true;
    } else {
      steps.push({ status: 'pass', title: 'Preflight method check passes', detail: `${input.method} is in Access-Control-Allow-Methods.` });
    }

    if (!blocked && customHeaders.length > 0) {
      const allowHeaders = splitList(input.allowHeaders).map((h) => h.toLowerCase());
      const missing = customHeaders.filter((h) => !allowHeaders.includes(h.toLowerCase()));
      if (missing.length > 0) {
        steps.push({ status: 'fail', title: 'Preflight fails: header not allowed', detail: `Access-Control-Allow-Headers doesn't include: ${missing.join(', ')}. The browser stops here.` });
        blocked = true;
      } else {
        steps.push({ status: 'pass', title: 'Preflight header check passes', detail: `All custom headers (${customHeaders.join(', ')}) are allowed.` });
      }
    }
  } else {
    steps.push({ status: 'info', title: 'No preflight needed', detail: `${input.method} with a simple content-type and no custom headers qualifies as a "simple request" — the browser sends it directly.` });
  }

  if (!blocked) {
    if (!input.allowOrigin.trim()) {
      steps.push({ status: 'fail', title: 'Response is missing Access-Control-Allow-Origin', detail: 'The request completes on the wire, but the browser blocks JavaScript from reading the response.' });
      blocked = true;
    } else if (input.withCredentials && input.allowOrigin.trim() === '*') {
      steps.push({ status: 'fail', title: 'Wildcard origin cannot be used with credentials', detail: 'When withCredentials/cookies are involved, Access-Control-Allow-Origin cannot be "*" — it must echo back your exact origin.' });
      blocked = true;
    } else if (input.allowOrigin.trim() !== '*' && input.allowOrigin.trim() !== pageOrigin) {
      steps.push({ status: 'fail', title: 'Access-Control-Allow-Origin doesn\'t match your origin', detail: `Server sent "${input.allowOrigin}", but your page's origin is "${pageOrigin}".` });
      blocked = true;
    } else if (input.withCredentials && !input.allowCredentials) {
      steps.push({ status: 'fail', title: 'Missing Access-Control-Allow-Credentials: true', detail: 'Credentials were sent, but the server response doesn\'t confirm Access-Control-Allow-Credentials: true.' });
      blocked = true;
    } else {
      steps.push({ status: 'pass', title: 'Access-Control-Allow-Origin checks pass', detail: 'The browser will let your JavaScript read this response.' });
    }
  }

  return { steps, blocked };
}

export default function CorsDoctor() {
  const [pageOrigin, setPageOrigin] = useState('https://myapp.com');
  const [requestUrl, setRequestUrl] = useState('https://api.example.com/data');
  const [method, setMethod] = useState('GET');
  const [contentType, setContentType] = useState('application/json');
  const [customHeaders, setCustomHeaders] = useState('Authorization');
  const [withCredentials, setWithCredentials] = useState(false);
  const [allowOrigin, setAllowOrigin] = useState('');
  const [allowCredentials, setAllowCredentials] = useState(false);
  const [allowMethods, setAllowMethods] = useState('GET, POST');
  const [allowHeaders, setAllowHeaders] = useState('Authorization, Content-Type');

  const result = useMemo(
    () =>
      diagnose({ pageOrigin, requestUrl, method, contentType, customHeaders, withCredentials, allowOrigin, allowCredentials, allowMethods, allowHeaders }),
    [pageOrigin, requestUrl, method, contentType, customHeaders, withCredentials, allowOrigin, allowCredentials, allowMethods, allowHeaders]
  );

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.3rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.05em' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '.55rem .75rem', borderRadius: '.5rem', border: '1.5px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)', fontSize: '.85rem', fontFamily: "'Mulish', sans-serif", outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1rem' }}>
        Your request
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div><label style={labelStyle}>Your page's origin</label><input style={inputStyle} value={pageOrigin} onChange={(e) => setPageOrigin(e.target.value)} /></div>
        <div><label style={labelStyle}>Request URL</label><input style={inputStyle} value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} /></div>
        <div>
          <label style={labelStyle}>Method</label>
          <select style={inputStyle} value={method} onChange={(e) => setMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {method === 'POST' && (
          <div>
            <label style={labelStyle}>Content-Type</label>
            <select style={inputStyle} value={contentType} onChange={(e) => setContentType(e.target.value)}>
              {['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div><label style={labelStyle}>Custom headers (comma-separated)</label><input style={inputStyle} value={customHeaders} onChange={(e) => setCustomHeaders(e.target.value)} placeholder="Authorization, X-Api-Key" /></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginBottom: '1.5rem' }}>
        <input type="checkbox" checked={withCredentials} onChange={(e) => setWithCredentials(e.target.checked)} style={{ accentColor: '#DF78A0', width: '16px', height: '16px' }} />
        Sending credentials (cookies / Authorization)
      </label>

      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1rem' }}>
        What the server responded with
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div><label style={labelStyle}>Access-Control-Allow-Origin</label><input style={inputStyle} value={allowOrigin} onChange={(e) => setAllowOrigin(e.target.value)} placeholder="e.g. https://myapp.com or *" /></div>
        <div><label style={labelStyle}>Access-Control-Allow-Methods</label><input style={inputStyle} value={allowMethods} onChange={(e) => setAllowMethods(e.target.value)} /></div>
        <div><label style={labelStyle}>Access-Control-Allow-Headers</label><input style={inputStyle} value={allowHeaders} onChange={(e) => setAllowHeaders(e.target.value)} /></div>
        <div>
          <label style={labelStyle}>Access-Control-Allow-Credentials</label>
          <select style={inputStyle} value={allowCredentials ? 'true' : 'false'} onChange={(e) => setAllowCredentials(e.target.value === 'true')}>
            <option value="false">not present / false</option>
            <option value="true">true</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
        {result.steps.map((s, i) => (
          <Warning key={i} level={s.status === 'pass' ? 'good' : s.status === 'fail' ? 'danger' : 'info'} title={s.title}>
            {s.detail}
          </Warning>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <Warning level={result.blocked ? 'danger' : 'good'} title={result.blocked ? 'Blocked — your JavaScript will not be able to read this response' : 'Allowed — your JavaScript will be able to read this response'} />
      </div>

      <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
        Common misconception: CORS doesn't stop the request from reaching the server (except a failed preflight) — it stops the <em>browser from handing the response back to your JavaScript</em>. The server usually still processed it.
      </p>
    </div>
  );
}
