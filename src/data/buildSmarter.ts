import type { ContentManifestItem, ContentManifestType } from './contentManifest';

export const buildSmarterActions = ['improve', 'promote', 'connect', 'maintain', 'explore', 'hold', 'stop-investing'] as const;
export type BuildSmarterAction = typeof buildSmarterActions[number];
export const buildSmarterConfidence = ['low', 'medium', 'high'] as const;
export type BuildSmarterConfidence = typeof buildSmarterConfidence[number];
export const buildSmarterTrends = ['rising', 'stable', 'falling', 'unknown'] as const;
export type BuildSmarterTrend = typeof buildSmarterTrends[number];
export const buildSmarterPriorities = ['now', 'next', 'later'] as const;
export type BuildSmarterPriority = typeof buildSmarterPriorities[number];

export interface BuildSmarterSource {
  contentType: ContentManifestType;
  sourceId: string;
}

export interface BuildSmarterSignals {
  reach: 'high' | 'low' | 'unknown';
  meaningfulUse: 'high' | 'low' | 'unknown';
  continuation: 'high' | 'low' | 'unknown';
  search?: 'high-impressions-low-ctr' | 'rising-impressions' | 'low-impressions' | 'unknown';
}

export interface BuildSmarterDecisionSnapshot {
  id: string;
  synthetic: boolean;
  period: { recentDays: number; comparisonDays: number; contextDays?: number };
  source: BuildSmarterSource;
  signals: BuildSmarterSignals;
  trend: BuildSmarterTrend;
  confidence: BuildSmarterConfidence;
  evidenceSufficiency: 'insufficient' | 'emerging' | 'sufficient';
  observation: string;
  recommendedAction: BuildSmarterAction;
  reason: string;
  nextExperiment?: string;
  priority: BuildSmarterPriority;
  humanReviewRequired: true;
}

export interface BuildSmarterDecisionLogEntry {
  id: string;
  synthetic: boolean;
  snapshotId: string;
  decision: string;
  action: BuildSmarterAction;
  reviewAt: string;
  humanApproved: false;
}

const unsafeAnalyticsData = /\b(?:raw\s+(?:(?:tool|user|API)\s+)?(?:input|payload)|JWT|uploaded\s+file|IP\s+address|personal\s+profile|medical\s+exploration)\b/i;

function sourceKey(source: BuildSmarterSource): string {
  return `${source.contentType}:${source.sourceId}`;
}

// Advisory review records only. This module never chooses, publishes, changes, or removes content.
export function validateBuildSmarterSnapshots(
  snapshots: readonly BuildSmarterDecisionSnapshot[],
  sources: readonly ContentManifestItem[],
): string[] {
  const sourceKeys = new Set(sources.map((source) => sourceKey({ contentType: source.contentType, sourceId: source.id })));
  const errors: string[] = [];

  for (const snapshot of snapshots) {
    if (!sourceKeys.has(sourceKey(snapshot.source))) errors.push(`${snapshot.id}: invalid source ID ${sourceKey(snapshot.source)}`);
    if (!buildSmarterActions.includes(snapshot.recommendedAction)) errors.push(`${snapshot.id}: invalid recommended action`);
    if (!buildSmarterConfidence.includes(snapshot.confidence)) errors.push(`${snapshot.id}: invalid confidence`);
    if (!buildSmarterTrends.includes(snapshot.trend)) errors.push(`${snapshot.id}: invalid trend`);
    if (!buildSmarterPriorities.includes(snapshot.priority)) errors.push(`${snapshot.id}: invalid priority`);
    if (snapshot.evidenceSufficiency === 'insufficient' && snapshot.recommendedAction !== 'hold') errors.push(`${snapshot.id}: insufficient evidence requires HOLD`);
    if (!snapshot.synthetic) errors.push(`${snapshot.id}: local examples must be clearly synthetic until real aggregate evidence is reviewed`);
    if (!snapshot.humanReviewRequired) errors.push(`${snapshot.id}: human review is required`);
    if (unsafeAnalyticsData.test(JSON.stringify(snapshot))) errors.push(`${snapshot.id}: raw or sensitive analytics data is not allowed`);
  }

  return errors;
}

