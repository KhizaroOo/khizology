export const ENVIRONMENT_LIMITS = {
  maxBytes: 256 * 1024,
  maxLines: 2_000,
  maxKeys: 500,
  maxKeyLength: 128,
} as const;

export type ApparentValueType = 'empty' | 'boolean' | 'number' | 'url' | 'string';

export interface EnvironmentEntry {
  key: string;
  type: ApparentValueType;
  line: number;
}

export interface EnvironmentIssue {
  line: number | null;
  message: string;
}

/** Values deliberately never leave the parser in its return value. */
export interface ParsedEnvironment {
  entries: EnvironmentEntry[];
  issues: EnvironmentIssue[];
  issueCount: number;
  valid: boolean;
}

export function isEnvironmentWithinSizeLimit(source: string): boolean {
  return source.length <= ENVIRONMENT_LIMITS.maxBytes
    && new TextEncoder().encode(source).length <= ENVIRONMENT_LIMITS.maxBytes;
}

function apparentType(value: string): ApparentValueType {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  if (/^(true|false)$/i.test(trimmed)) return 'boolean';
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed) && Number.isFinite(Number(trimmed))) {
    return 'number';
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) && !/\s/.test(trimmed)) {
    try {
      if (new URL(trimmed).hostname) return 'url';
    } catch {
      // Invalid URL shapes remain strings. No value is included in diagnostics.
    }
  }
  return 'string';
}

