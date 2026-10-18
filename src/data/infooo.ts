import type { ValueLawScores } from './valueLaws';
import { createIdeaEvaluation } from './valueLaws';
import { followTheBloodGuide, humanAtlasEntities, humanAtlasRelationships } from './humanAtlasLearning';
import { deploymentStages, deploymentGuide } from '../components/infooo/deployment/deploymentJourney';

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
export interface InfoooLayer { id: string; label: string; description?: string; visible?: boolean; disabled?: boolean; icon?: string; color?: string; pattern?: string; }
export interface InfoooGuideStep { id: string; label?: string; description?: string; targetId?: string; action?: unknown; }
export interface InfoooGuide { id: string; title: string; steps: Array<string | InfoooGuideStep>; }
export interface InfoooScenario { id: string; label: string; prompt: string; payload?: unknown; }
export interface InfoooCompareMode { id: string; label: string; description?: string; }
export type InfoooWorldStatus = 'idea' | 'research' | 'prototype' | 'private' | 'ready' | 'published' | 'retired';

export const infoooCategories = [
  { id: 'life-human', label: 'Life & Human', description: 'Explore living things, bodies, and human systems.' },
  { id: 'logic-computation', label: 'Logic & Computation', description: 'Explore patterns, mathematics, and computation.' },
  { id: 'software-systems', label: 'Software & Systems', description: 'Explore how software and its systems work.' },
  { id: 'ai-intelligence', label: 'AI & Intelligence', description: 'Explore intelligence and artificial intelligence systems.' },
  { id: 'web-information', label: 'Web & Information', description: 'Explore how information travels and is discovered.' },
  { id: 'world-infrastructure', label: 'World & Infrastructure', description: 'Explore the networks that support everyday life.' },
] as const;
export type InfoooCategoryId = typeof infoooCategories[number]['id'];

export interface InfoooWorld {
  preview?: { asset: string; alt: string };
  id: string; slug: string; title: string; shortTitle?: string; description: string; tagline?: string; status: InfoooWorldStatus;
  visibility: 'private' | 'public'; worldNumber: number; category: InfoooCategoryId; hero?: { label?: string; asset?: string }; accent?: string;
  interactions?: InfoooInteraction[]; modes?: InfoooMode[]; entities?: InfoooEntity[]; relationships?: InfoooRelationship[]; knowledge?: InfoooKnowledge;
  layers?: InfoooLayer[]; guides?: InfoooGuide[]; whatIfScenarios?: InfoooScenario[]; compareModes?: InfoooCompareMode[];
  relatedWorlds?: string[]; relatedTools?: string[]; ahaMoment?: string; keyInsight?: string; reveal?: string;
  share?: { enabled: boolean; supportsEntity?: boolean; supportsGuide?: boolean }; performance?: { lazyAssets?: boolean; progressiveLoading?: boolean; workerProcessing?: boolean };
  accessibility?: { entityList?: boolean; textEquivalent?: boolean; reducedMotion?: boolean }; valueScore?: ValueLawScores;
}

