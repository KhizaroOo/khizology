/** Sample-shape inference only. Payload values never leave this in-memory model. */
export type SchemaInputFormat = 'json' | 'csv';
export type SchemaValueType = 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';
export type SchemaChangeKind = 'added' | 'removed' | 'type' | 'shape' | 'nullability' | 'presence' | 'required';

export const SCHEMA_LIMITS = {
  inputBytes: 500_000,
  paths: 2_000,
  visits: 50_000,
  depth: 30,
  keyLength: 200,
  csvRows: 2_000,
  csvColumns: 100,
  rulePaths: 50,
  ruleCharacters: 4_000,
  arraySamples: 200,
} as const;

export interface SchemaCompareOptions {
  caseSensitive: boolean;
  arraySampleLimit: number;
  csvInferTypes: boolean;
  requiredPaths: string;
  ignoredPaths: string;
}

export const DEFAULT_SCHEMA_OPTIONS: SchemaCompareOptions = {
  caseSensitive: true,
  arraySampleLimit: 50,
  csvInferTypes: true,
  requiredPaths: '',
  ignoredPaths: '',
};

interface ParsedInput {
  value: unknown;
  bytes: number;
  format: SchemaInputFormat;
  csvRows: number | null;
}

export interface SchemaNode {
  key: string;
  path: string;
  name: string;
  parentKey: string | null;
  relation: 'root' | 'field' | 'item';
  depth: number;
  types: Set<SchemaValueType>;
  observations: number;
  objectCount: number;
  arrayCount: number;
  arrayItems: number;
  sampledItems: number;
}

export interface InferredSchema {
  nodes: Map<string, SchemaNode>;
  bytes: number;
  format: SchemaInputFormat;
  csvRows: number | null;
  visits: number;
  sampledItems: number;
  skippedItems: number;
  emptyArrays: number;
}

export interface SchemaChange {
  id: string;
  key: string;
  path: string;
  kind: SchemaChangeKind;
  label: string;
  potentiallyBreaking: boolean;
  why: string;
  action: string;
  required?: boolean;
}

export interface SchemaRow {
  key: string;
  path: string;
  depth: number;
  before?: SchemaNode;
  after?: SchemaNode;
  changes: SchemaChange[];
  unverifiedReason: string | null;
  required: boolean;
}

export interface PossibleSchemaRename {
  before: string;
  after: string;
  reason: string;
}

export interface SchemaComparison {
  before: InferredSchema;
  after: InferredSchema;
  rows: SchemaRow[];
  changes: SchemaChange[];
  renames: PossibleSchemaRename[];
  notes: string[];
  ignoredCount: number;
  affectedPaths: number;
  potentiallyBreaking: number;
  lowerRisk: number;
  unverifiedPaths: number;
}

export type SchemaAnalysis =
  | { ok: true; comparison: SchemaComparison }
  | { ok: false; errors: { side: 'Before' | 'After' | 'Options'; message: string }[] };

class SampleError extends Error {}

