export const MCP_LIMITS = { bytes: 100_000, nodes: 5_000, depth: 24, tools: 100, findings: 150 } as const;
export const mcpCategories = ['Capabilities', 'Permissions', 'Approval', 'Sensitive data', 'Instructions', 'Naming', 'Input schema', 'Output exposure', 'Network'] as const;
type Category = typeof mcpCategories[number];
type Level = 'FAIL' | 'WARN' | 'PASS' | 'INFO';
type JsonObject = Record<string, unknown>;
export interface McpFinding { category: Category; level: Level; path: string; evidence: string; why: string; risk: string; direction: string; context: string; }
interface Node { value: unknown; key: string; path: string; depth: number; keys: string[]; }
const object = (value: unknown): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value: JsonObject, key: string) => Object.hasOwn(value, key) ? value[key] : undefined;
// Unknown keys can themselves contain credentials/PII. Results expose structural locations only.
const structuralKeys = new Set(['tools', 'result', 'mcpServers', 'inputSchema', 'outputSchema', 'properties', 'items', 'annotations', 'description', 'name', 'env', 'headers', 'permissions', 'scopes', 'args', 'command', 'url', 'anyOf', 'oneOf', 'allOf', 'additionalProperties', 'required', 'policy', 'approvalRequired', 'requiresApproval']);
const sensitiveKey = /password|passwd|secret|token|api.?key|private.?key|credential|authorization|cookie|session|connection.?string|database.?url|ssh.?key/i;
const personalKey = /email|phone|address|medical|patient|private.?file|private.?data|log.?contents|raw.?records/i;
const credentialShape = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b|(?:^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^/\s:@]+:[^/\s@]+@/;
const placeholder = (text: string) => /^(?:\$\{[^}]+\}|\$[A-Z_]+|<[^>]+>|\[REDACTED\])$/.test(text);
const fixedValue = (value: JsonObject) => (Array.isArray(value.enum) && value.enum.length > 0) || Object.hasOwn(value, 'const');
const approval = (value: JsonObject) => ['requiresApproval', 'approvalRequired', 'requiresConfirmation', 'humanApproval'].some(key => own(value, key) === true) || (object(own(value, 'policy')) && approvalFlags(value.policy as JsonObject));
const approvalFlags = (value: JsonObject) => own(value, 'approvalRequired') === true || own(value, 'requiresApproval') === true;
const positiveText = (text: string) => text.toLowerCase().replace(/(?:does not|do not|never|cannot|can't|won't|without)\s+(?:delete|remove|drop|destroy|revoke|overwrite|deploy|publish|send|execute|run|write|modify|transfer|refund|pay|reveal|expose|upload|ignore)\b[^.;\n]*/g, ' ');

