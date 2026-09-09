import type { ValueLawScores } from './valueLaws';
import { createIdeaEvaluation } from './valueLaws';
import { followTheBloodGuide, humanAtlasEntities, humanAtlasRelationships } from './humanAtlasLearning';

export const infoooIdentity = {
  id: 'infooo',
  status: 'active' as const,
  type: 'Interactive Knowledge Worlds',
  role: 'UNDERSTAND',
  tagline: 'See it. Touch it. Understand it.',
  philosophy: "Words weren't enough. So I made it move.",
  mission: 'Turn difficult knowledge into something people can explore.',
  definition: "Infooo doesn't show knowledge. It lets you experience why things work.",
  color: '#5CCFAF',
  colorLight: '#A7F3D0',
  mascot: '/images/Monsters/infooo.png',
  futureMonsterId: 'future-7',
  unlockRule: 'Set status to active only after a world passes truth, accessibility, performance, and Value Laws review.',
} as const;

export const infoooExperienceLoop = ['see', 'explore', 'isolate', 'connect', 'understand'] as const;
export type InfoooExperienceStep = typeof infoooExperienceLoop[number];
export const infoooExperienceCopy: Record<InfoooExperienceStep, string> = {
  see: 'Immediately understand what world is being explored.',
  explore: 'Move, zoom, rotate, inspect, reveal, or navigate.',
  isolate: 'Remove noise and focus on one object, system, or process.',
  connect: 'Reveal relationships and dependencies.',
  understand: 'Explain what happens, why, and why it matters.',
};

export const infoooInteractions = ['explore', 'isolate', 'layer', 'explode', 'animate', 'compare', 'timeline', 'simulate', 'what-if', 'connect', 'focus', 'reset'] as const;
export type InfoooInteraction = typeof infoooInteractions[number];
export const infoooModes = ['explore', 'guide', 'what-if', 'compare'] as const;
export type InfoooMode = typeof infoooModes[number];
export const infoooModeCopy: Record<InfoooMode, string> = {
  explore: 'Let me discover.', guide: 'Teach me this.', 'what-if': 'Cause and effect exploration.', compare: 'Compare states, structures, systems, scale, or processes.',
};

export const infoooRelationshipTypes = ['depends-on', 'affects', 'connected-to', 'part-of', 'flows-to', 'receives-from', 'controls', 'influences'] as const;
export type InfoooRelationshipType = typeof infoooRelationshipTypes[number];
export interface InfoooRelationship { id: string; from: string; type: InfoooRelationshipType; to: string; explanation: string; }
export interface InfoooKnowledge {
  shortExplanation?: string; whatIs?: string; whereIs?: string; howItWorks?: string; whyItMatters?: string;
  fact?: string; model?: string; simulation?: string; limitations?: string; educationalContext?: string; lastReviewed?: string;
  sources?: Array<{ label: string; url: string }>;
}
export interface InfoooEntity { id: string; title: string; shortTitle?: string; description?: string; knowledge?: InfoooKnowledge; layerId?: string; }
export interface InfoooLayer { id: string; label: string; description?: string; }
export interface InfoooGuide { id: string; title: string; steps: string[]; }
export interface InfoooScenario { id: string; label: string; prompt: string; }
export interface InfoooCompareMode { id: string; label: string; description?: string; }
export type InfoooWorldStatus = 'idea' | 'research' | 'prototype' | 'private' | 'ready' | 'published' | 'retired';