export const infoooWorlds: InfoooWorld[] = [
  { id: 'world-001', slug: 'human-atlas', title: 'Human Atlas', description: 'Explore an adult male reference anatomy as connected systems, not only a list of organ names.', status: 'published', visibility: 'public', worldNumber: 1, category: 'life-human', preview: { asset: '/images/infooo/anatomy-preview.svg', alt: 'Body outline with a highlighted heart, lungs and connected system nodes' }, interactions: ['explore', 'isolate', 'layer', 'explode', 'compare', 'focus', 'reset', 'connect'], modes: ['explore', 'guide'], entities: humanAtlasEntities, relationships: humanAtlasRelationships, guides: [followTheBloodGuide], ahaMoment: 'Artery and vein names describe direction from or to the heart, not oxygen level.', share: { enabled: true, supportsEntity: true, supportsGuide: true }, performance: { lazyAssets: true, progressiveLoading: true }, accessibility: { entityList: true, textEquivalent: true, reducedMotion: true } },
  { id: 'world-002', slug: 'rubiks-cube-motion-graph', title: "Rubik's Cube Motion Graph", shortTitle: 'Cube Motion Graph', description: 'Turn a Rubik’s Cube face and follow the same colored corner or edge as it moves through a simple motion graph.', tagline: 'What really moves when you turn one face?', status: 'published', visibility: 'public', worldNumber: 2, category: 'logic-computation', preview: { asset: '/images/infooo/cube-preview.svg', alt: 'A gridded cube with a face-turn path connected to motion graph nodes' }, accent: '#5CCFAF', interactions: ['explore', 'isolate', 'animate', 'timeline', 'simulate', 'connect', 'focus', 'reset'], modes: ['explore', 'guide'], ahaMoment: 'A face turn moves a structured set of physical pieces, not just colored squares.', keyInsight: 'Corners remain corners, edges remain edges, and centers provide the fixed reference.', knowledge: { fact: 'A standard 3×3×3 cube has 8 corner cubies, 12 edge cubies, 6 fixed-center cubies, and 54 visible stickers.', model: 'Each Motion Graph token represents one physical corner or edge piece. The advanced Sticker View shows the same state as 54 visible stickers; neither is literal internal cube geometry.', simulation: 'The one-turn and full-trace playback are deterministic transformations of the local cube state. The full trace reverses its short sequence; it is not an optimal solve.', limitations: 'This v1 world models face turns U, D, L, R, F, and B with inverse and double turns. It does not teach a complete solving method.', educationalContext: 'Watch one move, then trace one cubie, then reveal a short sequence. Position and orientation are different parts of cube state.', sources: [{ label: 'Singmaster notation reference', url: 'https://www.jaapsch.net/puzzles/notation.htm' }, { label: 'Cube theory overview', url: 'https://www.jaapsch.net/puzzles/cubefaq.html' }] }, share: { enabled: true, supportsEntity: true }, performance: { progressiveLoading: true }, accessibility: { entityList: true, textEquivalent: true, reducedMotion: true }, valueScore: { utility: 2, unity: 2, depth: 2, identity: 2, discovery: 2, visuality: 2, interaction: 2, truth: 2, clarity: 2, actionability: 1, shareability: 1, compoundValue: 1, maintainability: 2, measurability: 1, surprise: 2, originalContribution: 2, respect: 2, craft: 2 } },
  { id: 'world-003', slug: 'app-deployment-journey', title: 'App Deployment Journey', description: 'Watch code become a live app across three knowledge depths, including safe release gates and visible build or health failures.', tagline: 'From git push to production.', status: 'published', visibility: 'public', worldNumber: 3, category: 'software-systems', hero: { asset: '/images/infooo/deployment-social.png' }, preview: { asset: '/images/infooo/deployment-preview.svg', alt: 'Code travels through build, deployment and routing to a user browser, with v1 kept available until v2 is ready' }, interactions: ['animate', 'connect', 'reset'], modes: ['explore'], entities: deploymentStages, guides: [deploymentGuide], relatedWorlds: ['world-002', 'world-001'], ahaMoment: 'A running process, a healthy release and a reachable website are three different things.', keyInsight: 'Build an artifact once, configure the runtime, then verify readiness before switching traffic.', knowledge: { fact: 'Real release systems can build and test code before sending a new version to users.', model: 'This world demonstrates one typical container-based deployment with a readiness gate and a previous healthy release. It is not a universal deployment order.', simulation: 'This local visual follows v2 while v1 stays live. Advanced examples stop failed candidates and demonstrate returning traffic to v1. No real systems are accessed.', limitations: 'Teams order checks differently. Static sites and managed platforms may work differently. Database changes may need a separate recovery plan; DNS and TLS may be configured outside this path.', educationalContext: 'One scene supports Beginner, Intermediate and Advanced depth. A failed candidate never receives traffic; real release designs can differ.', lastReviewed: '2026-10-11', sources: [{ label: 'GitHub Actions workflows', url: 'https://docs.github.com/en/actions/get-started/understand-github-actions' }, { label: 'Docker images and Dockerfiles', url: 'https://docs.docker.com/build/concepts/dockerfile/' }, { label: 'Docker health checks', url: 'https://docs.docker.com/reference/dockerfile/#healthcheck' }, { label: 'MDN: how browsers work', url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work' }, { label: 'Kubernetes deployment strategies', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/' }, { label: 'OpenTelemetry signals', url: 'https://opentelemetry.io/docs/concepts/signals/' }, { label: 'HTTP caching', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching' }, { label: 'Expand-and-contract migrations', url: 'https://www.prisma.io/docs/guides/database/data-migration' }, { label: 'Queues and workers', url: 'https://www.rabbitmq.com/docs/queues' }, { label: 'Blue/green deployments', url: 'https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/welcome.html' }] }, accessibility: { entityList: true, textEquivalent: true, reducedMotion: true } },
  { id: 'world-004', slug: 'ai-coding-agent-journey', title: 'AI Coding Agent Journey', description: 'Watch a coding agent use project context, make a focused change, repair failed checks and respect human approval boundaries.', tagline: 'Watch an AI turn a task into working code.', status: 'published', visibility: 'public', worldNumber: 4, category: 'ai-intelligence', hero: { asset: '/images/infooo/coding-social.png' }, preview: { asset: '/images/infooo/coding-preview.svg', alt: 'An agent moves from a task through relevant files, a focused change and failed-check repair to a verified report' }, interactions: ['animate', 'connect', 'reset'], modes: ['explore'], relatedWorlds: ['world-003'], ahaMoment: 'A passing build is evidence about compilation, not proof of a usable result.', keyInsight: 'Inspect, act, observe the result and repair; report only what was actually verified.', knowledge: { fact: 'A coding agent can read selected files, change code and use check results as feedback when it has permission.', model: 'A curated Add dark mode example represents Task to Look to Change to Check to Report, including one failed check and repair.', simulation: 'All files, changes and checks are curated visuals, not executed commands. The mobile example repairs an oversized theme button. Human approval is simulated; no AI, repository access or real publishing occurs.', limitations: 'Different agents have different tools, checks and approval rules. Passing these example checks does not prove every possible behavior. This is a local visual, not a real agent or private reasoning transcript.', educationalContext: 'Watch context lead to a change, then evidence lead to repair and rechecking. The illustrated checks are not an exhaustive test suite or proof of production readiness.', lastReviewed: '2026-10-11', sources: [{ label: 'Anthropic: tool-using agent loops and feedback', url: 'https://www.anthropic.com/engineering/building-effective-agents' }, { label: 'Gemini CLI: action policies and approval', url: 'https://geminicli.com/docs/reference/policy-engine/' }, { label: 'Gemini CLI: sandbox boundaries', url: 'https://geminicli.com/docs/cli/sandbox/' }] }, accessibility: { entityList: true, textEquivalent: true, reducedMotion: true } },
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