export function analyzeMcpSecurity(raw: string) {
  if (!raw.trim()) throw Error('Paste an MCP tool definition or server configuration as JSON.');
  if (raw.length > MCP_LIMITS.bytes || new TextEncoder().encode(raw).length > MCP_LIMITS.bytes) throw Error('Use a representative sample within 100,000 UTF-8 bytes.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw Error('Invalid JSON. Check double quotes, commas and matching braces. Input fragments are never repeated in errors.'); }
  if (!object(parsed) && !Array.isArray(parsed)) throw Error('Use a JSON object or array containing tool definitions or server configuration.');
  const nodes: Node[] = [], stack: Node[] = [{ value: parsed, key: '', path: '$', depth: 0, keys: [] }];
  while (stack.length) {
    const node = stack.pop()!;
    if (nodes.length >= MCP_LIMITS.nodes || node.depth > MCP_LIMITS.depth) throw Error('Use a smaller sample: maximum 5,000 values and 24 nesting levels.');
    nodes.push(node);
    if (node.value !== null && typeof node.value === 'object') {
      const entries = Object.entries(node.value);
      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, value] = entries[i];
        const segment = Array.isArray(node.value) ? `[${i}]` : structuralKeys.has(key) ? `.${key}` : `['field ${i + 1}']`;
        stack.push({ value, key, path: node.path + segment, depth: node.depth + 1, keys: [...node.keys, key] });
      }
    }
  }
  const findings: McpFinding[] = [], seen = new Set<string>();
  const counts: Record<Level, number> = { FAIL: 0, WARN: 0, PASS: 0, INFO: 0 };
  function add(category: Category, level: Level, path: string, evidence: string, why: string, risk: string, direction: string, context = 'Static heuristic from supplied data; implementation and enforcement are not verified.') {
    const id = `${category}|${path}|${evidence}`;
    if (seen.has(id)) return;
    seen.add(id); counts[level]++;
    const finding = { category, level, path, evidence, why, risk, direction, context };
    if (findings.length < MCP_LIMITS.findings) findings.push(finding);
    else {
      const rank = ['FAIL', 'WARN', 'PASS', 'INFO'];
      const lessImportant = findings.findLastIndex(item => rank.indexOf(item.level) > rank.indexOf(level));
      if (lessImportant >= 0) findings[lessImportant] = finding;
    }
  }
  const definitions = nodes.filter(n => !n.keys.includes('inputSchema') && !n.keys.includes('outputSchema') && object(n.value) && (Object.hasOwn(n.value, 'inputSchema') || (typeof own(n.value, 'name') === 'string' && typeof own(n.value, 'description') === 'string' && (n.depth === 0 || n.keys.at(-2) === 'tools' || Array.isArray(parsed) && n.depth === 1))));
  if (definitions.length > MCP_LIMITS.tools) throw Error('Review at most 100 tool definitions at a time.');
  if (!definitions.length) add('Capabilities', 'WARN', '$', 'No recognizable tool definitions supplied', 'Server configuration does not reveal the implementation or all exposed tools.', 'Capability coverage is incomplete.', 'Include a tools/list result or tool definitions; review server launch configuration separately.');
  const names = new Map<string, string>();
  for (const node of definitions) {
    const tool = node.value as JsonObject, name = typeof own(tool, 'name') === 'string' ? tool.name as string : '';
    const text = positiveText(`${name.replace(/[_\-.]/g, ' ')}. ${typeof tool.description === 'string' ? tool.description : ''}`);
    const children = nodes.filter(n => n.path.startsWith(node.path + '.') || n.path.startsWith(node.path + '['));
    const schemaNodes = children.filter(n => n.keys.slice(node.depth).includes('inputSchema'));
    const arbitrary = schemaNodes.some(n => object(n.value) && (/command|shell|exec|sql|query|path|file|url|endpoint/i.test(n.key) || n.value.format === 'uri' || n.value.format === 'uri-reference') && !fixedValue(n.value));
    const actionWords = /\b(?:delete|remove|drop|destroy|revoke|overwrite|deploy|publish|send|execute|write|modify|transfer|refund|payment|pay)\b|\brun (?:a |an )?(?:command|shell|script)\b|\bshell\b/;
    const action = actionWords.test(text) && (schemaNodes.some(n => n.keys.includes('properties')) || /\b(?:files?|directories|database|records?|messages?|email|payments?|money|production|release|commands?|scripts?|shell)\b/.test(text));
    const external = /\b(?:send|publish|upload|email|message|external request|fetch|http request)\b/.test(text);
    const annotations = object(tool.annotations) ? tool.annotations : {};
    if (action || annotations.destructiveHint === true) {
      add('Capabilities', action && arbitrary ? 'FAIL' : 'WARN', node.path, arbitrary ? 'Action capability and unbounded command/path/query/URL field declared' : 'Potentially consequential action declared', 'Names, descriptions and schemas together indicate possible side effects.', 'An unintended invocation could change data or trigger an external action.', 'Restrict affected resources and enforce approval for consequential actions.');
      add('Approval', approval(tool) ? 'INFO' : 'WARN', node.path, approval(tool) ? 'Custom approval requirement declared' : 'No explicit tool-level approval requirement found', 'MCP annotations do not enforce human approval.', 'High-impact actions may run without an effective review boundary.', 'Approval strongly recommended for high-impact actions; verify the client/server gate and denial path.', approval(tool) ? 'Custom declaration only; not a standard MCP enforcement guarantee.' : 'Absence in this sample does not prove the application has no approval gate.');
      if (annotations.readOnlyHint === true) add('Capabilities', 'WARN', `${node.path}.annotations`, 'Read-only hint conflicts with action signals', 'Behavior hints are untrusted declarations.', 'A client could misinterpret the capability.', 'Resolve the mismatch and review actual implementation.');
    } else if (annotations.readOnlyHint === true) add('Capabilities', 'PASS', `${node.path}.annotations`, 'Read-only behavior declared', 'This declaration fits a low-impact starting point.', 'A misleading declaration can still conceal side effects.', 'Verify actual behavior and resource boundaries.', 'PASS covers this declaration only, not server trust or overall safety.');
    if (external) add('Network', 'WARN', node.path, 'External communication or publishing capability described', 'External side effects cross a trust boundary.', 'Data or messages could reach an unintended recipient.', 'Constrain destinations, request sizes and rates; confirm meaningful sends and use redacted audit records.');
    const parent = node.path.slice(0, node.path.lastIndexOf('['));
    if (name && names.has(`${parent}|${name}`)) add('Naming', 'WARN', node.path, 'Duplicate name within the supplied tool collection', 'Clients need an unambiguous tool identity.', 'Selection may be ambiguous.', 'Give tools distinct names and disambiguate servers.', 'Actual shadowing depends on runtime registration and client behavior.');
    if (name) names.set(`${parent}|${name}`, node.path);
    if (/^(?:read|get|list|search)[_.-]/i.test(name) && schemaNodes.some(n => object(n.value) && /command|shell|exec/i.test(n.key) && !fixedValue(n.value))) add('Naming', 'WARN', node.path, 'Read-like name with a free-form execution parameter', 'The declared name and argument surface may imply different powers.', 'A caller may underestimate possible side effects.', 'Align naming with actual behavior and inspect the execution boundary.', 'A parameter name alone does not prove that execution is possible.');
    if (!name || /^(?:run|execute|tool|search|fetch|system|admin|openai|anthropic)$/i.test(name) || /\b(?:trusted|official|system)\b/i.test(name.replace(/[_\-.]/g, ' '))) add('Naming', 'WARN', `${node.path}.name`, 'Missing, generic or trust-implying name', 'Names alone establish neither purpose nor provenance.', 'Collisions or misleading selection may occur.', 'Use a descriptive action/resource name and verify provenance.', 'A naming signal is not evidence of impersonation or exploitation.');
    if (object(tool.inputSchema)) add('Input schema', 'PASS', `${node.path}.inputSchema`, 'Input schema object supplied', 'A declared contract makes review possible.', 'Declaration is not validation or enforcement.', 'Verify server-side validation, including referenced schemas.');
    else add('Input schema', 'WARN', `${node.path}.inputSchema`, 'Missing or non-object input schema', 'Accepted arguments are not clearly reviewable.', 'Unexpected arguments may reach the implementation.', 'Provide a JSON Schema object and enforce it.');
    if (!Object.hasOwn(tool, 'outputSchema')) add('Output exposure', 'INFO', node.path, 'No output schema supplied', 'An output schema is optional in MCP.', 'Output content cannot be classified from this sample.', 'Review actual output, private file contents, logs and raw records for minimal disclosure.');
  }
  for (const node of nodes) {
    const schema = node.keys.includes('inputSchema') || node.keys.includes('outputSchema');
    const output = node.keys.includes('outputSchema');
    const protectedField = sensitiveKey.test(node.key) || personalKey.test(node.key) || output && /file.?contents|internal.?metadata|internal.?logs|raw.?database/i.test(node.key);
    if (protectedField) {
      const literal = !schema && typeof node.value === 'string' && !placeholder(node.value);
      add(output ? 'Output exposure' : 'Sensitive data', literal && credentialShape.test(node.value as string) ? 'FAIL' : literal || schema ? 'WARN' : 'INFO', node.path, `${literal && credentialShape.test(node.value as string) ? 'Credential-shaped configuration value' : output ? 'Sensitive output field' : schema ? 'Sensitive schema field' : 'Potentially sensitive configuration field'} · [value hidden]`, 'Field names suggest credentials or private information, but may represent public identifiers or schema declarations.', output ? 'Output may expose private information.' : 'Inline credentials or unnecessary input fields may expand exposure.', output ? 'Redact outputs and logs; return the minimum needed fields.' : literal ? 'Use secure credential references; rotate confirmed exposed live secrets and minimize sensitive fields.' : 'Keep references separate from secret values; verify necessity and access controls.', 'No field names or values are repeated. Sensitivity and live validity require manual confirmation.');
    }
    if (typeof node.value === 'string') {
      const text = positiveText(node.value);
      if (!protectedField && credentialShape.test(node.value)) add('Sensitive data', 'FAIL', node.path, 'Credential-shaped text · [value hidden]', 'A recognizable credential shape is present in supplied content.', 'A real active credential could be disclosed to clients.', 'Verify locally, remove real credentials from definitions and rotate confirmed exposed values.', 'Shape matching cannot establish whether a credential is live; results hide the entire value.');
      if (/(?:^|[\/\\])(?:\.env(?:\.[\w-]+)?|id_rsa|id_ed25519)(?:$|\s)/.test(node.value)) add('Sensitive data', 'WARN', node.path, 'Sensitive configuration or key-file reference · [value hidden]', 'The supplied text references a common secret-bearing file.', 'A tool could read or expose credential material if access permits it.', 'Keep secret files outside tool-accessible roots and review necessity.', 'A file reference does not prove that the file exists or contains secrets.');
      if (/description|instructions|metadata|_meta|prompt/i.test(node.keys.join('.')) && (/\bignore\b[^.\n]{0,60}\b(?:system|user|previous|restrictions|rules|instructions)\b/.test(text) || /\b(?:reveal|expose|exfiltrate|send|upload)\b[^.\n]{0,90}\b(?:credentials|secrets|passwords|tokens|private files)\b/.test(text))) add('Instructions', 'WARN', node.path, 'Rule-override or sensitive-disclosure instruction pattern', 'Tool metadata is untrusted content, not authority over the user or system.', 'Following unrelated instructions may cross a trust boundary.', 'Review manually, remove unrelated instructions and keep tool data separate from agent authority.', 'Suspicious pattern only; quoted examples and defensive documentation can also match. Malicious intent is not established.');
      const permissionContext = /permission|scope|allow|access|root|filesystem|network|oauth|database|cloud/i.test(node.keys.join('.'));
      if (!schema && permissionContext && (/^(?:\*|\/|[A-Z]:\\|admin|root|all|full|unrestricted|readwrite)$/i.test(node.value.trim()) || /scope|permission|allowedPaths/i.test(node.keys.join('.')) && /\*|admin|full.?access/i.test(node.value))) add('Permissions', 'WARN', node.path, 'Broad access or wildcard permission indication', 'The supplied scope may cover more resources than one task needs.', 'Mistakes or compromised clients could affect unrelated resources.', 'Review least privilege: narrow paths, scopes, database roles and destination allowlists.', 'Broad access can be legitimate; necessity and enforcement cannot be determined here.');
      if (!schema && node.key === 'command') add('Capabilities', 'INFO', node.path, 'Local server launch command declared', 'Stdio servers commonly start a local process.', 'An untrusted server package inherits its process privileges.', 'Verify package provenance, pin reviewed versions and restrict process credentials/resources.', 'A configured command is not by itself an arbitrary-command tool. Nothing is executed.');
      if (node.key === '$ref') add('Input schema', 'INFO', node.path, 'Schema reference is not resolved', 'This static review never fetches external resources or resolves references.', 'Referenced constraints may be absent from these findings.', 'Review referenced schemas with the real validator.');
    }
    if (!schema && node.value === true && /^(?:allowAll|allowAllNetwork|allowAllPaths|unrestricted|admin|root)$/i.test(node.key)) add('Permissions', 'WARN', node.path, 'Broad access flag enabled', 'The configuration explicitly enables a broad-access option.', 'Unrelated resources may be reachable.', 'Review least privilege and verify the actual enforced scope.');
    if (!schema || !object(node.value)) continue;
    const field = node.value;
    const urlField = /url|endpoint/i.test(node.key) || field.format === 'uri' || field.format === 'uri-reference';
    if (!output && (/command|shell|exec|sql|query|path|file/i.test(node.key) || urlField) && !fixedValue(field)) add(urlField ? 'Network' : 'Input schema', 'WARN', node.path, 'Free-form command, query, path or destination field', 'A value contract alone may not restrict which resources can be affected.', 'Unintended paths, queries or destinations may be selected.', 'Use scoped resource identifiers, parameterized operations and validated allowlists; length alone is not authorization.');
    const bound = (key: string) => typeof field[key] === 'number' && Number.isSafeInteger(field[key]) && (field[key] as number) >= 0;
    if (!output && ((field.type === 'string' && !bound('maxLength') && !fixedValue(field)) || (field.type === 'array' && !bound('maxItems')) || (field.type === 'object' && field.additionalProperties !== false && !bound('maxProperties')))) add('Input schema', 'WARN', node.path, 'No visible bound on a flexible input', 'Unbounded strings, arrays and open objects increase review and resource demands.', 'Oversize or unexpected inputs may create excessive work.', 'Add practical length/item/property limits and validation where compatible with legitimate flexibility.', 'A referenced/composed schema may enforce bounds elsewhere; this is not a complete JSON Schema validator.');
    if (!output && /force|skip.?approval|skip.?validation|bypass|recursive/i.test(node.key) && field.type === 'boolean') add('Approval', 'WARN', node.path, 'Safety-sensitive boolean option declared', 'Optional flags can expand impact or bypass safeguards.', 'A routine call may gain destructive reach.', 'Approval may be appropriate; constrain dangerous modes and fail closed rather than trusting the caller.');
  }
  for (const category of mcpCategories) if (!findings.some(f => f.category === category)) add(category, 'INFO', '$', 'No recognized signal in this category', 'Only supplied declarations were inspected.', 'Missing evidence is not evidence of safety.', 'Review runtime implementation, trust and enforcement where applicable.');
  const priority: readonly Category[] = ['Sensitive data', 'Instructions', 'Capabilities', 'Permissions', 'Approval', 'Output exposure', 'Network', 'Input schema', 'Naming'];
  const ordered = findings.sort((a, b) => ['FAIL', 'WARN', 'PASS', 'INFO'].indexOf(a.level) - ['FAIL', 'WARN', 'PASS', 'INFO'].indexOf(b.level) || priority.indexOf(a.category) - priority.indexOf(b.category));
  return { posture: counts.FAIL ? 'High risk signals' : counts.WARN ? 'Needs review' : 'Reasonable baseline', counts, findings: ordered, omitted: Object.values(counts).reduce((a, b) => a + b, 0) - ordered.length, toolCount: definitions.length, firstAction: ordered[0].direction, mainRisk: ordered[0].category, note: 'Static declaration review only. PASS is a narrow observed baseline, never a security certification. Result values and unknown property names are hidden; field labels indicate key positions. The pasted editor remains visible. Annotations and custom approval flags are unverified hints.' };
}

export const mcpExamples = {
  read: { tools: [{ name: 'read_project_status', description: 'Read a project status by its public identifier.', annotations: { readOnlyHint: true }, inputSchema: { type: 'object', properties: { project: { type: 'string', enum: ['example-project'] } }, required: ['project'], additionalProperties: false }, outputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['ready', 'pending'] } }, additionalProperties: false } }] },
  write: { tools: [{ name: 'delete_files', description: 'Delete files at the supplied path.', inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean' } }, additionalProperties: false } }], permissions: { filesystem: { allowedPaths: ['/'], access: 'readwrite' } } },
  network: { tools: [{ name: 'send_request', description: 'Send an HTTP request and body to the supplied destination.', inputSchema: { type: 'object', properties: { url: { type: 'string', format: 'uri' }, body: { type: 'object' } }, additionalProperties: false } }] },
} as const;
