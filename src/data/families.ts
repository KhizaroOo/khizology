export type FamilyId = 'check' | 'simulate' | 'decide' | 'plan' | 'create';

export interface Family {
  id: FamilyId;
  name: string;
  icon: string;
  question: string;
  description: string;
  color: string;
}

export const families: Family[] = [
  {
    id: 'check',
    name: 'Check',
    icon: '🩺',
    question: "What's wrong? Is this okay?",
    description: 'Diagnose a payload, a file, a config — find out what\'s broken before it breaks you.',
    color: '#DF78A0',
  },
  {
    id: 'simulate',
    name: 'Simulate',
    icon: '🧪',
    question: 'What happens if I change this?',
    description: 'Watch the consequence play out — traffic, load, latency, risk — before it happens for real.',
    color: '#F7933C',
  },
  {
    id: 'decide',
    name: 'Decide',
    icon: '⚖️',
    question: 'Which option makes more sense?',
    description: 'Weigh real tradeoffs against your own priorities — transparent scoring, not absolute verdicts.',
    color: '#5CCFAF',
  },
  {
    id: 'plan',
    name: 'Plan',
    icon: '📐',
    question: 'How should I arrange/build/size this?',
    description: 'Work out the layout, the fit, the sizing — visually, before you commit to it.',
    color: '#6CA6FF',
  },
  {
    id: 'create',
    name: 'Create',
    icon: '🛠️',
    question: 'Make something useful for me.',
    description: 'Generate a real, downloadable asset — grids, guides, exports — built right in your browser.',
    color: '#93B96A',
  },
];

export const getFamilyById = (id: string): Family | undefined =>
  families.find((f) => f.id === id);
