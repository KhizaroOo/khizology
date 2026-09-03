import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import VisualizationContainer from '../shared/VisualizationContainer';

type StepStatus = 'pass' | 'fail' | 'info' | 'skipped';

interface Step {
  status: StepStatus;
  title: string;
  detail: string;
  /** Only set on the step that actually failed — the concrete change that would fix it. */
  fixTip?: string;
}

interface DiagnoseResult {
  steps: Step[];
  blocked: boolean;
  invalidUrl: boolean;
  sameOrigin: boolean;
  needsPreflight: boolean;
  preflightBlocked: boolean;
  failingStep: Step | null;
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
}): DiagnoseResult {
  const steps: Step[] = [];
  const requestOrigin = parseOrigin(input.requestUrl);
  const pageOrigin = input.pageOrigin.trim().replace(/\/$/, '');

  if (!requestOrigin) {
    const step: Step = {
      status: 'fail',
      title: 'Invalid request URL',
      detail: 'Enter a full URL like https://api.example.com/data.',
      fixTip: 'Enter a full request URL including the protocol, e.g. https://api.example.com/data.',
    };
    return { steps: [step], blocked: true, invalidUrl: true, sameOrigin: false, needsPreflight: false, preflightBlocked: false, failingStep: step };
  }

  if (requestOrigin === pageOrigin) {
    steps.push({ status: 'info', title: 'Same-origin request', detail: `${input.requestUrl} is on the same origin as your page. CORS doesn't apply at all — the browser never checks it.` });
    return { steps, blocked: false, invalidUrl: false, sameOrigin: true, needsPreflight: false, preflightBlocked: false, failingStep: null };
  }
  steps.push({ status: 'info', title: 'Cross-origin request detected', detail: `Your page (${pageOrigin}) is calling a different origin (${requestOrigin}), so the browser enforces CORS.` });

  const customHeaders = splitList(input.customHeaders);
  const isSimple =
    ['GET', 'HEAD', 'POST'].includes(input.method) &&
    customHeaders.length === 0 &&
    (input.method !== 'POST' || SIMPLE_CONTENT_TYPES.includes(input.contentType));
  const needsPreflight = !isSimple;

  let blocked = false;
  let preflightBlocked = false;

  if (needsPreflight) {
    steps.push({ status: 'info', title: 'Preflight required (OPTIONS request)', detail: `${input.method} with ${customHeaders.length ? `custom headers (${customHeaders.join(', ')})` : `content-type "${input.contentType}"`} isn't a "simple request", so the browser sends an OPTIONS preflight first.` });

    const allowMethods = splitList(input.allowMethods).map((m) => m.toUpperCase());
    if (!allowMethods.includes(input.method)) {
      steps.push({
        status: 'fail',
        title: `Preflight fails: method not allowed`,
        detail: `The server's Access-Control-Allow-Methods (${input.allowMethods || 'none'}) doesn't include ${input.method}. The browser stops here — your actual request never gets sent.`,
        fixTip: `Add "${input.method}" to the server's Access-Control-Allow-Methods response header.`,
      });
      blocked = true;
      preflightBlocked = true;
    } else {
      steps.push({ status: 'pass', title: 'Preflight method check passes', detail: `${input.method} is in Access-Control-Allow-Methods.` });
    }

    if (!blocked && customHeaders.length > 0) {
      const allowHeaders = splitList(input.allowHeaders).map((h) => h.toLowerCase());
      const missing = customHeaders.filter((h) => !allowHeaders.includes(h.toLowerCase()));
      if (missing.length > 0) {
        steps.push({
          status: 'fail',
          title: 'Preflight fails: header not allowed',
          detail: `Access-Control-Allow-Headers doesn't include: ${missing.join(', ')}. The browser stops here.`,
          fixTip: `Add ${missing.join(', ')} to the server's Access-Control-Allow-Headers response header.`,
        });
        blocked = true;
        preflightBlocked = true;
      } else {
        steps.push({ status: 'pass', title: 'Preflight header check passes', detail: `All custom headers (${customHeaders.join(', ')}) are allowed.` });
      }
    }
  } else {
    steps.push({ status: 'info', title: 'No preflight needed', detail: `${input.method} with a simple content-type and no custom headers qualifies as a "simple request" — the browser sends it directly.` });
  }

  if (!blocked) {
    if (!input.allowOrigin.trim()) {
      steps.push({
        status: 'fail',
        title: 'Response is missing Access-Control-Allow-Origin',
        detail: 'The request completes on the wire, but the browser blocks JavaScript from reading the response.',
        fixTip: `Set Access-Control-Allow-Origin to "${pageOrigin}" (or "*" if you don't need credentials) on the server's response.`,
      });
      blocked = true;
    } else if (input.withCredentials && input.allowOrigin.trim() === '*') {
      steps.push({
        status: 'fail',
        title: 'Wildcard origin cannot be used with credentials',
        detail: 'When withCredentials/cookies are involved, Access-Control-Allow-Origin cannot be "*" — it must echo back your exact origin.',
        fixTip: `Change Access-Control-Allow-Origin from "*" to the exact origin "${pageOrigin}" — wildcards aren't allowed once credentials are involved.`,
      });
      blocked = true;
    } else if (input.allowOrigin.trim() !== '*' && input.allowOrigin.trim() !== pageOrigin) {
      steps.push({
        status: 'fail',
        title: 'Access-Control-Allow-Origin doesn\'t match your origin',
        detail: `Server sent "${input.allowOrigin}", but your page's origin is "${pageOrigin}".`,
        fixTip: `Change Access-Control-Allow-Origin from "${input.allowOrigin}" to "${pageOrigin}" so it matches your page's origin exactly.`,
      });
      blocked = true;
    } else if (input.withCredentials && !input.allowCredentials) {
      steps.push({
        status: 'fail',
        title: 'Missing Access-Control-Allow-Credentials: true',
        detail: 'Credentials were sent, but the server response doesn\'t confirm Access-Control-Allow-Credentials: true.',
        fixTip: 'Add the Access-Control-Allow-Credentials: true response header (in addition to a non-wildcard Access-Control-Allow-Origin).',
      });
      blocked = true;
    } else {
      steps.push({ status: 'pass', title: 'Access-Control-Allow-Origin checks pass', detail: 'The browser will let your JavaScript read this response.' });
    }
  }

  const failingStep = steps.find((s) => s.status === 'fail') ?? null;
  return { steps, blocked, invalidUrl: false, sameOrigin: false, needsPreflight, preflightBlocked, failingStep };
}

