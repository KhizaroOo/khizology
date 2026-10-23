export const SBOM_LIMITS = { bytes: 5 * 1024 * 1024, packages: 5_000, edges: 30_000, depth: 64, values: 200_000, findings: 100 } as const;
export interface SbomFinding { level: 'WARN' | 'INFO'; message: string; count: number }
export interface LockPackage {
  ref: string; name: string; version?: string; purl?: string; license?: string;
  hashes: { alg: string; content: string }[]; hashState: string;
  dev: boolean; optional: boolean; bundled: boolean; devOptional: boolean;
  relation: 'Direct' | 'Transitive' | 'Unclassified'; source: string;
}
export interface LockInventory {
  lockVersion: number; project: { name?: string; version?: string; ref?: string };
  packages: LockPackage[]; graph: { ref: string; dependsOn?: string[] }[];
  incomplete: string[]; findings: SbomFinding[]; edges: number;
}
type Data = Record<string, unknown>;
const isObject = (v: unknown): v is Data => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 214) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v) ? v : undefined;
const packageName = (v: unknown) => { const s = text(v); return s && /^(?:@[A-Za-z0-9~._-]+\/)?[A-Za-z0-9~._-]+$/.test(s) && !['.', '..'].includes(s) ? s : undefined; };
const packageVersion = (v: unknown) => { const s = text(v, 128); return s && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/.test(s) ? s : undefined; };
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export function npmPurl(name: string, version?: string) {
  if (!packageName(name) || !version || !packageVersion(version)) return undefined;
  return `pkg:npm/${name.split('/').map(encode).join('/')}@${encode(version)}`;
}
export function sriHashes(value: unknown) {
  const hashes: LockPackage['hashes'] = [], issues: string[] = [];
  const ambiguous = new Set<string>();
  if (value === undefined) return { hashes, issues, state: 'Not supplied' };
  if (typeof value !== 'string' || value.length > 2_048) return { hashes, issues: ['Invalid integrity data omitted.'], state: 'Omitted: invalid integrity' };
  const algorithms: Record<string, [string, number]> = { sha1: ['SHA-1', 20], sha256: ['SHA-256', 32], sha384: ['SHA-384', 48], sha512: ['SHA-512', 64] };
  for (const token of value.trim().split(/\s+/)) {
    const match = /^([a-zA-Z0-9]+)-([A-Za-z0-9+/]+={0,2})$/.exec(token);
    if (!match) { issues.push('Invalid integrity data omitted.'); continue; }
    const algorithm = algorithms[match[1]];
    if (!algorithm) { issues.push('Unsupported integrity algorithm omitted.'); continue; }
    try {
      const bytes = atob(match[2]);
      if (bytes.length !== algorithm[1] || btoa(bytes).replace(/=+$/, '') !== match[2].replace(/=+$/, '')) throw new Error();
      const hash = { alg: algorithm[0], content: Array.from(bytes, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') };
      if (ambiguous.has(hash.alg)) continue;
      if (hashes.some(h => h.alg === hash.alg && h.content !== hash.content)) { ambiguous.add(hash.alg); for (let i = hashes.length - 1; i >= 0; i--) if (hashes[i].alg === hash.alg) hashes.splice(i, 1); issues.push('Alternative digests for one algorithm omitted; a single artifact digest cannot be determined.'); continue; }
      if (!hashes.some(h => h.alg === hash.alg && h.content === hash.content)) hashes.push(hash);
    } catch { issues.push('Invalid integrity digest length or Base64 omitted.'); }
  }
  return { hashes, issues, state: hashes.length ? `${hashes.length} converted${issues.length ? '; some omitted' : ''}` : 'Omitted: no usable digest' };
}

function parseBounded(input: string): Data {
  if (!input.trim()) throw new Error('Paste or select a package-lock.json file.');
  if (input.length > SBOM_LIMITS.bytes || new TextEncoder().encode(input).length > SBOM_LIMITS.bytes) throw new Error('Input exceeds the 5 MiB limit.');
  let depth = 0, quoted = false, escaped = false;
  for (const c of input) {
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') { if (++depth > SBOM_LIMITS.depth) throw new Error('JSON nesting exceeds 64 levels.'); }
    else if (c === '}' || c === ']') depth--;
  }
  let values = 0;
  const data: unknown = JSON.parse(input, (key, v: unknown) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Prototype-sensitive object keys are unsupported; no SBOM was generated.');
    if (++values > SBOM_LIMITS.values) throw new Error('JSON contains too many values.');
    return v;
  });
  if (!isObject(data)) throw new Error('Expected a package-lock.json object, not an array or primitive.');
  return data;
}

export function parseNpmLock(input: string): LockInventory {
  let data: Data;
  try { data = parseBounded(input); }
  catch (e) { if (e instanceof SyntaxError) throw new Error('Malformed JSON. Check the supplied file; parser excerpts are intentionally hidden.'); throw e; }
  if (data.lockfileVersion !== 2 && data.lockfileVersion !== 3) throw new Error('Only npm package-lock versions 2 and 3 are supported. Version 1, yarn and pnpm need a different parser; no partial SBOM was generated.');
  if (!isObject(data.packages)) throw new Error('Modern npm lockfiles require a packages object. No dependency inventory was generated.');
  const entries = Object.entries(data.packages).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  if (entries.length > SBOM_LIMITS.packages + 1) throw new Error('Lockfile exceeds the 5,000 package-location limit.');
  const findingsMap = new Map<string, SbomFinding>();
  function finding(message: string, level: SbomFinding['level'] = 'WARN') {
    const old = findingsMap.get(message);
    if (old) old.count++; else if (findingsMap.size < SBOM_LIMITS.findings) findingsMap.set(message, { level, message, count: 1 });
  }
  const root = isObject(data.packages['']) ? data.packages[''] : undefined;
  const project = { name: packageName(root?.name) ?? packageName(data.name), version: packageVersion(root?.version) ?? packageVersion(data.version) };
  if (!project.name || !project.version) finding('Root project name/version is missing or unusable; absent values are not invented.');
  if (root?.name && data.name && root.name !== data.name || root?.version && data.version && root.version !== data.version) finding('Root descriptor and top-level project metadata conflict; the root descriptor takes precedence.');
  if (!root) finding('Root package descriptor is absent. Direct relationships cannot be established from installed locations alone.');
  const projectRef = project.name ? 'toolooo:application' : undefined;
  const records = new Map<string, Data>();
  const packages: LockPackage[] = [], byPath = new Map<string, LockPackage>(), links = new Map<string, string>(), identityCounts = new Map<string, number>(), identityMetadata = new Map<string, string>();
  for (const [path, info] of entries) {
    if (!path) continue;
    if (path.length > 2_048 || path.split('/').length > 64 || path.startsWith('/') || path.includes('\\') || path.split('/').some(p => p === '..' || p === '.' || !p) || !isObject(info)) { finding('Invalid or unsupported package location/descriptor omitted.'); continue; }
    records.set(path, info);
    if (info.link === true) { if (typeof info.resolved === 'string') links.set(path, info.resolved.replace(/^\.\//, '')); else finding('Unresolved local/workspace link omitted.'); continue; }
    const installedName = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)$/.exec(path)?.[1];
    const name = packageName(info.name) ?? packageName(installedName);
    if (!name) { finding('A package has no usable name and was omitted; no filesystem path was used as its name.'); continue; }
    if (info.name !== undefined && !packageName(info.name)) finding('Invalid explicit package name; installed npm alias was used where available.');
    const version = packageVersion(info.version);
    if (!version) finding('Package version missing or not an exact supported version; version and PURL omitted.');
    const purl = npmPurl(name, version), identity = `${name}@${version ?? ''}`, occurrence = (identityCounts.get(identity) ?? 0) + 1;
    identityCounts.set(identity, occurrence);
    if (occurrence > 1) finding('Repeated component identity retained as separate installation references; dependency subtrees and metadata may differ.', 'INFO');
    const hash = sriHashes(info.integrity); for (const issue of hash.issues) finding(issue);
    const declaredLicense = text(info.license, 200);
    const license = declaredLicense && !/SEE LICENSE IN|https?:|file:|[\\/]/i.test(declaredLicense) ? declaredLicense : undefined;
    if (info.license !== undefined && !license) finding('Unusable license declaration omitted; license text/paths are not guessed.');
    const signature = JSON.stringify([hash.hashes, license]);
    if (identityMetadata.has(identity) && identityMetadata.get(identity) !== signature) finding('Repeated component identity has conflicting hash/license metadata; installations are kept separate, not reconciled.');
    identityMetadata.set(identity, signature);
    const source = typeof info.resolved !== 'string' ? 'Not supplied' : /^https?:\/\/registry\.npmjs\.org\//.test(info.resolved) ? 'npm registry URL omitted' : /^(?:git|github|gitlab|bitbucket)/.test(info.resolved) ? 'Git source omitted' : /^(?:file:|\.\.?\/|\/|[A-Za-z]:)/.test(info.resolved) ? 'Local source omitted' : 'Other source omitted';
    const row: LockPackage = { ref: `toolooo:npm:${encode(name)}@${version ? encode(version) : 'unversioned'}:${occurrence}`, name, ...(version ? { version } : {}), ...(purl ? { purl } : {}), ...(license ? { license } : {}), hashes: hash.hashes, hashState: hash.state, dev: info.dev === true, optional: info.optional === true, bundled: info.inBundle === true, devOptional: info.devOptional === true, relation: 'Unclassified', source };
    packages.push(row); byPath.set(path, row);
  }
  if (links.size) finding('Workspace/local links are mapped only to supplied targets. Workspace auto-linking and missing targets may leave relationships incomplete.');
  function at(path: string) {
    const visited = new Set<string>();
    while (links.has(path)) { if (visited.has(path) || visited.size >= SBOM_LIMITS.depth) return undefined; visited.add(path); path = links.get(path)!; }
    return byPath.get(path);
  }
  function resolve(from: string, name: string) {
    let parent = from;
    for (;;) {
      const found = at(`${parent ? `${parent}/` : ''}node_modules/${name}`);
      if (found) return found;
      if (!parent) return undefined;
      const slash = parent.lastIndexOf('/'); parent = slash < 0 ? '' : parent.slice(0, slash);
    }
  }
  const graph: LockInventory['graph'] = [], incomplete = new Set<string>(), direct = new Set<string>();
  if (!root && projectRef) incomplete.add(projectRef);
  let edges = 0, declarations = 0;
  function dependencies(path: string, info: Data, ref: string | undefined, isRoot: boolean) {
    const names = new Map<string, { peer: boolean; optional: boolean }>(); let uncertain = false;
    if (info.hasShrinkwrap === true || info.bundleDependencies !== undefined || info.bundledDependencies !== undefined) { uncertain = true; finding('Nested shrinkwrap/bundled dependency contents cannot be verified from this descriptor alone; graph node marked incomplete.'); }
    for (const key of ['dependencies', ...(isRoot || !path.includes('node_modules/') ? ['devDependencies'] : []), 'optionalDependencies', 'peerDependencies']) {
      const fields = info[key]; if (fields === undefined) continue;
      if (!isObject(fields)) { uncertain = true; finding('Invalid dependency declaration map; affected graph node marked incomplete.'); continue; }
      for (const [name, requirement] of Object.entries(fields)) {
        if (++declarations > SBOM_LIMITS.edges) throw new Error('Dependency declarations exceed the 30,000 limit.');
        if (!packageName(name) || typeof requirement !== 'string') { uncertain = true; finding('Invalid dependency declaration omitted; affected graph node marked incomplete.'); continue; }
        if (key === 'peerDependencies' && names.has(name)) continue;
        const peerInfo = isObject(info.peerDependenciesMeta) && isObject(info.peerDependenciesMeta[name]) ? info.peerDependenciesMeta[name] : undefined;
        names.set(name, { peer: key === 'peerDependencies', optional: key === 'optionalDependencies' || key === 'peerDependencies' && peerInfo?.optional === true });
      }
    }
    const targets = new Set<string>();
    for (const [name, kind] of names) {
      const from = kind.peer && !isRoot ? path.slice(0, Math.max(0, path.lastIndexOf('/'))) : path;
      const target = resolve(from, name);
      if (target) { targets.add(target.ref); if (isRoot) direct.add(target.ref); }
      else { uncertain = true; finding(kind.optional ? 'Optional dependency/peer is not present in supplied locations; affected relationships are incomplete, not a security finding.' : 'Unresolved dependency reference; affected relationships are incomplete.'); }
    }
    if (!ref) return;
    if (isRoot && info.workspaces !== undefined) { uncertain = true; finding('Workspace auto-link relationships are not inferred from glob patterns.'); }
    if (!isRoot && !packageVersion(info.version) && !names.size) uncertain = true;
    const dependsOn = [...targets].sort(); edges += dependsOn.length;
    if (edges > SBOM_LIMITS.edges) throw new Error('Resolved graph exceeds the 30,000 edge limit.');
    // Unknown leaves are opaque, never silently represented as dependency-free.
    graph.push(uncertain && !dependsOn.length ? { ref } : { ref, dependsOn });
    if (uncertain) incomplete.add(ref);
  }
  if (root) dependencies('', root, projectRef, true);
  if (!projectRef) finding('Root application component and its graph node are omitted because project name is unavailable.');
  for (const [path, row] of byPath) dependencies(path, records.get(path)!, row.ref, false);
  for (const path of links.keys()) if (!at(path)) finding('Unresolved or cyclic local/workspace link omitted.');
  const adjacency = new Map(graph.map(g => [g.ref, g.dependsOn ?? []]));
  const reachable = new Set(direct), queue = [...direct];
  for (let i = 0; i < queue.length; i++) for (const child of adjacency.get(queue[i]) ?? []) if (!reachable.has(child)) { reachable.add(child); queue.push(child); }
  for (const row of packages) row.relation = direct.has(row.ref) ? 'Direct' : reachable.has(row.ref) ? 'Transitive' : 'Unclassified';
  if (packages.some(p => p.relation === 'Unclassified')) finding('Some components are not reachable from known root declarations. They are unclassified, not assumed transitive.');
  finding('Resolved URLs, local paths and integrity strings are omitted; only converted hashes and supplied safe license declarations enter the BOM.', 'INFO');
  finding('Lockfile declarations and installed locations inform the graph; dependency range compatibility, runtime loading and deployment contents are not verified.', 'INFO');
  return { lockVersion: data.lockfileVersion, project: { ...project, ...(projectRef ? { ref: projectRef } : {}) }, packages, graph, incomplete: [...incomplete].sort(), findings: [...findingsMap.values()], edges };
}