function parseValue(tail: string): { type: ApparentValueType; error?: never } | { error: string; type?: never } {
  const value = tail.trim();
  const quote = value[0];
  if (quote !== '"' && quote !== "'") {
    return { type: apparentType(value.split('#', 1)[0].trim()) };
  }

  let end = -1;
  for (let index = 1; index < value.length; index += 1) {
    if (quote === '"' && value[index] === '\\') {
      index += 1;
    } else if (value[index] === quote) {
      end = index;
      break;
    }
  }
  if (end === -1) return { error: 'Close the quoted value on the same line. Multiline values are not supported.' };
  const remainder = value.slice(end + 1).trim();
  if (remainder && !remainder.startsWith('#')) {
    return { error: 'Only a comment or the end of the line may follow a quoted value.' };
  }

  const inner = value.slice(1, end);
  const decoded = quote === '"'
    ? inner.replace(/\\(["\\nrt])/g, (_, character: string) => ({ n: '\n', r: '\r', t: '\t' }[character] ?? character))
    : inner;
  return { type: apparentType(decoded) };
}

/** Bounded, simple .env parsing: no interpolation, shell evaluation, logging, or persistence. */
export function parseEnvironment(source: string): ParsedEnvironment {
  const entries: EnvironmentEntry[] = [];
  const issues: EnvironmentIssue[] = [];
  let issueCount = 0;
  const issue = (line: number | null, message: string) => {
    issueCount += 1;
    if (issues.length < 20) issues.push({ line, message });
  };
  const result = (): ParsedEnvironment => ({ entries, issues, issueCount, valid: issueCount === 0 });

  if (!isEnvironmentWithinSizeLimit(source)) {
    issue(null, 'Use a configuration no larger than 256 KB. Nothing from this input was compared.');
    return result();
  }
  if (source.includes('\0')) {
    issue(null, 'This input contains a binary null character. Use a plain-text KEY=VALUE file.');
    return result();
  }
  const lines = source.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  if (lines.length > ENVIRONMENT_LIMITS.maxLines) {
    issue(null, 'Use no more than 2,000 lines per environment. Nothing from this input was compared.');
    return result();
  }

  const keys = new Set<string>();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(.*)$/.exec(line);
    if (!match) {
      issue(index + 1, 'Use KEY=VALUE with a key containing letters, digits, and underscores; start with a letter or underscore.');
      continue;
    }
    const key = match[1];
    if (key.length > ENVIRONMENT_LIMITS.maxKeyLength) {
      issue(index + 1, 'Key names may contain at most 128 characters.');
      continue;
    }
    if (keys.has(key)) {
      issue(index + 1, 'This key is defined more than once. Keep one definition so its structure is unambiguous.');
      continue;
    }
    const parsed = parseValue(match[2]);
    if (parsed.error !== undefined) {
      issue(index + 1, parsed.error);
      continue;
    }
    if (entries.length >= ENVIRONMENT_LIMITS.maxKeys) {
      issue(index + 1, 'Use no more than 500 keys per environment. Split a larger configuration into smaller comparisons.');
      break;
    }
    keys.add(key);
    entries.push({ key, type: parsed.type, line: index + 1 });
  }
  return result();
}

export function maskedEnvironmentPreview(parsed: ParsedEnvironment): string {
  const lines = parsed.entries.map((entry) => `${entry.key}=${entry.type === 'empty' ? '(empty)' : '••••••'}`);
  if (parsed.issueCount) lines.push(`[${parsed.issueCount} input issue${parsed.issueCount === 1 ? '' : 's'} — review the messages below]`);
  return lines.join('\n');
}

export interface EnvironmentInput {
  id: string;
  name: string;
  parsed: ParsedEnvironment;
}

export interface EnvironmentCell {
  environmentId: string;
  present: boolean;
  type: ApparentValueType | null;
  missing: boolean;
  extra: boolean;
  typeChanged: boolean;
  emptyChanged: boolean;
  drift: boolean;
}

export interface EnvironmentRow {
  key: string;
  cells: EnvironmentCell[];
  needsReview: boolean;
}

export interface EnvironmentSummary {
  id: string;
  name: string;
  baseline: boolean;
  keyCount: number;
  missingKeys: string[];
  extraKeys: string[];
  emptyKeys: string[];
  typeDifferences: { key: string; baselineType: ApparentValueType; apparentType: ApparentValueType }[];
  emptyStateChanges: { key: string; baselineEmpty: boolean; empty: boolean }[];
  driftKeys: string[];
}

export interface EnvironmentComparison {
  baselineId: string;
  baselineName: string;
  baselineIndex: number;
  environments: EnvironmentSummary[];
  rows: EnvironmentRow[];
  totalKeys: number;
  structuralDifferences: number;
  missingCount: number;
  extraCount: number;
  emptyCount: number;
  typeDifferenceCount: number;
  emptyChangeCount: number;
  highestDriftIds: string[];
}

export function compareEnvironments(environments: EnvironmentInput[], selectedBaseline: number): EnvironmentComparison | null {
  if (environments.length < 2 || environments.some((environment) => !environment.parsed.valid)) return null;
  const baselineIndex = Number.isInteger(selectedBaseline) && selectedBaseline >= 0 && selectedBaseline < environments.length ? selectedBaseline : 0;
  const baseline = environments[baselineIndex];
  const maps = environments.map((environment) => new Map(environment.parsed.entries.map((entry) => [entry.key, entry])));
  const baselineMap = maps[baselineIndex];
  const allKeys = [...new Set(environments.flatMap((environment) => environment.parsed.entries.map((entry) => entry.key)))].sort();

  const rows: EnvironmentRow[] = allKeys.map((key) => {
    const expected = baselineMap.get(key);
    const cells = maps.map((map, index): EnvironmentCell => {
      const entry = map.get(key);
      const missing = Boolean(expected && !entry);
      const extra = Boolean(!expected && entry);
      const typeChanged = Boolean(expected && entry && expected.type !== 'empty' && entry.type !== 'empty' && expected.type !== entry.type);
      const emptyChanged = Boolean(expected && entry && (expected.type === 'empty') !== (entry.type === 'empty'));
      return {
        environmentId: environments[index].id,
        present: Boolean(entry),
        type: entry?.type ?? null,
        missing,
        extra,
        typeChanged,
        emptyChanged,
        drift: missing || extra || typeChanged || emptyChanged,
      };
    });
    return { key, cells, needsReview: cells.some((cell) => cell.drift || cell.type === 'empty') };
  });

  const summaries: EnvironmentSummary[] = environments.map((environment, index) => ({
    id: environment.id,
    name: environment.name,
    baseline: index === baselineIndex,
    keyCount: environment.parsed.entries.length,
    missingKeys: rows.filter((row) => row.cells[index].missing).map((row) => row.key),
    extraKeys: rows.filter((row) => row.cells[index].extra).map((row) => row.key),
    emptyKeys: rows.filter((row) => row.cells[index].type === 'empty').map((row) => row.key),
    typeDifferences: rows.filter((row) => row.cells[index].typeChanged).map((row) => ({
      key: row.key,
      baselineType: row.cells[baselineIndex].type!,
      apparentType: row.cells[index].type!,
    })),
    emptyStateChanges: rows.filter((row) => row.cells[index].emptyChanged).map((row) => ({
      key: row.key,
      baselineEmpty: row.cells[baselineIndex].type === 'empty',
      empty: row.cells[index].type === 'empty',
    })),
    driftKeys: rows.filter((row) => row.cells[index].drift).map((row) => row.key),
  }));
  const highestDrift = Math.max(0, ...summaries.filter((environment) => !environment.baseline).map((environment) => environment.driftKeys.length));
  return {
    baselineId: baseline.id,
    baselineName: baseline.name,
    baselineIndex,
    environments: summaries,
    rows,
    totalKeys: allKeys.length,
    structuralDifferences: summaries.reduce((sum, environment) => sum + environment.driftKeys.length, 0),
    missingCount: summaries.reduce((sum, environment) => sum + environment.missingKeys.length, 0),
    extraCount: summaries.reduce((sum, environment) => sum + environment.extraKeys.length, 0),
    emptyCount: summaries.reduce((sum, environment) => sum + environment.emptyKeys.length, 0),
    typeDifferenceCount: summaries.reduce((sum, environment) => sum + environment.typeDifferences.length, 0),
    emptyChangeCount: summaries.reduce((sum, environment) => sum + environment.emptyStateChanges.length, 0),
    highestDriftIds: highestDrift ? summaries.filter((environment) => !environment.baseline && environment.driftKeys.length === highestDrift).map((environment) => environment.id) : [],
  };
}

export function missingKeyChecklist(comparison: EnvironmentComparison): string {
  const lines = ['Environment Drift Detector — missing-key checklist', `Baseline: ${comparison.baselineName}`, 'Values are omitted. Confirm each key is required before adding it.', ''];
  for (const environment of comparison.environments) {
    if (environment.baseline || !environment.missingKeys.length) continue;
    lines.push(`${environment.name}:`, ...environment.missingKeys.map((key) => `- [ ] Define ${key}`), '');
  }
  if (!comparison.missingCount) lines.push('No baseline keys are missing in the compared environments.');
  return lines.join('\n').trim();
}

/** An explicit allow-list keeps raw inputs and configuration values out of downloads. */
export function sanitizedEnvironmentComparison(comparison: EnvironmentComparison) {
  return {
    tool: 'Environment Drift Detector',
    schemaVersion: 1,
    baseline: { id: comparison.baselineId, name: comparison.baselineName },
    assumptions: {
      values: 'omitted',
      keys: 'case-sensitive',
      types: 'Heuristic shapes, not runtime types. Environment values are normally strings.',
      drift: 'Missing, extra, type, or empty-state changes relative to the baseline; each key counted once per compared environment.',
      differingValues: 'Not compared. Different secrets and other values are not classified as errors.',
    },
    totals: {
      keys: comparison.totalKeys,
      structuralDifferences: comparison.structuralDifferences,
      missingKeys: comparison.missingCount,
      extraKeys: comparison.extraCount,
      emptyValues: comparison.emptyCount,
      typeDifferences: comparison.typeDifferenceCount,
      emptyStateChanges: comparison.emptyChangeCount,
    },
    highestDriftEnvironmentIds: [...comparison.highestDriftIds],
    environments: comparison.environments.map((environment) => ({
      id: environment.id,
      name: environment.name,
      baseline: environment.baseline,
      keyCount: environment.keyCount,
      missingKeys: [...environment.missingKeys],
      extraKeys: [...environment.extraKeys],
      emptyKeys: [...environment.emptyKeys],
      typeDifferences: environment.typeDifferences.map((difference) => ({ ...difference })),
      emptyStateChanges: environment.emptyStateChanges.map((change) => ({ ...change })),
      structuralDriftKeys: [...environment.driftKeys],
    })),
    matrix: comparison.rows.map((row) => ({
      key: row.key,
      environments: row.cells.map((cell) => ({ environmentId: cell.environmentId, present: cell.present, apparentType: cell.type })),
    })),
  };
}