export function validateBuildSmarterDecisionLog(
  entries: readonly BuildSmarterDecisionLogEntry[],
  snapshots: readonly BuildSmarterDecisionSnapshot[],
): string[] {
  const snapshotsById = new Set(snapshots.map((snapshot) => snapshot.id));
  const errors: string[] = [];
  for (const entry of entries) {
    if (!snapshotsById.has(entry.snapshotId)) errors.push(`${entry.id}: invalid decision snapshot`);
    if (!buildSmarterActions.includes(entry.action)) errors.push(`${entry.id}: invalid decision action`);
    if (!entry.synthetic) errors.push(`${entry.id}: local decision-log examples must be clearly synthetic`);
    if (entry.humanApproved) errors.push(`${entry.id}: local decision-log examples cannot imply approval`);
  }
  return errors;
}

// Examples exercise the workflow only; they are not production measurements or automatic recommendations.
export const buildSmarterSyntheticSnapshots: BuildSmarterDecisionSnapshot[] = [
  {
    id: 'synthetic-retry-storm-promotion',
    synthetic: true,
    period: { recentDays: 28, comparisonDays: 28, contextDays: 90 },
    source: { contentType: 'tool', sourceId: 'retry-storm-simulator' },
    signals: { reach: 'low', meaningfulUse: 'high', continuation: 'high', search: 'low-impressions' },
    trend: 'stable', confidence: 'medium', evidenceSufficiency: 'emerging',
    observation: 'Example only: modest discovery with strong use and continuation after arrival.',
    recommendedAction: 'promote',
    reason: 'Test discovery before investing in more functionality.',
    nextExperiment: 'Prepare one reviewed Compound Value visual/demo draft and measure safe referral and continuation signals next period.',
    priority: 'next', humanReviewRequired: true,
  },
  {
    id: 'synthetic-skull-rose-maintenance',
    synthetic: true,
    period: { recentDays: 28, comparisonDays: 28, contextDays: 90 },
    source: { contentType: 'artwork', sourceId: 'artwork:a-skull-rose-fusion.jpg' },
    signals: { reach: 'high', meaningfulUse: 'high', continuation: 'unknown', search: 'rising-impressions' },
    trend: 'rising', confidence: 'medium', evidenceSufficiency: 'emerging',
    observation: 'Example only: discovery and gallery exploration are healthy; these signals do not judge artistic quality.',
    recommendedAction: 'maintain',
    reason: 'Keep the artwork discoverable and revisit only if a meaningful connection or creator-authored context appears.',
    priority: 'later', humanReviewRequired: true,
  },
  {
    id: 'synthetic-human-atlas-experience-gap',
    synthetic: true,
    period: { recentDays: 28, comparisonDays: 28, contextDays: 90 },
    source: { contentType: 'infooo_world', sourceId: 'world-001' },
    signals: { reach: 'high', meaningfulUse: 'low', continuation: 'low', search: 'rising-impressions' },
    trend: 'rising', confidence: 'medium', evidenceSufficiency: 'emerging',
    observation: 'Example only: high arrival with weak public exploration signals indicates an experience gap to investigate.',
    recommendedAction: 'improve',
    reason: 'The signals identify a symptom, not its cause; review first-screen clarity, performance, and mobile exploration before changing knowledge content.',
    nextExperiment: 'Observe one small first-screen or guidance improvement without tracking search terms or sensitive anatomy exploration.',
    priority: 'next', humanReviewRequired: true,
  },
  {
    id: 'synthetic-timeout-chain-hold',
    synthetic: true,
    period: { recentDays: 28, comparisonDays: 28, contextDays: 90 },
    source: { contentType: 'tool', sourceId: 'timeout-chain-planner' },
    signals: { reach: 'unknown', meaningfulUse: 'unknown', continuation: 'unknown', search: 'unknown' },
    trend: 'unknown', confidence: 'low', evidenceSufficiency: 'insufficient',
    observation: 'Example only: there is not enough aggregate evidence for a useful conclusion.',
    recommendedAction: 'hold',
    reason: 'Wait for more relevant observations rather than treating low data as low value.',
    priority: 'later', humanReviewRequired: true,
  },
];

export const buildSmarterSyntheticDecisionLog: BuildSmarterDecisionLogEntry[] = [
  {
    id: 'synthetic-log-retry-storm-promotion', synthetic: true, snapshotId: 'synthetic-retry-storm-promotion',
    decision: 'Review one promotion experiment before adding functionality.', action: 'promote', reviewAt: 'next measurement period', humanApproved: false,
  },
];
