export type DriftCategory = 'removed' | 'type-change' | 'nullability-change' | 'shape-change' | 'added' | 'array-review';
export type DriftRisk = 'likely-breaking' | 'needs-review' | 'additive';
export interface DriftItem { path: string; category: DriftCategory; risk: DriftRisk; expected: string; actual: string; impact: string; }
export interface ContractDriftResult { items: DriftItem[]; expectedError?: string; actualError?: string; limited: boolean; }

const MAX_NODES = 1_500;
const MAX_ARRAY_ITEMS = 80;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const kindOf = (value: unknown): string => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
const join = (parent: string, key: string) => parent ? `${parent}.${key}` : key;
const itemPath = (path: string) => `${path}[]`;

function impact(category: DriftCategory, actual: string) {
  if (category === 'removed') return 'Consumers that read this field may fail validation or fall back unexpectedly.';
  if (category === 'added') return 'Usually additive, but strict consumers can reject unknown properties.';
  if (category === 'nullability-change') return actual === 'null' ? 'Consumers need an explicit null-handling path.' : 'Consumers may now receive a value where null was expected.';
  if (category === 'shape-change') return 'Consumers expecting the previous container shape may fail to parse it.';
  if (category === 'array-review') return 'Array samples are heterogeneous, so one example cannot prove the full item contract.';
  return 'Consumers expecting the previous type may fail validation, parsing, or serialization.';
}
function riskFor(category: DriftCategory): DriftRisk {
  if (category === 'added') return 'additive';
  if (category === 'nullability-change' || category === 'array-review') return 'needs-review';
  return 'likely-breaking';
}
function add(items: DriftItem[], path: string, category: DriftCategory, expected: string, actual: string) {
  items.push({ path: path || '(root)', category, risk: riskFor(category), expected, actual, impact: impact(category, actual) });
}

function arrayProfile(values: unknown[]) {
  const sample = values.slice(0, MAX_ARRAY_ITEMS);
  const kinds = new Set(sample.map(kindOf));
  const objects = sample.filter(isObject);
  const keySets = objects.map(item => Object.keys(item).sort().join('|'));
  return { sample, kinds, objects, heterogeneous: kinds.size > 1 || new Set(keySets).size > 1 };
}

function compareArrays(expected: unknown[], actual: unknown[], path: string, items: DriftItem[], state: { nodes: number; limited: boolean }) {
  const left = arrayProfile(expected);
  const right = arrayProfile(actual);
  if (left.heterogeneous || right.heterogeneous) add(items, itemPath(path), 'array-review', 'heterogeneous items', 'heterogeneous items');
  const leftKinds = [...left.kinds].sort().join(' | ') || 'empty';
  const rightKinds = [...right.kinds].sort().join(' | ') || 'empty';
  if (leftKinds !== rightKinds && left.sample.length && right.sample.length) {
    add(items, itemPath(path), 'shape-change', `items: ${leftKinds}`, `items: ${rightKinds}`);
    return;
  }
  if (left.objects.length && right.objects.length) compareNode(left.objects[0], right.objects[0], itemPath(path), items, state);
}

function compareNode(expected: unknown, actual: unknown, path: string, items: DriftItem[], state: { nodes: number; limited: boolean }) {
  if (state.nodes++ >= MAX_NODES) { state.limited = true; return; }
  const expectedKind = kindOf(expected);
  const actualKind = kindOf(actual);
  if (expectedKind !== actualKind) {
    if (expectedKind === 'null' || actualKind === 'null') add(items, path, 'nullability-change', expectedKind, actualKind);
    else if (expectedKind === 'array' || actualKind === 'array' || expectedKind === 'object' || actualKind === 'object') add(items, path, 'shape-change', expectedKind, actualKind);
    else add(items, path, 'type-change', expectedKind, actualKind);
    return;
  }
  if (isObject(expected) && isObject(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      const nextPath = join(path, key);
      if (!(key in actual)) add(items, nextPath, 'removed', kindOf(expected[key]), 'missing');
      else if (!(key in expected)) add(items, nextPath, 'added', 'missing', kindOf(actual[key]));
      else compareNode(expected[key], actual[key], nextPath, items, state);
    }
  } else if (Array.isArray(expected) && Array.isArray(actual)) compareArrays(expected, actual, path, items, state);
}

export function compareContractValues(expected: unknown, actual: unknown): ContractDriftResult {
  const state = { nodes: 0, limited: false };
  const items: DriftItem[] = [];
  compareNode(expected, actual, '', items, state);
  return { items, limited: state.limited };
}

export function compareContractJson(expectedRaw: string, actualRaw: string): ContractDriftResult {
  let expected: unknown;
  let actual: unknown;
  let expectedError: string | undefined;
  let actualError: string | undefined;
  try { expected = JSON.parse(expectedRaw); } catch (error) { expectedError = (error as Error).message; }
  try { actual = JSON.parse(actualRaw); } catch (error) { actualError = (error as Error).message; }
  if (expectedError || actualError) return { items: [], expectedError, actualError, limited: false };
  return compareContractValues(expected, actual);
}

export function driftSummary(items: DriftItem[]) {
  return { likelyBreaking: items.filter(item => item.risk === 'likely-breaking').length, needsReview: items.filter(item => item.risk === 'needs-review').length, additive: items.filter(item => item.risk === 'additive').length };
}

export function guardrailFor(item: DriftItem) {
  const path = item.path.replace(/\[\]/g, '[0]');
  const segments = path.split('.').filter(Boolean);
  const leaf = segments.at(-1) || 'value';
  const type = item.expected === 'number' || item.expected === 'boolean' || item.expected === 'string' || item.expected === 'array' || item.expected === 'object' ? item.expected : 'string';
  const schema = JSON.stringify({ type: 'object', properties: { [leaf]: { type } }, ...(item.category === 'removed' ? { required: [leaf] } : {}) }, null, 2);
  const assertion = type === 'array' ? `pm.expect(pm.response.json().${path}).to.be.an('array');` : type === 'object' ? `pm.expect(pm.response.json().${path}).to.be.an('object');` : `pm.expect(pm.response.json().${path}).to.be.a('${type}');`;
  return { schema, assertion, note: 'This guardrail is inferred from observed samples. Review it against the authoritative API contract before adopting it.' };
}