// ---- Request-flow diagram -------------------------------------------------

type FlowTone = 'neutral' | 'accent' | 'good' | 'bad';
type FlowNode = { kind: 'box'; label: string; sublabel?: string; tone: FlowTone } | { kind: 'arrow'; label?: string };

const FLOW_TONE_COLOR: Record<FlowTone, string> = { neutral: 'var(--k-text-muted)', accent: '#F7933C', good: '#22c55e', bad: '#ef4444' };

function buildFlow(result: DiagnoseResult, method: string): FlowNode[] {
  const nodes: FlowNode[] = [{ kind: 'box', label: 'Browser', sublabel: 'your page', tone: 'neutral' }];

  if (result.invalidUrl) {
    nodes.push({ kind: 'arrow' }, { kind: 'box', label: 'Blocked', sublabel: 'invalid request URL', tone: 'bad' });
    return nodes;
  }

  if (result.sameOrigin) {
    nodes.push(
      { kind: 'arrow', label: method },
      { kind: 'box', label: 'Server', sublabel: 'same origin', tone: 'neutral' },
      { kind: 'arrow', label: 'response' },
      { kind: 'box', label: 'Allowed', sublabel: 'no CORS check needed', tone: 'good' }
    );
    return nodes;
  }

  if (result.needsPreflight) {
    nodes.push(
      { kind: 'arrow', label: 'OPTIONS' },
      { kind: 'box', label: 'Server', sublabel: 'preflight check', tone: 'accent' },
      { kind: 'arrow', label: 'response' }
    );
    if (result.preflightBlocked) {
      nodes.push({ kind: 'box', label: 'Blocked', sublabel: 'preflight failed', tone: 'bad' });
      return nodes;
    }
    nodes.push({ kind: 'box', label: 'Browser', sublabel: 'preflight passed', tone: 'neutral' });
  }

  nodes.push(
    { kind: 'arrow', label: method },
    { kind: 'box', label: 'Server', sublabel: 'actual request', tone: 'neutral' },
    { kind: 'arrow', label: 'response' }
  );

  if (result.blocked) {
    nodes.push({ kind: 'box', label: 'Blocked', sublabel: 'response hidden from JS', tone: 'bad' });
  } else {
    nodes.push({ kind: 'box', label: 'Actual request sent', sublabel: 'response readable by JS', tone: 'good' });
  }
  return nodes;
}