export interface InfoooWorld {
  id: string; slug: string; title: string; shortTitle?: string; description: string; tagline?: string; status: InfoooWorldStatus;
  visibility: 'private' | 'public'; worldNumber: number; category?: string; hero?: { label?: string; asset?: string }; accent?: string;
  interactions?: InfoooInteraction[]; modes?: InfoooMode[]; entities?: InfoooEntity[]; relationships?: InfoooRelationship[]; knowledge?: InfoooKnowledge;
  layers?: InfoooLayer[]; guides?: InfoooGuide[]; whatIfScenarios?: InfoooScenario[]; compareModes?: InfoooCompareMode[];
  relatedWorlds?: string[]; relatedTools?: string[]; ahaMoment?: string; keyInsight?: string; reveal?: string;
  share?: { enabled: boolean; supportsEntity?: boolean; supportsGuide?: boolean }; performance?: { lazyAssets?: boolean; progressiveLoading?: boolean; workerProcessing?: boolean };
  accessibility?: { entityList?: boolean; textEquivalent?: boolean; reducedMotion?: boolean }; valueScore?: ValueLawScores;
}

export const infoooWorlds: InfoooWorld[] = [
  { id: 'world-001', slug: 'human-atlas', title: 'Human Atlas', description: 'Explore an adult male reference anatomy as connected systems, not only a list of organ names.', status: 'published', visibility: 'public', worldNumber: 1, category: 'Human systems', interactions: ['explore', 'isolate', 'layer', 'explode', 'compare', 'focus', 'reset', 'connect'], modes: ['explore', 'guide'], entities: humanAtlasEntities, relationships: humanAtlasRelationships, guides: [followTheBloodGuide], ahaMoment: 'Artery and vein names describe direction from or to the heart, not oxygen level.', share: { enabled: true, supportsEntity: true, supportsGuide: true }, performance: { lazyAssets: true, progressiveLoading: true }, accessibility: { entityList: true, textEquivalent: true, reducedMotion: true } },
  { id: 'world-002', slug: 'what-happens-when-you-press-enter', title: 'What Happens When You Press Enter?', description: 'A future interactive view of the browser request journey.', status: 'private', visibility: 'private', worldNumber: 2, category: 'Web systems', interactions: ['explore', 'layer', 'animate', 'timeline', 'simulate', 'what-if'], modes: ['explore', 'guide', 'what-if'], share: { enabled: false, supportsEntity: false, supportsGuide: false }, performance: { lazyAssets: true, progressiveLoading: true, workerProcessing: true }, accessibility: { entityList: true, textEquivalent: true, reducedMotion: true } },
];

export const infoooPriorityValueLaws = ['truth', 'depth', 'visuality', 'interaction', 'clarity', 'utility', 'originalContribution'] as const;
export const infoooSecondaryValueLaws = ['surprise', 'craft', 'shareability'] as const;
export interface InfoooCandidateChecks { difficultThroughText: boolean; meaningfulRelationships: boolean; interactionImprovesComprehension: boolean; accurateVisualization: boolean; missingMentalModel: boolean; ahaMoment?: boolean; factualSources: boolean; }
export interface InfoooCandidateInput { name: string; problem: string; audience: string; existingSolution: string; missingMentalModel: string; khizooologyContribution: string; valueLawScores: ValueLawScores; notes: string; checks: InfoooCandidateChecks; }
export function evaluateInfoooCandidate(input: InfoooCandidateInput) {
  const requiredPassed = input.checks.difficultThroughText && input.checks.meaningfulRelationships && input.checks.interactionImprovesComprehension && input.checks.accurateVisualization && input.checks.missingMentalModel && input.checks.factualSources;
  return { ...createIdeaEvaluation({ ...input, monster: 'infooo' }), requiredPassed, ahaMomentRecommended: input.checks.ahaMoment === true };
}

export const infoooDesignContract = {
  principles: ['Show before explaining.', 'Interaction must improve understanding.', 'Objects matter. Relationships teach.', 'Complexity should unfold gradually.', 'Simple words. Deep ideas.', 'The user should leave knowing something they did not understand before.'],
  boundaries: ['Not a static infographic gallery.', 'Not Wikipedia with prettier CSS.', 'Not a generic 3D model viewer.', 'Not a calculator.', 'Not a long textbook lesson.', 'Not random animation.', 'Not AI-generated trivia.', 'Not 3D used only because it looks impressive.'],
  performance: 'Load the world, not the universe.',
} as const;
