export interface ContextConfig {
  window: number; reserve: number; systemTokens: number; systemRelevance: number; systemPriority: number;
  userTokens: number; metadataTokens: number; historyTokens: number; historyRelevance: number; historyDuplicate: number; historyStale: number;
  memoryTokens: number; memoryRelevance: number; memoryStale: number; memoryConflict: number;
  chunks: number; chunkTokens: number; retrievalRelevance: number; retrievalDuplicate: number; retrievalStale: number; retrievalConflict: number;
  tools: number; toolTokens: number; toolRelevance: number; unusedTools: number;
  resultTokens: number; resultRelevance: number; resultDuplicate: number;
  topK: number; threshold: number; historyRetained: number; compressionLoss: number;
  freshHistory: boolean; freshMemory: boolean; freshRetrieval: boolean;
}
export type ContextNumber = { [K in keyof ContextConfig]: ContextConfig[K] extends number ? K : never }[keyof ContextConfig];
type SourceId = 'system' | 'user' | 'history' | 'memory' | 'retrieval' | 'tools' | 'results' | 'metadata';
const percent = (label: string) => ({ label, min: 0, max: 100 });
const tokens = (label: string, max = 1_000_000) => ({ label, min: 0, max });
export const contextBounds: Record<ContextNumber, { label: string; min: number; max: number }> = {
  window: { label: 'Context window tokens', min: 1_024, max: 2_000_000 }, reserve: tokens('Reserved output tokens'),
  systemTokens: tokens('System instruction tokens', 100_000), systemRelevance: percent('System relevance %'), systemPriority: { label: 'System assembly priority', min: 1, max: 8 },
  userTokens: tokens('Current request tokens', 100_000), metadataTokens: tokens('Constraint / metadata tokens', 100_000),
  historyTokens: tokens('Conversation history tokens', 2_000_000), historyRelevance: percent('History relevance %'), historyDuplicate: percent('History duplicate %'), historyStale: percent('History stale %'),
  memoryTokens: tokens('Memory tokens'), memoryRelevance: percent('Memory relevance %'), memoryStale: percent('Memory stale %'), memoryConflict: percent('Memory conflicting %'),
  chunks: { label: 'Retrieved chunks', min: 0, max: 200 }, chunkTokens: tokens('Average chunk tokens', 8_000), retrievalRelevance: percent('Retrieval relevance %'), retrievalDuplicate: percent('Retrieval duplicate %'), retrievalStale: percent('Retrieval stale %'), retrievalConflict: percent('Retrieval conflicting %'),
  tools: { label: 'Available tools', min: 0, max: 200 }, toolTokens: tokens('Average tool definition tokens', 8_000), toolRelevance: percent('Relevant tools %'), unusedTools: percent('Unused tools %'),
  resultTokens: tokens('Tool result tokens'), resultRelevance: percent('Result relevance %'), resultDuplicate: percent('Result repeated %'),
  topK: { label: 'Retrieval top K', min: 0, max: 200 }, threshold: percent('Minimum relevance %'), historyRetained: { label: 'History size retained %', min: 10, max: 100 }, compressionLoss: { label: 'Assumed compression signal loss %', min: 0, max: 50 },
};
export const contextGroups: Array<{ id: SourceId; name: string; fields: ContextNumber[]; freshness?: 'freshHistory' | 'freshMemory' | 'freshRetrieval' }> = [
  { id: 'system', name: 'System instructions — protected', fields: ['systemTokens', 'systemRelevance', 'systemPriority'] },
  { id: 'user', name: 'Current user request — protected', fields: ['userTokens'] },
  { id: 'metadata', name: 'Metadata / constraints — protected', fields: ['metadataTokens'] },
  { id: 'history', name: 'Conversation history', fields: ['historyTokens', 'historyRelevance', 'historyDuplicate', 'historyStale'], freshness: 'freshHistory' },
  { id: 'memory', name: 'Memory', fields: ['memoryTokens', 'memoryRelevance', 'memoryStale', 'memoryConflict'], freshness: 'freshMemory' },
  { id: 'retrieval', name: 'Retrieved knowledge', fields: ['chunks', 'chunkTokens', 'retrievalRelevance', 'retrievalDuplicate', 'retrievalStale', 'retrievalConflict'], freshness: 'freshRetrieval' },
  { id: 'tools', name: 'Tool definitions', fields: ['tools', 'toolTokens', 'toolRelevance', 'unusedTools'] },
  { id: 'results', name: 'Tool results', fields: ['resultTokens', 'resultRelevance', 'resultDuplicate'] },
];
export const contextStrategies = {
  none: 'No optimization', topK: 'Top-K retrieval', threshold: 'Relevance threshold', dedup: 'Deduplication', recency: 'Recency filtering', compression: 'Conversation compression', memory: 'Memory selection', tools: 'Tool pruning', combined: 'Combined context engineering',
} as const;
export type ContextStrategy = keyof typeof contextStrategies;
export const contextDefaults: ContextConfig = {
  window: 128_000, reserve: 8_000, systemTokens: 1_500, systemRelevance: 100, systemPriority: 1, userTokens: 800, metadataTokens: 400,
  historyTokens: 20_000, historyRelevance: 75, historyDuplicate: 15, historyStale: 10,
  memoryTokens: 8_000, memoryRelevance: 70, memoryStale: 15, memoryConflict: 5,
  chunks: 16, chunkTokens: 1_500, retrievalRelevance: 65, retrievalDuplicate: 20, retrievalStale: 10, retrievalConflict: 5,
  tools: 30, toolTokens: 400, toolRelevance: 40, unusedTools: 40, resultTokens: 6_000, resultRelevance: 70, resultDuplicate: 20,
  topK: 8, threshold: 50, historyRetained: 40, compressionLoss: 10, freshHistory: true, freshMemory: true, freshRetrieval: true,
};
export const contextPresets: Array<{ name: string; config: ContextConfig }> = [
  { name: 'Clean Small Context', config: { ...contextDefaults, systemTokens: 700, userTokens: 500, metadataTokens: 200, historyTokens: 2_000, historyRelevance: 95, historyDuplicate: 0, historyStale: 0, memoryTokens: 1_000, memoryRelevance: 95, memoryStale: 0, memoryConflict: 0, chunks: 3, chunkTokens: 500, retrievalRelevance: 95, retrievalDuplicate: 0, retrievalStale: 0, retrievalConflict: 0, tools: 5, toolTokens: 200, toolRelevance: 90, unusedTools: 5, resultTokens: 500, resultRelevance: 95, resultDuplicate: 0 } },
  { name: 'RAG Overload', config: { ...contextDefaults, window: 64_000, chunks: 80, chunkTokens: 1_500, retrievalRelevance: 30, retrievalDuplicate: 40, retrievalStale: 30 } },
  { name: 'Long Conversation', config: { ...contextDefaults, historyTokens: 110_000, historyRelevance: 55, historyDuplicate: 35, historyStale: 30 } },
  { name: 'Tool-Heavy Agent', config: { ...contextDefaults, tools: 100, toolTokens: 900, toolRelevance: 10, unusedTools: 80 } },
  { name: 'Memory Bloat', config: { ...contextDefaults, memoryTokens: 90_000, memoryRelevance: 35, memoryStale: 60, memoryConflict: 20 } },
  { name: 'Context Rot', config: { ...contextDefaults, historyTokens: 70_000, historyRelevance: 25, historyDuplicate: 40, historyStale: 70, memoryTokens: 40_000, memoryRelevance: 30, memoryStale: 70, chunks: 40, retrievalRelevance: 30, retrievalStale: 65, retrievalConflict: 25 } },
  { name: 'Production Agent', config: { ...contextDefaults } },
];
interface Cohort { id: SourceId; name: string; tokens: number; relevance: number; duplicate: number; stale: number; conflict: number; unused: number; priority: number; fresh: boolean; protected: boolean; }
const protectedIds = new Set<SourceId>(['system', 'user', 'metadata']);
function cohorts(c: ContextConfig): Cohort[] {
  const source = (id: SourceId, name: string, size: number, relevance: number, duplicate = 0, stale = 0, conflict = 0, priority = 7, fresh = false): Cohort[] => {
    const r = relevance / 100, spread = Math.min(.25, r, 1 - r);
    return [r + spread, r - spread].map(band => ({ id, name, tokens: size / 2, relevance: band, duplicate: duplicate / 100, stale: stale / 100, conflict: conflict / 100, unused: id === 'tools' && r < 1 ? (1 - band) * (c.unusedTools / 100) / (1 - r) : 0, priority, fresh, protected: protectedIds.has(id) }));
  };
  return [
    ...source('system', 'System', c.systemTokens, c.systemRelevance, 0, 0, 0, c.systemPriority), ...source('user', 'User request', c.userTokens, 100, 0, 0, 0, 2),
    ...source('metadata', 'Constraints', c.metadataTokens, 100, 0, 0, 0, 3), ...source('memory', 'Memory', c.memoryTokens, c.memoryRelevance, 0, c.memoryStale, c.memoryConflict, 4, c.freshMemory),
    ...source('retrieval', 'Retrieval', c.chunks * c.chunkTokens, c.retrievalRelevance, c.retrievalDuplicate, c.retrievalStale, c.retrievalConflict, 5, c.freshRetrieval),
    ...source('history', 'History', c.historyTokens, c.historyRelevance, c.historyDuplicate, c.historyStale, 0, 6, c.freshHistory), ...source('tools', 'Tools', c.tools * c.toolTokens, c.toolRelevance),
    ...source('results', 'Tool results', c.resultTokens, c.resultRelevance, c.resultDuplicate, 0, 0, 8),
  ];
}
function metrics(parts: Cohort[], available: number) {
  const total = parts.reduce((n, p) => n + p.tokens, 0);
  const weighted = (field: 'relevance' | 'duplicate' | 'stale' | 'conflict' | 'unused') => parts.reduce((n, p) => n + p.tokens * p[field], 0);
  const relevant = weighted('relevance'), duplicate = weighted('duplicate'), stale = weighted('stale'), conflicts = weighted('conflict');
  const uniqueRelevant = parts.reduce((n, p) => n + p.tokens * p.relevance * (1 - p.duplicate), 0);
  const toolOverhead = parts.filter(p => p.id === 'tools').reduce((n, p) => n + p.tokens * (1 - p.relevance), 0);
  const utilization = total / available, density = total ? relevant / total : 0;
  const pressure = utilization > 1 ? 'Critical' : utilization > .75 ? 'High' : utilization > .5 ? 'Moderate' : 'Low';
  const noisy = total > 0 && (density < .5 || duplicate / total > .25 || stale / total > .3 || conflicts / total > .1 || toolOverhead / total > .25);
  const healthy = total > 0 && utilization <= .75 && density >= .7 && duplicate / total <= .1 && stale / total <= .1 && conflicts / total <= .02 && toolOverhead / total <= .1;
  const health = utilization > 1 ? 'OVERLOADED' : noisy ? 'NOISY' : healthy ? 'HEALTHY' : 'REVIEW';
  const rows = [...new Set(parts.map(p => p.id))].map(id => {
    const items = parts.filter(p => p.id === id);
    return { id, name: items[0].name, priority: items[0].priority, protected: items[0].protected, tokens: items.reduce((n, p) => n + p.tokens, 0), signal: items.reduce((n, p) => n + p.tokens * p.relevance * (1 - p.duplicate), 0) };
  }).sort((a, b) => a.priority - b.priority);
  return { total, relevant, uniqueRelevant, duplicate, stale, conflicts, toolOverhead, unusedToolTokens: weighted('unused'), density, utilization, pressure, health, overflow: Math.max(0, total - available), rows };
}
function run(c: ContextConfig, strategy: ContextStrategy) {
  const parts = cohorts(c), trace: Array<{ strategy: ContextStrategy; saved: number }> = [];
  const apply = (kind: ContextStrategy) => {
    const before = parts.reduce((n, p) => n + p.tokens, 0);
    if (kind === 'topK') {
      let remaining = Math.min(c.topK, c.chunks) * c.chunkTokens;
      for (const p of parts.filter(p => p.id === 'retrieval').sort((a, b) => b.relevance - a.relevance)) { const kept = Math.min(p.tokens, remaining); remaining -= kept; p.tokens = kept; }
    }
    for (const p of parts) {
      if (p.protected) continue;
      if ((kind === 'threshold' || kind === 'memory' && p.id === 'memory') && p.relevance * 100 < c.threshold) p.tokens = 0;
      if (kind === 'dedup') { p.tokens *= 1 - p.duplicate; p.duplicate = 0; }
      if ((kind === 'recency' || kind === 'memory' && p.id === 'memory') && p.fresh) { p.tokens *= 1 - p.stale; p.stale = 0; }
      if (kind === 'compression' && p.id === 'history' && c.historyRetained < 100) {
        const kept = p.tokens * c.historyRetained / 100;
        const relevant = Math.min(kept, p.tokens * p.relevance * (1 - c.compressionLoss / 100));
        p.tokens = kept; p.relevance = kept ? relevant / kept : 0;
      }
      if (kind === 'tools' && p.id === 'tools') { p.tokens *= p.relevance; p.relevance = 1; p.unused = 0; }
    }
    const saved = Math.max(0, before - parts.reduce((n, p) => n + p.tokens, 0));
    if (saved > 0) trace.push({ strategy: kind, saved });
  };
  if (strategy === 'combined') for (const step of ['topK', 'threshold', 'dedup', 'memory', 'compression', 'tools'] as const) apply(step);
  else if (strategy !== 'none') apply(strategy);
  return { metrics: metrics(parts, c.window - c.reserve), trace };
}
export function simulateContext(c: ContextConfig, strategy: ContextStrategy) {
  for (const [key, bound] of Object.entries(contextBounds)) {
    const value = c[key as ContextNumber];
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < bound.min || value > bound.max) throw new Error(`${bound.label}: enter a whole number from ${bound.min.toLocaleString('en-US')} to ${bound.max.toLocaleString('en-US')}.`);
  }
  for (const key of ['freshHistory', 'freshMemory', 'freshRetrieval'] as const) if (typeof c[key] !== 'boolean') throw new Error('Choose whether each source is freshness-sensitive.');
  if (c.reserve >= c.window) throw new Error('Reserved output must be smaller than the context window.');
  if (c.unusedTools + c.toolRelevance > 100) throw new Error('Unused and relevant tool percentages must total at most 100%.');
  if (!Object.hasOwn(contextStrategies, strategy)) throw new Error('Choose a supported strategy.');
  const available = c.window - c.reserve, before = metrics(cohorts(c), available);
  const { metrics: after, trace } = run(c, strategy);
  const retained = (value: number) => before.uniqueRelevant > 0 ? Math.min(1, value / before.uniqueRelevant) : null;
  const saved = Math.max(0, before.total - after.total), preserved = retained(after.uniqueRelevant);
  const ranking = (Object.keys(contextStrategies) as ContextStrategy[]).filter(s => s !== 'none').map(s => {
    const result = run(c, s).metrics;
    return { strategy: s, saved: Math.max(0, before.total - result.total), preserved: retained(result.uniqueRelevant), health: result.health };
  }).sort((a, b) => b.saved - a.saved);
  const best = ranking.find(item => item.saved > 0 && (item.preserved === null || item.preserved >= .85)) || ranking.find(item => item.saved > 0);
  const combined = run(c, 'combined');
  const worst = [...before.rows].sort((a, b) => (b.tokens - b.signal) - (a.tokens - a.signal))[0];
  const issue = [
    { amount: worst.tokens - worst.signal, text: `${worst.name} has the largest source-level non-signal estimate` },
    { amount: before.stale, text: 'Stale portions are the largest diagnostic estimate' },
    { amount: before.conflicts, text: 'Conflict-affected portions are the largest diagnostic estimate' },
    { amount: before.toolOverhead, text: 'Irrelevant tool definitions are the largest diagnostic estimate' },
  ].sort((a, b) => b.amount - a.amount)[0];
  const largestSaving = before.rows.map(row => ({ name: row.name, saved: row.tokens - after.rows.find(p => p.id === row.id)!.tokens })).sort((a, b) => b.saved - a.saved)[0];
  return { before, after, available, saved, preserved, relevantRemoved: Math.max(0, before.relevant - after.relevant), uniqueRelevantRemoved: Math.max(0, before.uniqueRelevant - after.uniqueRelevant),
    health: before.conflicts > 0 && after.health === 'HEALTHY' ? 'REVIEW' : after.health,
    conflictUnresolved: before.conflicts > 0,
    biggestProblem: before.overflow > 0 ? `Input exceeds the available context budget by ${Math.ceil(before.overflow).toLocaleString('en-US')} tokens.` : before.total === 0 ? 'No context is assembled; an empty window is not a completed task.' : `${issue.text}: ${Math.round(issue.amount).toLocaleString('en-US')} tokens.`,
    best, ranking, trace, largestSaving, recommendedStack: combined.trace.map(t => contextStrategies[t.strategy]), combinedPreserved: retained(combined.metrics.uniqueRelevant),
  };
}
