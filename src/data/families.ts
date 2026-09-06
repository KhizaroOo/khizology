import { monsters } from './monsters';

export type FamilyId = 'check' | 'simulate' | 'decide' | 'plan' | 'create';

export interface Family {
  id: FamilyId;
  name: string;
  icon: string;
  question: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  howToUse: string;
  color: string;
}

// Rule: any page inside a monster's territory themes itself with that monster's
// primary color, not a separate per-section palette — so every family here
// inherits toolooo's color instead of getting its own hue. Distinguish families
// by icon/name/copy, not by color.
const TOOLOOO_COLOR = monsters.find((m) => m.id === 'toolooo')!.color;

export const families: Family[] = [
  {
    id: 'check',
    name: 'Check',
    icon: '🩺',
    question: "What's wrong? Is this okay?",
    description: 'Diagnose a payload, a file, a config — find out what\'s broken before it breaks you.',
    seoTitle: 'Check Tools — Diagnose Files, Payloads & Configs | Toolooo · Khizooology',
    seoDescription: 'Inspect API payloads, JWT timing, CORS rules, print readiness, schemas, and environment configs with six visual browser-only diagnostic tools.',
    intro: 'Check tools turn unclear symptoms into a reviewable list of findings. They focus on the structure, timing, headers, dimensions, or configuration you provide so you can see what deserves attention before debugging the wider system.',
    howToUse: 'Start with a real but safely handled sample, review every finding in context, and confirm important issues against the authoritative server, schema, printer, or deployment. These tools diagnose; they do not silently change your data.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'simulate',
    name: 'Simulate',
    icon: '🧪',
    question: 'What happens if I change this?',
    description: 'Watch the consequence play out — traffic, load, latency, risk — before it happens for real.',
    seoTitle: 'Simulate Tools — Visual System & Scenario Simulators | Toolooo · Khizooology',
    seoDescription: 'Explore retries, queues, caching, latency, capacity, webhooks, responsive content, and other system behavior through 14 interactive visual simulators.',
    intro: 'Simulate tools make cause and effect visible. Change one assumption at a time and watch traffic, queues, latency, capacity, cost, or layout respond without touching a production system.',
    howToUse: 'Begin with the closest preset or a known baseline, change one control, and compare the shape of the result. Treat the model as a way to understand direction and tradeoffs rather than as an exact forecast of a real system.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'decide',
    name: 'Decide',
    icon: '⚖️',
    question: 'Which option makes more sense?',
    description: 'Weigh real tradeoffs against your own priorities — transparent scoring, not absolute verdicts.',
    seoTitle: 'Decide Tools — Compare Technical & Project Tradeoffs | Toolooo · Khizooology',
    seoDescription: 'Compare databases, architectures, technology stacks, build-versus-buy choices, and project pricing against the priorities you select.',
    intro: 'Decide tools expose the tradeoffs behind a choice. They combine your priorities with visible scoring or cost assumptions so the recommendation can be questioned instead of accepted as a black box.',
    howToUse: 'Set priorities that match the current project, inspect why each option gained or lost points, and test how the result changes when a priority moves. The leading option is a fit for those inputs, not a universal winner.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'plan',
    name: 'Plan',
    icon: '📐',
    question: 'How should I arrange/build/size this?',
    description: 'Work out the layout, the fit, the sizing — visually, before you commit to it.',
    seoTitle: 'Plan Tools — Size, Arrange & Prepare Projects | Toolooo · Khizooology',
    seoDescription: 'Plan frames, paper layouts, pagination, timeouts, project quotes, roadmaps, campaigns, and other practical constraints with eight visual tools.',
    intro: 'Plan tools turn dimensions, timing, scope, and dependencies into a layout you can inspect. They help surface collisions and fit problems while changes are still cheap.',
    howToUse: 'Enter the constraints you know, review the proposed fit or risk, and keep enough margin for the constraints the model cannot see. Verify the final plan against vendor specifications, project agreements, or system limits.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'create',
    name: 'Create',
    icon: '🛠️',
    question: 'Make something useful for me.',
    description: 'Generate a real, downloadable asset — grids, guides, exports — built right in your browser.',
    seoTitle: 'Create Tools — Generate Art & Print Guides | Toolooo · Khizooology',
    seoDescription: 'Create drawing grids, crop guides, bleed and safe-area layouts, value studies, and perspective grids locally in your browser.',
    intro: 'Create tools produce practical visual guides from your image or dimensions. The source stays in the browser while you adjust the result and, where supported, export a usable asset.',
    howToUse: 'Choose or upload the source, match the settings to the destination, and inspect the preview before exporting. Recheck dimensions, color, crop, and compatibility in the final art or print workflow.',
    color: TOOLOOO_COLOR,
  },
];

export const getFamilyById = (id: string): Family | undefined =>
  families.find((f) => f.id === id);
