export const ERROR_LIMITS = { entries: 12, fields: 10, outputBytes: 60000 } as const;
export const errorCategories = ['validation', 'authentication', 'authorization', 'resource', 'conflict', 'rate-limit', 'dependency', 'internal', 'payment'] as const;
export const retryChoices = ['DO NOT RETRY', 'RETRY', 'RETRY WITH BACKOFF', 'RETRY AFTER SERVER VALUE', 'CONTEXT REQUIRED'] as const;
export interface ErrorField {
    id: number;
    pointer: string;
    detail: string;
    code: string;
}
export interface ErrorDefinition {
    id: number;
    name: string;
    code: string;
    status: number;
    title: string;
    detail: string;
    type: string;
    instance: string;
    category: typeof errorCategories[number];
    retry: typeof retryChoices[number];
    action: string;
    safeToExpose: boolean;
    operation: 'idempotent' | 'non-idempotent' | 'protected';
    retryAfter: string;
    trace: boolean;
    fields: ErrorField[];
}
export interface ErrorFinding {
    level: 'FAIL' | 'WARN' | 'INFO' | 'PASS';
    entry: number;
    problem: string;
    risk: string;
    fix: string;
}
export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
    code: string;
    traceId?: string;
    errors?: {
        pointer: string;
        detail: string;
        code?: string;
    }[];
}
export const errorPresetNames = ['Validation Error', 'Unauthorized', 'Forbidden', 'Resource Not Found', 'Conflict', 'Rate Limited', 'Dependency Failure', 'Internal Error', 'Payment Failure'] as const;
const presets: readonly [
    ErrorDefinition['category'],
    number,
    string,
    string,
    string,
    ErrorDefinition['retry'],
    string
][] = [
    ['validation', 400, 'VALIDATION_FAILED', 'Request validation failed', 'Review the highlighted fields.', 'DO NOT RETRY', 'Fix the indicated input before sending a new request.'],
    ['authentication', 401, 'AUTHENTICATION_REQUIRED', 'Authentication required', 'Valid authentication is required for this action.', 'DO NOT RETRY', 'Authenticate using the supported challenge; do not loop unchanged credentials.'],
    ['authorization', 403, 'ACCESS_DENIED', 'Access denied', 'This action is not permitted.', 'DO NOT RETRY', 'Request appropriate permission or fail gracefully.'],
    ['resource', 404, 'RESOURCE_NOT_FOUND', 'Resource not found', 'The requested resource is unavailable.', 'DO NOT RETRY', 'Check the resource reference and applicable access policy.'],
    ['conflict', 409, 'STATE_CONFLICT', 'State conflict', 'The request conflicts with the current resource state.', 'CONTEXT REQUIRED', 'Refresh state and resolve the conflict before attempting the change again.'],
    ['rate-limit', 429, 'RATE_LIMITED', 'Request rate limited', 'The request rate exceeds the permitted policy.', 'RETRY AFTER SERVER VALUE', 'Respect a valid Retry-After value or documented server policy; bound attempts.'],
    ['dependency', 503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable', 'The service cannot handle this request right now.', 'RETRY WITH BACKOFF', 'Confirm retry safety, use bounded backoff with jitter and stop at the deadline.'],
    ['internal', 500, 'INTERNAL_FAILURE', 'Request could not be completed', 'The service could not complete this request.', 'CONTEXT REQUIRED', 'Show this safe message; contact support if the problem persists.'],
    ['payment', 422, 'PAYMENT_DECLINED', 'Payment method declined', 'The payment could not be completed with this method.', 'DO NOT RETRY', 'Ask for another payment method; do not automatically repeat a charge.'],
];
export function errorPreset(name: string, id = 1): ErrorDefinition {
    const index = errorPresetNames.indexOf(name as typeof errorPresetNames[number]);
    if (index < 0)
        throw new Error('Choose an available preset.');
    const [category, status, code, title, detail, retry, action] = presets[index];
    return { id, name, category, status, code, title, detail, retry, action, type: `https://api.example.com/problems/${code.toLowerCase().replaceAll('_', '-')}`, instance: '', safeToExpose: true, operation: category === 'payment' ? 'non-idempotent' : 'idempotent', retryAfter: '', trace: false, fields: category === 'validation' ? [{ id: 1, pointer: '/quantity', detail: 'Must be a positive whole number.', code: 'POSITIVE_INTEGER' }] : [] };
}
// Heuristics catch common disclosures, not every secret or personal identifier. Review remains mandatory.
export function unsafeErrorText(text: string): boolean {
    let decoded = text;
    try {
        decoded = decodeURIComponent(text);
    }
    catch { /* Invalid escapes are separately rejected in URIs. */ }
    return /(?:password|passwd|secret|api[-_ ]?key|authorization|cookie|token|access[-_ ]?token|refresh[-_ ]?token)["']?\s*[=:]|\bBearer\s+\S+|-----BEGIN|\b(?:sk|ghp|github_pat)[-_][a-z\d_]{8,}|\beyJ[a-z\d_-]+\.[a-z\d_-]+\.[a-z\d_-]+|\b(?:select\s+.+\s+from|insert\s+into|delete\s+from)\b|\bat\s+\S+\s*\([^)]*:\d+|\b(?:\w*Exception|\w*Error):|\b[A-Za-z][A-Za-z0-9_]+(?:Exception|Error)\b|\bTraceback\s*\(|[a-z]:\\|\/(?:home|var|etc|usr|Users)\/|\b(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/|https?:\/\/[^\s/]*@|\b(?:localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)|\b[\w.-]+\.(?:internal|local|corp)\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:ssn|credit.card|raw.payload|request.body)\b/i.test(decoded);
}
function uriReference(value: string): boolean {
    if (!value || /[\s<>"\\]|%(?![\da-f]{2})/i.test(value))
        return false;
    // Deliberately bounded URI-reference profile; no dereferencing or executable schemes.
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
        if (!/^(?:https?:|urn:|tag:|about:blank$)/i.test(value))
            return false;
        if (/^https?:/i.test(value)) {
            try {
                const url = new URL(value);
                return !!url.hostname && !url.username && !url.password;
            }
            catch {
                return false;
            }
        }
    }
    return true;
}
export function buildErrorContract(entries: readonly ErrorDefinition[]) {
    if (!entries.length || entries.length > ERROR_LIMITS.entries)
        throw new Error('Define between 1 and 12 errors.');
    const findings: ErrorFinding[] = [], catalog: {
        problem: ProblemDetails;
        name: string;
        retry: string;
        action: string;
        headers: Record<string, string>;
    }[] = [];
    const codes = new Set<string>(), types = new Map<string, string>();
    entries.forEach((entry, index) => {
        const n = index + 1;
        const add = (level: ErrorFinding['level'], problem: string, risk: string, fix: string) => findings.push({ level, entry: n, problem, risk, fix });
        if (entry.fields.length > ERROR_LIMITS.fields)
            throw new Error('Use at most 10 validation rows per error.');
        const textValues = [entry.name, entry.code, entry.title, entry.detail, entry.type, entry.instance, entry.action, entry.retryAfter, ...entry.fields.flatMap(f => [f.pointer, f.detail, f.code])];
        if (textValues.some(v => typeof v !== 'string' || v.length > 1000))
            throw new Error('Each text field must be at most 1,000 characters.');
        const unsafe = textValues.some(unsafeErrorText);
        if (unsafe)
            add('FAIL', 'Possible private or implementation data', 'Response examples and exports could disclose sensitive content.', 'Remove secrets, personal values, internal URLs, SQL and stack traces. The generated entry is masked; review is heuristic.');
        if (!entry.safeToExpose)
            add('FAIL', 'Public-message review incomplete', 'Unreviewed messages are not ready for clients.', 'Review every field and explicitly confirm it is safe to expose.');
        if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(entry.code) || /(?:Exception|Error)$/.test(entry.code))
            add('FAIL', 'Unstable public code', 'Clients need a stable application identifier.', 'Use 2–64 uppercase letters, digits or underscores; avoid exception names. This is a builder convention, not an RFC requirement.');
        if (codes.has(entry.code))
            add('FAIL', 'Duplicate public code', 'Different definitions would be ambiguous.', 'Assign each catalog entry a unique stable code.');
        codes.add(entry.code);
        if (!entry.name.trim() || !entry.title.trim())
            add('FAIL', 'Name or title missing', 'The catalog cannot describe the failure clearly.', 'Provide an internal name and a concise public title.');
        if (entry.title.length > 120 || /something went wrong|unknown error/i.test(entry.title))
            add('WARN', 'Title is generic or long', 'Clients and readers lose useful context.', 'Choose a short stable summary of the problem class.');
        if (!Number.isInteger(entry.status) || entry.status < 400 || entry.status > 599)
            add('FAIL', 'HTTP error status invalid for this profile', 'An HTTP failure should not be reported as successful.', 'Choose the actual 4xx or 5xx response status. RFC 9457 itself also permits other HTTP statuses.');
        if (!uriReference(entry.type) || entry.instance && !uriReference(entry.instance))
            add('FAIL', 'Invalid or unsupported URI reference', 'Problem identity or occurrence would be unreliable.', 'Use a valid URI reference. This builder supports HTTP(S), urn, tag, about:blank and relative references; it does not fetch them.');
        if (/[?#]|\b(?:staging|localhost|development)\b|\/\d{3,}(?:\/|$)|[a-f\d]{8}-[a-f\d-]{20,}/i.test(entry.type) && entry.type !== 'about:blank')
            add('WARN', 'Problem type may be occurrence-specific', 'Changing identifiers split one problem class into many.', 'Use a reusable stable type without request IDs, timestamps, environment names or private state.');
        if (entry.type !== 'about:blank' && !entry.type.startsWith('https://'))
            add('INFO', 'Type uses a non-HTTPS or relative reference', 'Relative identity depends on the response base URI.', 'Prefer a stable absolute documentation URI when practical; other URI references are allowed by RFC 9457.');
        if (types.has(entry.type) && types.get(entry.type) !== entry.title)
            add('WARN', 'One type has different titles', 'Titles should remain stable for the same problem type except localization.', 'Align titles or use distinct problem types.');
        types.set(entry.type, entry.title);
        if (entry.type === 'about:blank')
            add('WARN', 'about:blank has HTTP-only semantics', 'A custom problem meaning would be misleading.', 'Use the status reason phrase (localized if needed), or choose your own problem type for domain semantics.');
        const statuses: Record<ErrorDefinition['category'], number[]> = { validation: [400, 422], authentication: [401], authorization: [403], resource: [404], conflict: [409], 'rate-limit': [429], dependency: [502, 503, 504], internal: [500], payment: [400, 402, 403, 409, 422] };
        if (!statuses[entry.category]?.includes(entry.status))
            add('WARN', 'Status and category need review', 'Protocol semantics may disagree with the declared meaning.', 'Choose status from the actual HTTP outcome: 401 authentication, 403 authorization, 400/422 contextual validation, 502 invalid upstream response, 503 unavailability, 504 upstream timeout.');
        if (!retryChoices.includes(entry.retry) || !entry.action.trim())
            add('FAIL', 'Recovery guidance missing', 'Clients cannot choose a safe next step.', 'Select a retry classification and describe the client action.');
        const retries = entry.retry !== 'DO NOT RETRY' && entry.retry !== 'CONTEXT REQUIRED';
        if (retries && ['validation', 'authentication', 'authorization', 'payment'].includes(entry.category))
            add('WARN', 'Blind retry is unsafe for this category', 'An unchanged request may repeatedly fail or repeat a side effect.', 'Fix input, authenticate or obtain permission; retry only after the underlying condition changes.');
        if (retries && entry.operation !== 'idempotent')
            add('WARN', 'Non-idempotent retry can duplicate side effects', 'A payment, order or message may be performed twice.', 'Enforce operation-bound idempotency keys or durable duplicate protection before retrying. A request ID or Problem Details alone is insufficient; verify even declared protection.');
        if (retries && entry.category === 'dependency')
            add('WARN', 'Dependency retry requires context', 'Not every 5xx failure is temporary or safe to retry.', 'Confirm operation safety, cap attempts, apply backoff with jitter and respect the caller deadline.');
        if (entry.category === 'conflict')
            add('INFO', 'Resolve current-state conflict', 'Repeating stale state can fail again.', 'Refresh state, resolve the conflict and verify operation safety before retrying.');
        if (['authentication', 'resource'].includes(entry.category))
            add('WARN', 'Review enumeration policy', 'Different messages can reveal whether accounts or protected resources exist.', 'Use context-appropriate neutral messages and consistent status/timing policy; do not disclose authentication internals.');
        if (entry.category === 'payment')
            add('INFO', 'Payment status is domain-dependent', '402 has no generally defined payment workflow.', 'Document the actual domain failure; 422 here is an editable example, not a universal payment status.');
        if (!['idempotent', 'non-idempotent', 'protected'].includes(entry.operation))
            add('FAIL', 'Operation safety missing', 'Retry cannot be assessed.', 'Declare operation semantics; verify protection in the implementation.');
        for (const field of entry.fields) {
            if (!/^(?:#?\/)(?:[^~]|~[01])*$/.test(field.pointer) || !field.detail.trim())
                add('FAIL', 'Validation location or message invalid', 'Clients cannot identify the invalid field reliably.', 'Use a non-empty JSON Pointer such as /quantity or #/quantity; escape ~ as ~0 and / as ~1. Add a safe message without the submitted value.');
            if (field.code && !/^[A-Z][A-Z0-9_]{1,63}$/.test(field.code))
                add('FAIL', 'Validation rule code invalid', 'Rule identifiers should be stable.', 'Use the same uppercase identifier convention as public codes.');
        }
        if (entry.category === 'validation' && !entry.fields.length)
            add('WARN', 'Validation locations absent', 'Clients cannot highlight individual input problems.', 'Add safe field messages where field-level feedback is appropriate.');
        if (entry.fields.length && entry.category !== 'validation')
            add('WARN', 'Validation extension on another category', 'Clients may misunderstand errors as invalid input.', 'Keep errors only if this problem type explicitly documents field validation.');
        const headers: Record<string, string> = { 'Content-Type': 'application/problem+json' };
        if (entry.status === 401)
            add('INFO', 'Authentication challenge required', 'The HTTP response needs more than JSON.', 'Send an appropriate WWW-Authenticate challenge with 401; configure the real authentication scheme on your server.');
        if (entry.retryAfter) {
            const valid = /^\d{1,9}$/.test(entry.retryAfter) || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(entry.retryAfter) && Number.isFinite(Date.parse(entry.retryAfter)) && new Date(entry.retryAfter).toUTCString() === entry.retryAfter;
            if (!valid)
                add('FAIL', 'Retry-After value invalid', 'A malformed delay cannot guide recovery.', 'Supply non-negative integer seconds or a valid HTTP date; leave empty to avoid inventing a delay.');
            else if (!unsafe)
                headers['Retry-After'] = entry.retryAfter;
        }
        else if (entry.category === 'rate-limit' || entry.retry === 'RETRY AFTER SERVER VALUE')
            add('WARN', 'No Retry-After value defined', 'The client has no server-provided delay in this example.', 'Supply a real policy value or document an explicit server policy. No default delay is generated.');
        const problem: ProblemDetails = unsafe ? { type: 'about:blank', title: 'Masked entry — review required', status: entry.status, detail: 'Potentially sensitive entry withheld.', code: 'WITHHELD' } : { type: entry.type, title: entry.title, status: entry.status, detail: entry.detail, code: entry.code, ...(entry.instance ? { instance: entry.instance } : {}), ...(entry.trace ? { traceId: 'example-opaque-correlation-id' } : {}), ...(entry.fields.length ? { errors: entry.fields.map(f => ({ pointer: f.pointer, detail: f.detail, ...(f.code ? { code: f.code } : {}) })) } : {}) };
        catalog.push({ problem, name: unsafe ? 'Withheld' : entry.name, retry: entry.retry, action: unsafe ? 'Remove sensitive data and review again.' : entry.action, headers });
    });
    const quality = findings.some(f => f.level === 'FAIL') ? 'FAIL' : findings.some(f => f.level === 'WARN') ? 'WARN' : 'PASS';
    if (quality === 'PASS')
        findings.push({ level: 'PASS', entry: 0, problem: 'Supported contract checks passed', risk: 'Static checks cannot prove runtime security or correctness.', fix: 'Test actual HTTP status, headers, client handling and public disclosure policy.' });
    if (new TextEncoder().encode(JSON.stringify(catalog)).length > ERROR_LIMITS.outputBytes)
        throw new Error('Reduce the contract below the 60 KB output limit.');
    return { quality, canExport: quality !== 'FAIL', catalog, findings };
}
