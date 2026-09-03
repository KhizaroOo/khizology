import { monsters } from './monsters';

export type FamilyId = 'check' | 'simulate' | 'decide' | 'plan' | 'create';

export interface Family {
  id: FamilyId;
  name: string;
  icon: string;
  question: string;
  description: string;
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
    color: TOOLOOO_COLOR,
  },
  {
    id: 'simulate',
    name: 'Simulate',
    icon: '🧪',
    question: 'What happens if I change this?',
    description: 'Watch the consequence play out — traffic, load, latency, risk — before it happens for real.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'decide',
    name: 'Decide',
    icon: '⚖️',
    question: 'Which option makes more sense?',
    description: 'Weigh real tradeoffs against your own priorities — transparent scoring, not absolute verdicts.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'plan',
    name: 'Plan',
    icon: '📐',
    question: 'How should I arrange/build/size this?',
    description: 'Work out the layout, the fit, the sizing — visually, before you commit to it.',
    color: TOOLOOO_COLOR,
  },
  {
    id: 'create',
    name: 'Create',
    icon: '🛠️',
    question: 'Make something useful for me.',
    description: 'Generate a real, downloadable asset — grids, guides, exports — built right in your browser.',
    color: TOOLOOO_COLOR,
  },
];

export const getFamilyById = (id: string): Family | undefined =>
  families.find((f) => f.id === id);