function fieldPath(parent: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${parent}.${key}`
    : `${parent}[${JSON.stringify(key)}]`;
}

function normalizedKey(path: string, caseSensitive: boolean): string {
  return caseSensitive ? path : path.toLowerCase();
}

/** Normalizes user-facing paths without evaluating expressions or accepting array indexes. */
function normalizeRulePath(raw: string, caseSensitive: boolean): string {
  const source = raw.startsWith('$') ? raw : raw.startsWith('[') ? `$${raw}` : `$.${raw}`;
  let result = '$';
  let position = 1;
  while (position < source.length) {
    if (source[position] === '.') {
      const match = source.slice(position + 1).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
      if (!match) throw new SampleError('Use paths such as $.customer.id or $.items[].sku, one per line. Use [] for sampled array items.');
      result = fieldPath(result, match[0]);
      position += match[0].length + 1;
    } else if (source.slice(position, position + 2) === '[]') {
      result += '[]';
      position += 2;
    } else if (source.slice(position, position + 2) === '["') {
      let end = position + 2;
      let escaped = false;
      for (; end < source.length; end += 1) {
        if (escaped) { escaped = false; continue; }
        if (source[end] === '\\') { escaped = true; continue; }
        if (source[end] === '"') break;
      }
      if (source[end + 1] !== ']') throw new SampleError('A quoted field path is incomplete. Copy a path from the schema view.');
      let key: unknown;
      try { key = JSON.parse(source.slice(position + 1, end + 1)); }
      catch { throw new SampleError('A quoted field path is invalid. Copy a path from the schema view.'); }
      if (typeof key !== 'string') throw new SampleError('Field paths must name object keys or use [] for array items.');
      result = fieldPath(result, key);
      position = end + 2;
    } else {
      throw new SampleError('Use paths such as $.customer.id or $.items[].sku, one per line. Use [] for sampled array items.');
    }
  }
  return normalizedKey(result, caseSensitive);
}

function readRules(raw: string, caseSensitive: boolean): string[] {
  if (raw.length > SCHEMA_LIMITS.ruleCharacters) throw new SampleError('Keep each field list under 4,000 characters.');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > SCHEMA_LIMITS.rulePaths) throw new SampleError('Use at most 50 required or ignored paths in each list.');
  return [...new Set(lines.map((line) => normalizeRulePath(line, caseSensitive)))];
}

function isDescendantOrSame(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(`${ancestor}.`) || path.startsWith(`${ancestor}[`);
}

function inferCsvCell(cell: string, inferTypes: boolean): unknown {
  if (!inferTypes) return cell;
  const value = cell.trim();
  if (value === '') return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  // Entire-string matching preserves identifiers such as 001 and values such as 12abc.
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return cell;
}

/** Small strict comma-delimited CSV reader: quotes, CRLF, escaped quotes and embedded newlines. */
function parseCsv(raw: string, inferTypes: boolean): { value: unknown[]; rows: number } {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  let rowStarted = false;

  const endCell = () => {
    row.push(cell);
    if (row.length > SCHEMA_LIMITS.csvColumns) throw new SampleError('This CSV exceeds 100 columns. Compare a smaller set of fields.');
    cell = '';
    closedQuote = false;
  };
  const endRow = () => {
    if (!rowStarted && row.length === 0 && cell === '') return;
    endCell();
    records.push(row);
    if (records.length > SCHEMA_LIMITS.csvRows + 1) throw new SampleError('This CSV exceeds 2,000 data rows. Compare a representative local sample.');
    row = [];
    rowStarted = false;
  };

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (char === '"') {
        if (raw[index + 1] === '"') { cell += '"'; index += 1; }
        else { quoted = false; closedQuote = true; }
      } else cell += char;
      continue;
    }
    if (char === ',') { rowStarted = true; endCell(); continue; }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && raw[index + 1] === '\n') index += 1;
      endRow();
      continue;
    }
    if (closedQuote) throw new SampleError('Invalid CSV: only a comma or newline may follow a closing quote.');
    if (char === '"') {
      if (cell !== '') throw new SampleError('Invalid CSV: quotes must begin a field; escape quotes inside quoted fields by doubling them.');
      quoted = true;
      rowStarted = true;
    } else { cell += char; rowStarted = true; }
  }
  if (quoted) throw new SampleError('Invalid CSV: a quoted field was not closed.');
  endRow();
  if (records.length === 0) throw new SampleError('Add a CSV header row and at least one data row.');
  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new SampleError('Every CSV column needs a non-empty header.');
  if (headers.some((header) => header.length > SCHEMA_LIMITS.keyLength)) throw new SampleError('A CSV header exceeds 200 characters. Shorten the field name in your sample.');
  if (new Set(headers).size !== headers.length) throw new SampleError('CSV headers must be unique. Duplicate columns cannot be compared safely.');
  if (records.length < 2) throw new SampleError('This CSV has headers but no data rows. Add a row so field types can be observed.');
  const value = records.slice(1).map((cells, index) => {
    if (cells.length !== headers.length) throw new SampleError(`CSV data row ${index + 1} has ${cells.length} columns; the header has ${headers.length}.`);
    const record: Record<string, unknown> = Object.create(null);
    headers.forEach((header, column) => { record[header] = inferCsvCell(cells[column], inferTypes); });
    return record;
  });
  return { value, rows: value.length };
}

function parseInput(raw: string, format: SchemaInputFormat, inferTypes: boolean): ParsedInput {
  if (!raw.trim()) throw new SampleError('Paste a sample or choose a local JSON or CSV file.');
  if (raw.length > SCHEMA_LIMITS.inputBytes) throw new SampleError('Keep each input under 500 KB. Compare a smaller representative sample.');
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes > SCHEMA_LIMITS.inputBytes) throw new SampleError('Keep each input under 500 KB. Compare a smaller representative sample.');
  const text = raw.replace(/^\uFEFF/, '');
  if (format === 'csv') {
    const parsed = parseCsv(text, inferTypes);
    return { value: parsed.value, bytes, format, csvRows: parsed.rows };
  }
  let value: unknown;
  try { value = JSON.parse(text); }
  catch {
    // Browser SyntaxError messages can contain payload values. Do not surface them.
    throw new SampleError('Invalid JSON. Check quotes, commas, brackets and trailing commas. JSON comments are not supported.');
  }
  return { value, bytes, format, csvRows: null };
}

function inferSchema(parsed: ParsedInput, options: SchemaCompareOptions): InferredSchema {
  const schema: InferredSchema = {
    nodes: new Map(), bytes: parsed.bytes, format: parsed.format, csvRows: parsed.csvRows,
    visits: 0, sampledItems: 0, skippedItems: 0, emptyArrays: 0,
  };
  const sampleLimit = Math.max(1, Math.min(SCHEMA_LIMITS.arraySamples, Math.floor(options.arraySampleLimit)));
  const visit = (value: unknown, path: string, parentKey: string | null, relation: SchemaNode['relation'], name: string, depth: number) => {
    schema.visits += 1;
    if (schema.visits > SCHEMA_LIMITS.visits) throw new SampleError('This sample needs more than 50,000 value inspections. Reduce array sampling or input size.');
    if (depth > SCHEMA_LIMITS.depth) throw new SampleError('Nesting exceeds 30 levels. Compare a shallower representative sample.');
    const type: SchemaValueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value as SchemaValueType;
    if (type === 'number' && !Number.isFinite(value)) throw new SampleError('A number is outside the browser’s finite range. Reduce the numeric value in your sample.');
    const key = normalizedKey(path, options.caseSensitive);
    let node = schema.nodes.get(key);
    if (!node) {
      if (schema.nodes.size >= SCHEMA_LIMITS.paths) throw new SampleError('This sample contains more than 2,000 distinct paths. Compare a smaller part of the contract.');
      node = { key, path, name, parentKey, relation, depth, types: new Set(), observations: 0, objectCount: 0, arrayCount: 0, arrayItems: 0, sampledItems: 0 };
      schema.nodes.set(key, node);
    }
    node.types.add(type);
    node.observations += 1;
    if (Array.isArray(value)) {
      node.arrayCount += 1;
      node.arrayItems += value.length;
      const count = Math.min(value.length, sampleLimit);
      node.sampledItems += count;
      schema.sampledItems += count;
      schema.skippedItems += value.length - count;
      if (value.length === 0) schema.emptyArrays += 1;
      for (let index = 0; index < count; index += 1) visit(value[index], `${path}[]`, key, 'item', '[]', depth + 1);
    } else if (value !== null && typeof value === 'object') {
      node.objectCount += 1;
      const entries = Object.entries(value);
      if (!options.caseSensitive) {
        const names = entries.map(([field]) => field.toLowerCase());
        if (new Set(names).size !== names.length) throw new SampleError('An object has keys that differ only by letter case. Enable case-sensitive comparison to keep both fields distinct.');
      }
      for (const [field, item] of entries) {
        if (field.length > SCHEMA_LIMITS.keyLength) throw new SampleError('A field name exceeds 200 characters. Shorten the field name in your sample.');
        visit(item, fieldPath(path, field), key, 'field', field, depth + 1);
      }
    }
  };
  visit(parsed.value, '$', null, 'root', '$', 0);
  return schema;
}

export function schemaTypeLabel(node?: SchemaNode): string {
  if (!node) return 'Not observed';
  const order: SchemaValueType[] = ['object', 'array', 'string', 'number', 'boolean', 'null'];
  return order.filter((type) => node.types.has(type)).join(' | ');
}

export function schemaPresenceLabel(node: SchemaNode | undefined, schema: InferredSchema): string | null {
  if (!node || node.relation !== 'field' || !node.parentKey) return null;
  const parents = schema.nodes.get(node.parentKey)?.objectCount ?? 0;
  return parents > 1 ? `Present in ${node.observations} of ${parents} sampled objects` : null;
}

function isPartlyMissing(node: SchemaNode, schema: InferredSchema): boolean {
  return node.relation === 'field' && node.parentKey !== null && node.observations < (schema.nodes.get(node.parentKey)?.objectCount ?? 0);
}

/** Required paths must remain reachable when an ancestor is missing, null or the wrong shape. */
function requiredPathIncomplete(node: SchemaNode, schema: InferredSchema): boolean {
  let current: SchemaNode | undefined = node;
  while (current) {
    if (isPartlyMissing(current, schema)) return true;
    const parent: SchemaNode | undefined = current.parentKey ? schema.nodes.get(current.parentKey) : undefined;
    if (parent && current.relation === 'field' && parent.objectCount < parent.observations) return true;
    if (parent && current.relation === 'item' && parent.arrayCount < parent.observations) return true;
    current = parent;
  }
  return false;
}

function unseenAncestor(path: string, source: InferredSchema, other: InferredSchema): 'array' | 'null' | null {
  let current = source.nodes.get(path);
  while (current?.parentKey) {
    const otherParent = other.nodes.get(current.parentKey);
    if (otherParent?.types.has('array') && otherParent.sampledItems === 0 && current.relation === 'item') return 'array';
    if (otherParent?.types.size === 1 && otherParent.types.has('null')) return 'null';
    current = source.nodes.get(current.parentKey);
  }
  return null;
}

function renameCandidates(rows: SchemaRow[]): PossibleSchemaRename[] {
  const removed = rows.filter((row) => row.before?.relation === 'field' && row.changes.some((change) => change.kind === 'removed')).slice(0, 100);
  const added = rows.filter((row) => row.after?.relation === 'field' && row.changes.some((change) => change.kind === 'added')).slice(0, 100);
  const tokens = (name: string) => new Set(name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
  const candidates: { before: SchemaRow; after: SchemaRow; score: number }[] = [];
  for (const from of removed) {
    for (const to of added) {
      if (!from.before || !to.after || from.before.parentKey !== to.after.parentKey) continue;
      if (schemaTypeLabel(from.before) !== schemaTypeLabel(to.after)) continue;
      if (from.before.types.has('array') || from.before.types.has('object')) continue;
      const a = tokens(from.before.name);
      const b = tokens(to.after.name);
      const common = [...a].filter((token) => b.has(token));
      const score = (2 * common.length) / Math.max(a.size + b.size, 1);
      if (common.length > 0 && score >= 0.5) candidates.push({ before: from, after: to, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const used = new Set<string>();
  const result: PossibleSchemaRename[] = [];
  for (const candidate of candidates) {
    if (used.has(candidate.before.key) || used.has(candidate.after.key)) continue;
    const ambiguous = candidates.some((other) => other !== candidate && other.score === candidate.score && (other.before.key === candidate.before.key || other.after.key === candidate.after.key));
    if (ambiguous) continue;
    used.add(candidate.before.key);
    used.add(candidate.after.key);
    result.push({ before: candidate.before.path, after: candidate.after.path, reason: 'Similar field names, the same parent and matching observed types. Confirm the meaning with the producer; values were not matched.' });
    if (result.length === 8) break;
  }
  return result;
}

function compareSchemas(before: InferredSchema, after: InferredSchema, options: SchemaCompareOptions, required: string[], ignored: string[]): SchemaComparison {
  const notes: string[] = [];
  const keys = [...new Set([...before.nodes.keys(), ...after.nodes.keys(), ...required])];
  const rows: SchemaRow[] = [];
  let ignoredCount = 0;
  const activeRequired = required.filter((path) => !ignored.some((rule) => isDescendantOrSame(path, rule)));
  const skippedRequirements = required.length - activeRequired.length;
  if (skippedRequirements) notes.push(`${skippedRequirements} required path${skippedRequirements === 1 ? ' is' : 's are'} also ignored. Ignore rules take priority; remove the overlap to check those requirements.`);
  if (!options.caseSensitive) notes.push('Letter case is ignored when matching field names. Keys that differ only by case within one object are rejected as ambiguous.');

  for (const key of keys) {
    if (ignored.some((rule) => isDescendantOrSame(key, rule))) { ignoredCount += 1; continue; }
    const a = before.nodes.get(key);
    const b = after.nodes.get(key);
    const row: SchemaRow = { key, path: b?.path ?? a?.path ?? key, depth: b?.depth ?? a?.depth ?? 1, before: a, after: b, changes: [], unverifiedReason: null, required: activeRequired.includes(key) };
    const add = (kind: SchemaChangeKind, label: string, potentiallyBreaking: boolean, why: string, action: string) => {
      row.changes.push({ id: `${key}:${kind}`, key, path: row.path, kind, label, potentiallyBreaking, why, action });
    };
    if (!a && b) {
      const unknown = unseenAncestor(key, after, before);
      if (unknown) row.unverifiedReason = `Before has ${unknown === 'array' ? 'no sampled array items' : 'only null at a parent path'}, so this field’s earlier shape is unknown.`;
      else add('added', 'Added / unexpected', false, 'After includes a path not observed in Before. This is usually additive for tolerant readers; strict consumers may reject unexpected fields.', 'Check additional-field validation and update the consumer model if the new field should be used.');
    } else if (a && !b) {
      const unknown = unseenAncestor(key, before, after);
      if (unknown) row.unverifiedReason = `After has ${unknown === 'array' ? 'no sampled array items' : 'only null at a parent path'}, so this field’s shape cannot be checked from these samples.`;
      else add('removed', 'Removed', true, 'This path was observed in Before but is absent from the inspected After structure. Consumers that still read it may need a fallback or migration.', 'Confirm whether consumers require this field, then review the producer and consumer migration together.');
    } else if (a && b) {
      const oldTypes = [...a.types].filter((type) => type !== 'null').sort();
      const newTypes = [...b.types].filter((type) => type !== 'null').sort();
      if (Boolean(oldTypes.length) !== Boolean(newTypes.length)) {
        row.unverifiedReason = `${oldTypes.length ? 'After' : 'Before'} has only null at this path, so its non-null type cannot be compared. The other sample reveals ${oldTypes.length ? oldTypes.join(' | ') : newTypes.join(' | ')}.`;
      }
      if (oldTypes.length && newTypes.length && oldTypes.join('|') !== newTypes.join('|')) {
        const containerChange = ['array', 'object'].some((type) => a.types.has(type as SchemaValueType) !== b.types.has(type as SchemaValueType));
        add(containerChange ? 'shape' : 'type', containerChange ? 'Shape changed' : 'Type changed', true,
          containerChange ? 'The observed container shape changed. Iterating an array and reading an object require different access patterns, so existing consumers may need changes.' : `The observed non-null types changed from ${oldTypes.join(' | ')} to ${newTypes.join(' | ')}. Parsing, validation or operations such as arithmetic may behave differently.`,
          containerChange ? 'Check loops, property access and model definitions against the new structure before deployment.' : 'Validate parsing and update the consumer model or an explicit conversion at the boundary.');
      }
      if (a.types.has('null') !== b.types.has('null')) {
        const introduced = b.types.has('null');
        add('nullability', introduced ? 'Null now observed' : 'Null no longer observed', introduced,
          introduced ? 'After contains null where Before did not. Consumers that assume a usable value may need null handling. A sample does not establish a formal nullable contract.' : 'Before included null and After does not. This narrows the observed values, but the samples cannot prove that null is no longer allowed.',
          introduced ? 'Check null guards, defaults and whether null has a distinct meaning from a missing field.' : 'Confirm the documented nullability before removing null handling from consumers.');
      }
      const wasPartial = isPartlyMissing(a, before);
      const nowPartial = isPartlyMissing(b, after);
      if (wasPartial !== nowPartial) add('presence', nowPartial ? 'Sometimes missing' : 'Consistently present', nowPartial,
        nowPartial ? 'This field is absent from at least one sampled After object, although it was present in every sampled Before parent. Code that assumes the field exists may need a fallback.' : 'This field is present in every sampled After parent, but was missing from some Before objects. Sample consistency does not prove a required schema rule.',
        nowPartial ? 'Check optional-field handling and confirm whether the missing field is intentional.' : 'Confirm the required-field contract before relying on this sample’s consistency.');
    }

    if (row.required && (!b || requiredPathIncomplete(b, after))) {
      const hasEmptyArray = !b && a ? unseenAncestor(key, before, after) === 'array' : !b && [...after.nodes.values()].some((node) => node.types.has('array') && node.sampledItems === 0 && isDescendantOrSame(key, `${node.key}[]`));
      if (hasEmptyArray) row.unverifiedReason = 'This required field is inside an empty sampled array. There are no records against which to check presence.';
      else {
        const existing = row.changes.find((change) => change.kind === 'removed' || change.kind === 'presence');
        if (existing) {
          existing.required = true;
          existing.label = b ? 'Required field sometimes missing' : 'Required field removed';
          existing.why += ' You explicitly marked this path as required.';
          existing.action = 'Restore the required field or agree a consumer migration before changing the contract.';
        } else add('required', 'Missing required field', true, b ? 'You marked this full path as required, but it is unavailable in some sampled records because the field or an ancestor is missing, null or a different shape.' : 'You marked this path as required, but it was not found in the inspected After sample.', 'Confirm the required path and restore it or agree a consumer migration.');
      }
    }
    rows.push(row);
  }
  rows.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const changes = rows.flatMap((row) => row.changes);
  const potentiallyBreaking = changes.filter((change) => change.potentiallyBreaking).length;
  return {
    before, after, rows, changes, renames: renameCandidates(rows), notes, ignoredCount,
    affectedPaths: rows.filter((row) => row.changes.length > 0).length,
    potentiallyBreaking, lowerRisk: changes.length - potentiallyBreaking,
    unverifiedPaths: rows.filter((row) => row.unverifiedReason !== null).length,
  };
}

/** Entry point used by the UI and focused model checks; all errors are safe authored text. */
export function analyzeSchemaDrift(beforeRaw: string, beforeFormat: SchemaInputFormat, afterRaw: string, afterFormat: SchemaInputFormat, options: SchemaCompareOptions = DEFAULT_SCHEMA_OPTIONS): SchemaAnalysis {
  const errors: { side: 'Before' | 'After' | 'Options'; message: string }[] = [];
  let required: string[] = [];
  let ignored: string[] = [];
  try {
    if (!Number.isFinite(options.arraySampleLimit) || options.arraySampleLimit < 1 || options.arraySampleLimit > SCHEMA_LIMITS.arraySamples) throw new SampleError('Choose an array sample size from 1 to 200.');
    required = readRules(options.requiredPaths, options.caseSensitive);
    ignored = readRules(options.ignoredPaths, options.caseSensitive);
  } catch (error) { errors.push({ side: 'Options', message: error instanceof SampleError ? error.message : 'Check the advanced field options.' }); }
  let before: InferredSchema | undefined;
  let after: InferredSchema | undefined;
  try { before = inferSchema(parseInput(beforeRaw, beforeFormat, options.csvInferTypes), options); }
  catch (error) { errors.push({ side: 'Before', message: error instanceof SampleError ? error.message : 'This sample could not be inspected safely. Use a smaller representative sample.' }); }
  try { after = inferSchema(parseInput(afterRaw, afterFormat, options.csvInferTypes), options); }
  catch (error) { errors.push({ side: 'After', message: error instanceof SampleError ? error.message : 'This sample could not be inspected safely. Use a smaller representative sample.' }); }
  if (errors.length || !before || !after) return { ok: false, errors };
  return { ok: true, comparison: compareSchemas(before, after, options, required, ignored) };
}