function FlowBox({ label, sublabel, tone }: { label: string; sublabel?: string; tone: FlowTone }) {
  const color = FLOW_TONE_COLOR[tone];
  return (
    <div
      style={{
        flex: '0 0 auto',
        minWidth: '128px',
        padding: '.7rem .8rem',
        borderRadius: '.75rem',
        border: `1.5px solid ${color}`,
        background: tone === 'neutral' ? 'var(--k-bg-card)' : `color-mix(in srgb, ${color} 12%, var(--k-bg-card))`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '.78rem', color: tone === 'neutral' ? 'var(--k-text)' : color, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </div>
      {sublabel && <div style={{ fontSize: '.68rem', color: 'var(--k-text-muted)', marginTop: '.2rem', fontFamily: "'Mulish', sans-serif" }}>{sublabel}</div>}
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', padding: '0 .3rem', minWidth: '34px' }}>
      {label && <div style={{ fontSize: '.6rem', color: 'var(--k-text-muted)', whiteSpace: 'nowrap', marginBottom: '.15rem', fontFamily: "'Mulish', sans-serif" }}>{label}</div>}
      <div aria-hidden style={{ fontSize: '1.05rem', color: 'var(--k-text-muted)', lineHeight: 1 }}>→</div>
    </div>
  );
}

// ---- Presets ----------------------------------------------------------------

interface PresetValues {
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
}

const PRESETS: { label: string; values: PresetValues }[] = [
  {
    label: 'Localhost → production API',
    values: {
      pageOrigin: 'http://localhost:3000',
      requestUrl: 'https://api.myapp.com/v1/data',
      method: 'GET',
      contentType: 'application/json',
      customHeaders: '',
      withCredentials: false,
      allowOrigin: '',
      allowCredentials: false,
      allowMethods: '',
      allowHeaders: '',
    },
  },
  {
    label: 'Cookie auth',
    values: {
      pageOrigin: 'https://myapp.com',
      requestUrl: 'https://api.myapp.com/account',
      method: 'GET',
      contentType: 'application/json',
      customHeaders: '',
      withCredentials: true,
      allowOrigin: '*',
      allowCredentials: true,
      allowMethods: 'GET',
      allowHeaders: '',
    },
  },
  {
    label: 'Bearer-token request',
    values: {
      pageOrigin: 'https://myapp.com',
      requestUrl: 'https://api.myapp.com/user/profile',
      method: 'GET',
      contentType: 'application/json',
      customHeaders: 'Authorization',
      withCredentials: false,
      allowOrigin: 'https://myapp.com',
      allowCredentials: false,
      allowMethods: 'GET',
      allowHeaders: '',
    },
  },
  {
    label: 'PUT/PATCH custom headers',
    values: {
      pageOrigin: 'https://myapp.com',
      requestUrl: 'https://api.myapp.com/records/42',
      method: 'PUT',
      contentType: 'application/json',
      customHeaders: 'Content-Type, X-Api-Key',
      withCredentials: false,
      allowOrigin: 'https://myapp.com',
      allowCredentials: false,
      allowMethods: 'GET, POST',
      allowHeaders: 'Content-Type, X-Api-Key',
    },
  },
];

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
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (values: PresetValues, label: string) => {
    setPageOrigin(values.pageOrigin);
    setRequestUrl(values.requestUrl);
    setMethod(values.method);
    setContentType(values.contentType);
    setCustomHeaders(values.customHeaders);
    setWithCredentials(values.withCredentials);
    setAllowOrigin(values.allowOrigin);
    setAllowCredentials(values.allowCredentials);
    setAllowMethods(values.allowMethods);
    setAllowHeaders(values.allowHeaders);
    setActivePreset(label);
  };

  // Any manual edit invalidates the "this matches a preset" highlight.
  const setPageOriginEdit = (v: string) => { setPageOrigin(v); setActivePreset(null); };
  const setRequestUrlEdit = (v: string) => { setRequestUrl(v); setActivePreset(null); };
  const setMethodEdit = (v: string) => { setMethod(v); setActivePreset(null); };
  const setContentTypeEdit = (v: string) => { setContentType(v); setActivePreset(null); };
  const setCustomHeadersEdit = (v: string) => { setCustomHeaders(v); setActivePreset(null); };
  const setWithCredentialsEdit = (v: boolean) => { setWithCredentials(v); setActivePreset(null); };
  const setAllowOriginEdit = (v: string) => { setAllowOrigin(v); setActivePreset(null); };
  const setAllowCredentialsEdit = (v: boolean) => { setAllowCredentials(v); setActivePreset(null); };
  const setAllowMethodsEdit = (v: string) => { setAllowMethods(v); setActivePreset(null); };
  const setAllowHeadersEdit = (v: string) => { setAllowHeaders(v); setActivePreset(null); };

  const result = useMemo(
    () =>
      diagnose({ pageOrigin, requestUrl, method, contentType, customHeaders, withCredentials, allowOrigin, allowCredentials, allowMethods, allowHeaders }),
    [pageOrigin, requestUrl, method, contentType, customHeaders, withCredentials, allowOrigin, allowCredentials, allowMethods, allowHeaders]
  );

  const flow = useMemo(() => buildFlow(result, method), [result, method]);

  const what = result.invalidUrl
    ? "Blocked — the request URL can't be parsed, so the browser has nothing to compare origins against."
    : result.blocked
    ? 'Blocked — your JavaScript will not be able to read this response.'
    : 'Allowed — your JavaScript will be able to read this response.';

  const why = result.invalidUrl
    ? 'The request URL is missing a protocol or is otherwise malformed, so no origin comparison is possible.'
    : result.failingStep
    ? result.failingStep.detail
    : result.steps[result.steps.length - 1]?.detail ?? 'Every CORS check passes.';

  const tip =
    result.failingStep?.fixTip ??
    (result.sameOrigin
      ? 'No changes needed — same-origin requests bypass CORS entirely.'
      : 'No changes needed — this configuration already works as-is.');

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.3rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.05em' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '.55rem .75rem', borderRadius: '.5rem', border: '1.5px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)', fontSize: '.85rem', fontFamily: "'Mulish', sans-serif", outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <label style={labelStyle}>Try a scenario</label>
      <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={applyPreset} accent="#F7933C" />

      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--k-text)', marginTop: '.5rem', marginBottom: '1rem' }}>
        Your request
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div><label style={labelStyle}>Your page's origin</label><input style={inputStyle} value={pageOrigin} onChange={(e) => setPageOriginEdit(e.target.value)} /></div>
        <div><label style={labelStyle}>Request URL</label><input style={inputStyle} value={requestUrl} onChange={(e) => setRequestUrlEdit(e.target.value)} /></div>
        <div>
          <label style={labelStyle}>Method</label>
          <select style={inputStyle} value={method} onChange={(e) => setMethodEdit(e.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div><label style={labelStyle}>Custom headers (comma-separated)</label><input style={inputStyle} value={customHeaders} onChange={(e) => setCustomHeadersEdit(e.target.value)} placeholder="Authorization, X-Api-Key" /></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginBottom: '1.25rem' }}>
        <input type="checkbox" checked={withCredentials} onChange={(e) => setWithCredentialsEdit(e.target.checked)} style={{ accentColor: '#DF78A0', width: '16px', height: '16px' }} />
        Sending credentials (cookies / Authorization)
      </label>

      {method === 'POST' && (
        <AdvancedDisclosure summary="Advanced request options">
          <div>
            <label style={labelStyle}>Content-Type</label>
            <select style={inputStyle} value={contentType} onChange={(e) => setContentTypeEdit(e.target.value)}>
              {['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </AdvancedDisclosure>
      )}

      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--k-text)', marginTop: '.25rem', marginBottom: '1rem' }}>
        What the server responded with
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div><label style={labelStyle}>Access-Control-Allow-Origin</label><input style={inputStyle} value={allowOrigin} onChange={(e) => setAllowOriginEdit(e.target.value)} placeholder="e.g. https://myapp.com or *" /></div>
        <div><label style={labelStyle}>Access-Control-Allow-Methods</label><input style={inputStyle} value={allowMethods} onChange={(e) => setAllowMethodsEdit(e.target.value)} /></div>
        <div><label style={labelStyle}>Access-Control-Allow-Headers</label><input style={inputStyle} value={allowHeaders} onChange={(e) => setAllowHeadersEdit(e.target.value)} /></div>
      </div>

      <AdvancedDisclosure summary="Advanced response options">
        <div>
          <label style={labelStyle}>Access-Control-Allow-Credentials</label>
          <select style={inputStyle} value={allowCredentials ? 'true' : 'false'} onChange={(e) => setAllowCredentialsEdit(e.target.value === 'true')}>
            <option value="false">not present / false</option>
            <option value="true">true</option>
          </select>
        </div>
      </AdvancedDisclosure>

      <label style={{ ...labelStyle, marginTop: '.5rem' }}>Request flow</label>
      <VisualizationContainer minHeight={130}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', padding: '.25rem .5rem' }}>
          {flow.map((n, i) => (n.kind === 'box' ? <FlowBox key={i} label={n.label} sublabel={n.sublabel} tone={n.tone} /> : <FlowArrow key={i} label={n.label} />))}
        </div>
      </VisualizationContainer>

      <label style={{ ...labelStyle, marginTop: '1.5rem' }}>Step-by-step (supporting detail)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem', marginBottom: '1.25rem' }}>
        {result.steps.map((s, i) => (
          <Warning key={i} level={s.status === 'pass' ? 'good' : s.status === 'fail' ? 'danger' : 'info'} title={s.title}>
            {s.detail}
          </Warning>
        ))}
      </div>

      <Insight what={what} why={why} tip={tip} />

      <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', marginTop: '1.25rem', lineHeight: 1.5 }}>
        Common misconception: CORS doesn't stop the request from reaching the server (except a failed preflight) — it stops the <em>browser from handing the response back to your JavaScript</em>. The server usually still processed it. This tool models the browser's CORS algorithm from the headers you enter; it never makes a real network request.
      </p>
    </div>
  );
}
