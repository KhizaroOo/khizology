// OTLP JSON and selected semantic conventions; no runtime collector access.
export const TRACE_LIMITS = { bytes: 200000, depth: 24, nodes: 12000, spans: 200, attributes: 2000, attributesPerSpan: 100, events: 1000, findings: 150 };
type Obj = Record<string, any>;
export type Finding = {
    level: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
    category: string;
    path: string;
    evidence: string;
    why: string;
    fix: string;
    context: string;
};
const rootParent = (id: string) => !id || /^0{16}$/.test(id);
const object = (v: any): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const unbox = (v: any): any => object(v) ? ('stringValue' in v ? v.stringValue : 'intValue' in v ? Number(v.intValue) : 'doubleValue' in v ? v.doubleValue : 'boolValue' in v ? v.boolValue : v) : v;
function attrs(v: any): Obj { return Array.isArray(v) ? Object.fromEntries(v.filter(object).filter(x => typeof x.key === 'string').map(x => [x.key, unbox(x.value)])) : object(v) ? v : {}; }
const sensitive = /password|secret|token|authorization|cookie|api[_.-]?key|private[_.-]?key|connection[_.-]?string/i;
const personal = /email|phone|address|user[_.-]?id|session|request[_.-]?id/i;
const secretValue = /Bearer\s+|sk-[a-zA-Z0-9_-]{8,}|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.|AKIA[A-Z0-9]{16}|-----BEGIN .*PRIVATE KEY|(?:postgres|mysql):\/\//i;
const content = /body|prompt|completion|messages|input.value|output.value|statement|query.text|exception.message|exception.stacktrace|tool.definitions/i;
function safeLabel(v: any, fallback: string) { return typeof v === 'string' && /^[a-zA-Z][a-zA-Z0-9_ .:/{}-]{0,59}$/.test(v) && !sensitive.test(v) && !personal.test(v) && !content.test(v) && !secretValue.test(v) && !/\d{5}|https?:|@|\/\d+/.test(v) ? v : fallback; }
function time(s: Obj, side: 'start' | 'end'): bigint | null {
    const nano = s[side + 'TimeUnixNano'];
    if (nano !== undefined)
        return (typeof nano === 'string' && /^\d{1,20}$/.test(nano)) || (typeof nano === 'number' && Number.isSafeInteger(nano) && nano >= 0) ? (BigInt(nano) <= 18446744073709551615n ? BigInt(nano) : null) : null;
    const ms = s[side + 'TimeUnixMillis'];
    if (typeof ms === 'number' && Number.isSafeInteger(ms) && ms >= 0)
        return BigInt(ms) * 1000000n;
    const iso = s[side + 'Time'];
    if (typeof iso === 'string') {
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T\d{2}[:]\d{2}[:]\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}[:]\d{2})$/);
        if (match) {
            const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
            const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            const n = Date.parse(iso);
            if (month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number.isFinite(n) && n >= 0)
                return BigInt(n) * 1000000n;
        }
    }
    return null;
}
// Deliberately isolated convention rules: conditional type checks, not universal required fields.
const TYPES: Record<string, 'string' | 'number'> = { 'error.type': 'string', 'http.request.method': 'string', 'http.response.status_code': 'number', 'rpc.system': 'string', 'rpc.service': 'string', 'db.system.name': 'string', 'db.operation.name': 'string', 'messaging.system': 'string', 'messaging.operation.name': 'string', 'network.protocol.name': 'string', 'service.name': 'string', 'gen_ai.operation.name': 'string', 'gen_ai.request.model': 'string', 'gen_ai.usage.input_tokens': 'number', 'gen_ai.usage.output_tokens': 'number' };
export function analyzeTrace(raw: string) {
    if (new TextEncoder().encode(raw).length > TRACE_LIMITS.bytes)
        throw Error('Trace exceeds 200,000 UTF-8 bytes. Use a smaller sample.');
    let data: any;
    try {
        data = JSON.parse(raw);
    }
    catch {
        throw Error('Invalid JSON. Paste a static OTLP JSON export; parser details are hidden.');
    }
    const queue: [
        any,
        number
    ][] = [[data, 0]];
    let nodes = 0;
    for (let i = 0; i < queue.length; i++) {
        const [v, d] = queue[i];
        if (++nodes > TRACE_LIMITS.nodes || d > TRACE_LIMITS.depth)
            throw Error('Trace exceeds the 12,000-value / 24-level safety limit.');
        if (v && typeof v === 'object')
            for (const x of Object.values(v))
                queue.push([x, d + 1]);
    }
    const normalized: {
        s: Obj;
        r: Obj;
    }[] = [];
    const add = (list: any, r: Obj) => { if (!Array.isArray(list) || list.some(x => !object(x)))
        throw Error('Expected an array of span objects.'); for (const s of list)
        normalized.push({ s, r }); };
    if (Array.isArray(data))
        add(data, {});
    else if (object(data) && Array.isArray(data.resourceSpans)) {
        for (const group of data.resourceSpans) {
            if (!object(group))
                throw Error('Invalid resourceSpans group.');
            const r = attrs(group.resource?.attributes);
            for (const scope of (Array.isArray(group.scopeSpans ?? group.instrumentationLibrarySpans) ? (group.scopeSpans ?? group.instrumentationLibrarySpans) : [])) {
                if (!object(scope))
                    throw Error('Invalid scope group.');
                add(scope.spans, r);
            }
        }
    }
    else if (object(data) && Array.isArray(data.spans))
        add(data.spans, attrs(data.resource?.attributes ?? data.resource));
    else if (object(data) && ('spanId' in data || 'span_id' in data))
        add([data], {});
    else
        throw Error('Unsupported export. Use a span object, span array, spans wrapper or OTLP resourceSpans/scopeSpans JSON. Vendor exports are not automatically converted.');
    if (!normalized.length || normalized.length > TRACE_LIMITS.spans)
        throw Error('Provide 1–200 spans.');
    let attributes = 0, events = 0;
    for (const { s, r } of normalized) {
        if (Object.keys(attrs(s.attributes)).length > TRACE_LIMITS.attributesPerSpan) throw Error('A span exceeds 100 attributes. Use a smaller attribute sample.');
        attributes += Object.keys(attrs(s.attributes)).length + Object.keys(r).length;
        events += Array.isArray(s.events) ? s.events.length : 0;
    }
    if (attributes > TRACE_LIMITS.attributes || events > TRACE_LIMITS.events)
        throw Error('Trace exceeds 2,000 attributes or 1,000 events.');
    const findings: Finding[] = [];
    let omitted = 0;
    const addFinding = (level: Finding['level'], category: string, path: string, evidence: string, why: string, fix: string, context = 'High confidence for supplied data; sampling and instrumentation context may vary.') => { if (findings.length >= TRACE_LIMITS.findings) {
        omitted++;
        return;
    } findings.push({ level, category, path, evidence, why, fix, context }); };
    const spans = normalized.map(({ s, r }, i) => ({ s, a: attrs(s.attributes), r: { ...r, ...attrs(s.resource?.attributes ?? s.resource) }, id: String(s.spanId ?? s.span_id ?? '').toLowerCase(), trace: String(s.traceId ?? s.trace_id ?? '').toLowerCase(), parent: String(s.parentSpanId ?? s.parent_span_id ?? '').toLowerCase(), start: time(s, 'start'), end: time(s, 'end'), path: 'Span ' + (i + 1) }));
    const map = new Map<string, typeof spans[number]>();
    let roots = 0;
    for (const v of spans) {
        const { s, a, r, path } = v;
        const valid = (id: string, n: number) => new RegExp('^[a-f0-9]{' + n + '}$').test(id) && !/^0+$/.test(id);
        if (!valid(v.trace, 32) || !valid(v.id, 16))
            addFinding('FAIL', 'Structure', path, 'Missing or invalid trace/span ID', 'OTLP uses nonzero hexadecimal IDs of 32 / 16 characters.', 'Repair ID generation or export encoding.');
        if (Object.keys(v.r).length && attrs(s.resource?.attributes ?? s.resource)['service.name'] !== undefined && normalized[spans.indexOf(v)].r['service.name'] !== undefined && attrs(s.resource?.attributes ?? s.resource)['service.name'] !== normalized[spans.indexOf(v)].r['service.name'])
            addFinding('WARN', 'Resource', path, 'Conflicting service identity declarations', 'Span-local and resource-group identity disagree.', 'Use the canonical resource identity and review export transformation.');
        const key = v.trace + ':' + v.id;
        if (map.has(key))
            addFinding('FAIL', 'Structure', path, 'Duplicate span ID within trace', 'Parent relationships become ambiguous.', 'Check duplicate export or span creation.');
        else
            map.set(key, v);
        if (rootParent(v.parent))
            roots++;
        else if (!valid(v.parent, 16))
            addFinding('FAIL', 'Structure', path, 'Invalid parent ID', 'A parent reference must use a valid span ID.', 'Repair parent context propagation.');
        if (v.start === null || v.end === null)
            addFinding('WARN', 'Time', path, 'Missing or unsupported timestamp', 'Ambiguous numeric units and unsafe integers are not guessed.', 'Use decimal-string startTimeUnixNano/endTimeUnixNano, explicit UnixMillis or offset ISO startTime/endTime.');
        else if (v.end < v.start)
            addFinding('FAIL', 'Time', path, 'End precedes start', 'Negative duration cannot describe a valid span interval.', 'Check timestamp units, clock source and export.');
        else if (v.end === v.start)
            addFinding('WARN', 'Time', path, 'Zero duration', 'Resolution or incomplete instrumentation may explain this.', 'Review timer precision and span lifecycle.');
        else if (v.end - v.start > 3600000000000n)
            addFinding('INFO', 'Time', path, 'Duration exceeds one hour', 'Long-lived work can be legitimate.', 'Confirm intended operation lifetime.');
        if (typeof r['service.name'] !== 'string' || !r['service.name'].trim())
            addFinding('WARN', 'Resource', path, 'Missing service.name', 'Service identity is important for useful trace attribution.', 'Set a stable resource service.name.');
        else if (r['service.name'].startsWith('unknown_service'))
            addFinding('WARN', 'Resource', path, 'Fallback service identity', 'SDK fallback obscures the real service.', 'Configure an explicit service.name.');
        if (typeof s.name !== 'string' || !s.name.trim() || /^(request|operation|span|unknown)$/i.test(s.name) || /https?:|\d{5}|[a-f0-9]{8}-[a-f0-9-]{20,}/i.test(s.name))
            addFinding('WARN', 'Naming', path, 'Missing, vague or instance-specific operation name', 'Stable operation names improve aggregation and navigation.', 'Prefer a stable operation or route template; retain necessary identifiers only under a reviewed policy.', 'Naming heuristic, not a semantic-convention compliance failure.');
        for (const [k, type] of Object.entries(TYPES)) {
            const val = k === 'service.name' ? r[k] : a[k];
            if (val !== undefined && (typeof val !== type || (type === 'number' && (!Number.isFinite(val) || val < 0 || !Number.isInteger(val)))))
                addFinding('WARN', 'Conventions', path, 'Recognized attribute has an unexpected type/value', 'Selected HTTP/RPC/database/messaging/network/service/GenAI attributes have defined types.', 'Review the applicable official convention and instrumentation version.');
        }
        if (a['http.method'] !== undefined && a['http.request.method'] !== undefined || a['db.system'] !== undefined && a['db.system.name'] !== undefined)
            addFinding('INFO', 'Conventions', path, 'Legacy and current convention attributes coexist', 'Migration modes can deliberately emit both.', 'Confirm migration policy and avoid conflicting definitions.');
        if (a['http.response.status_code'] !== undefined && (Number(a['http.response.status_code']) < 100 || Number(a['http.response.status_code']) > 599))
            addFinding('WARN', 'Conventions', path, 'HTTP response code outside 100–599', 'This is not a recognized HTTP status code.', 'Check value and field mapping.');
        const scan = (value: any, label: string) => { const work: [
            any,
            string
        ][] = [[value, label]]; for (let j = 0; j < work.length; j++) {
            const [x, k] = work[j];
            if (x && typeof x === 'object') {
                for (const [key, val] of Object.entries(x))
                    work.push([val, sensitive.test(k) || personal.test(k) || content.test(k) ? k : key]);
                continue;
            }
            const str = String(x ?? '');
            let classification = '';
            if ((sensitive.test(k) && !/^gen_ai\.usage\.(input|output)_tokens$/.test(k)) || secretValue.test(str))
                classification = 'SECRET-LIKE';
            else if (personal.test(k) || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(str))
                classification = 'PERSONAL/SENSITIVE';
            else if (content.test(k))
                classification = 'POSSIBLY SENSITIVE';
            else if (/https?:.*[?]|\b\d{3}-\d{2}-\d{4}\b/.test(str))
                classification = 'CONTEXT REQUIRED';
            if (classification)
                addFinding('WARN', 'Privacy', path, classification + ' · value withheld', 'Telemetry may disclose credentials, identity or content.', 'Remove secrets; minimize/redact content before collection. Review consent and access controls.', 'Heuristic classification; all evidence values and unknown keys are withheld.');
            if (str.length > 1000)
                addFinding('WARN', 'Attributes', path, 'Large value withheld', 'Large telemetry fields increase storage/query overhead.', 'Prefer bounded metadata; avoid raw bodies.');
            if (personal.test(k) || /https?:.*[?]|[a-f0-9]{8}-[a-f0-9-]{20,}|\d{4}-\d{2}-\d{2}T/i.test(str))
                addFinding('INFO', 'Attributes', path, 'Potential high-uniqueness field', 'Trace query/storage cost can rise; metric cardinality limits do not directly apply.', 'Retain only operationally useful identifiers under a privacy policy.', 'Generic heuristic; no cost forecast.');
        } };
        scan({ ...s, attributes: a, resource: undefined, events: Array.isArray(s.events) ? s.events.map((e: any) => object(e) ? { ...e, attributes: attrs(e.attributes) } : e) : [] }, 'span');
        scan(r, 'resource');
        const values = Object.values(a).filter(x => typeof x === 'string' && x.length > 200);
        if (values.length > 2 && new Set(values).size < values.length)
            addFinding('INFO', 'Attributes', path, 'Repeated large attribute values', 'Repeated content increases telemetry volume.', 'Prefer bounded metadata over duplicated bodies.');
        const failed = s.status?.code === 2 || s.status?.code === 'STATUS_CODE_ERROR' || s.status?.code === 'ERROR';
        const exceptions = Array.isArray(s.events) && s.events.some((e: any) => e?.name === 'exception');
        if (failed && !exceptions && !a['error.type'])
            addFinding('WARN', 'Errors', path, 'Error status lacks safe failure context', 'A bounded error type can explain failure without private messages.', 'Add appropriate error.type or a sanitized exception event; stack traces are not required.');
        if (exceptions && (s.status?.code === 1 || s.status?.code === 'STATUS_CODE_OK'))
            addFinding('WARN', 'Errors', path, 'Success status with exception evidence', 'Handled exceptions may be legitimate but need context.', 'Review whether the operation actually succeeded.', 'Context required; handled exceptions need not mark the span failed.');
        if (a['error.type'] && !failed)
            addFinding('INFO', 'Errors', path, 'Error type without error status', 'Handled or recovered work may explain this signal.', 'Confirm actual outcome and status assignment.', 'Context required; not every recorded error means the enclosing operation failed.');
        if (exceptions && !failed)
            addFinding('INFO', 'Errors', path, 'Exception event without error status', 'An exception can be handled; missing failure status is not automatically a defect.', 'Confirm actual operation outcome.');
        if (Object.keys(a).some(k => k.startsWith('gen_ai.'))) {
            if (!a['gen_ai.operation.name'])
                addFinding('WARN', 'GenAI', path, 'GenAI operation identity absent', 'Operation naming helps distinguish model and agent work.', 'Add applicable gen_ai.operation.name for your instrumentation profile.');
            if (!a['gen_ai.request.model'])
                addFinding('INFO', 'GenAI', path, 'No requested model recorded', 'Agent/tool spans may not call a model.', 'Record model metadata when available for a model operation.', 'Conditional guidance, not a universal requirement.');
            addFinding('INFO', 'GenAI', path, 'Content capture is not required', 'Prompts, completions and tool results can expose sensitive data.', 'Keep content capture off by default; token usage may be recorded when available.', 'GenAI conventions evolve; verify the linked current profile.');
        }
    }
    for (const v of spans) {
        if (rootParent(v.parent))
            continue;
        const parent = map.get(v.trace + ':' + v.parent);
        if (!parent) {
            addFinding('WARN', 'Structure', v.path, 'Parent is absent from this sample', 'Sampling, export boundaries or remote spans may explain the gap.', 'Check a complete trace before treating this as broken propagation.', 'Partial-sample uncertainty; not a definitive failure.');
            continue;
        }
        let cur: typeof v | undefined = v;
        const seen = new Set<string>();
        while (cur) {
            if (seen.has(cur.id)) {
                addFinding('FAIL', 'Structure', v.path, 'Parent cycle or self-parent', 'A trace parent graph must be acyclic.', 'Repair parent assignment.');
                break;
            }
            seen.add(cur.id);
            cur = map.get(cur.trace + ':' + cur.parent);
        }
        if (v.start !== null && v.end !== null && parent.start !== null && parent.end !== null && (v.end < parent.start || v.start > parent.end))
            addFinding('WARN', 'Time', v.path, 'Child interval completely outside parent', 'Clock skew or asynchronous lifetime may explain this.', 'Check clocks and intended parent relationship.', 'Context required, not proof of clock failure.');
    }
    if (roots > 1)
        addFinding('INFO', 'Structure', 'Sample', 'Multiple roots in supplied sample', 'Multiple traces or partial exports can legitimately have multiple roots.', 'Group by trace and inspect sample completeness.');
    const instances = new Map<string, Set<string>>();
    for (const v of spans) {
        const instance = v.r['service.instance.id'], name = v.r['service.name'];
        if (typeof instance === 'string' && typeof name === 'string') {
            const set = instances.get(instance) ?? new Set<string>();
            set.add(name);
            instances.set(instance, set);
        }
    }
    if ([...instances.values()].some(set => set.size > 1))
        addFinding('INFO', 'Resource', 'Sample', 'One instance ID appears under several service names', 'This can reflect resource transformation or identity reuse.', 'Check namespace and instance identity in deployment context.', 'Context required; service namespace, instance and version are optional.');
    const names = spans.map(v => v.s.name);
    if (spans.length >= 8 && new Set(names).size / spans.length > .9)
        addFinding('WARN', 'Naming', 'Sample', 'Nearly every operation name is unique', 'This may impede useful grouping.', 'Review operation templates.', 'Heuristic; distinct legitimate operations are possible.');
    if (!findings.some(f => f.level === 'FAIL' || f.level === 'WARN'))
        addFinding('PASS', 'Structure', 'Sample', 'No supported checks found a blocking signal', 'This is a bounded static review, not certification.', 'Verify runtime instrumentation and complete traces.');
    const ranked = [...findings].sort((a, b) => ({ FAIL: 0, WARN: 1, INFO: 2, PASS: 3 }[a.level] - { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 }[b.level]));
    return { findings, omitted, spanCount: spans.length, serviceCount: new Set(spans.map(v => v.r['service.name']).filter(x => typeof x === 'string' && x.trim())).size, fail: findings.filter(f => f.level === 'FAIL').length, warn: findings.filter(f => f.level === 'WARN').length, fixFirst: ranked.filter(f => f.level === 'FAIL' || f.level === 'WARN').slice(0, 3), tree: spans.map(v => ({ path: v.path, parent: map.get(v.trace + ':' + v.parent)?.path ?? 'Root / external parent', name: safeLabel(v.s.name, 'Operation label withheld'), service: safeLabel(v.r['service.name'], 'Service label withheld / missing'), duration: v.start !== null && v.end !== null && v.end >= v.start ? Number(v.end - v.start) / 1e6 : null, status: v.s.status?.code === 2 || v.s.status?.code === 'STATUS_CODE_ERROR' || v.s.status?.code === 'ERROR' ? 'ERROR' : 'Unset / non-error' })) };
}
const traceId = '1234567890abcdef1234567890abcdef';
const span = (n: number, parent = '', extra: Obj = {}) => ({ traceId, spanId: n.toString(16).padStart(16, '0'), parentSpanId: parent, name: n === 1 ? 'GET /catalog' : 'database lookup', startTimeUnixNano: '1700000000000000000', endTimeUnixNano: n === 1 ? '1700000000100000000' : '1700000000050000000', resource: { 'service.name': 'catalog' }, attributes: {}, ...extra });
export const traceExamples = {
    'Healthy Web Trace': [span(1), span(2, '0000000000000001', { attributes: { 'db.system.name': 'postgresql', 'db.operation.name': 'SELECT' } })],
    'Broken Parent Trace': [span(1), span(2, '0000000000000099')],
    'Privacy Leak': [span(1, '', { attributes: { authorization: 'Bearer fictional-demo-secret', email: 'fictional@example.invalid', 'http.request.body': 'fictional private message' } })],
    'Poor Naming Trace': [span(1, '', { name: 'request' }), span(2, '0000000000000001', { name: 'https://example.invalid/users/123456?session=fictional' })],
    'GenAI Agent Trace': [span(1, '', { name: 'invoke_agent assistant', attributes: { 'gen_ai.operation.name': 'invoke_agent' } }), span(2, '0000000000000001', { name: 'chat model', attributes: { 'gen_ai.operation.name': 'chat', 'gen_ai.request.model': 'example-model', 'gen_ai.usage.input_tokens': 120, 'gen_ai.usage.output_tokens': 40 } })]
};
