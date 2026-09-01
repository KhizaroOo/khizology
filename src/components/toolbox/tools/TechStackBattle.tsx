import DecisionLab from '../shared/DecisionLab';

const DIMENSIONS = [
  { key: 'ecosystem', label: 'Ecosystem Maturity' },
  { key: 'performance', label: 'Raw Performance' },
  { key: 'learningCurve', label: 'Easy Learning Curve' },
  { key: 'hiring', label: 'Hiring Pool Size' },
];

const OPTIONS = [
  { name: 'Node.js + React', color: '#5CCFAF', scores: { ecosystem: 9, performance: 6, learningCurve: 7, hiring: 9 } },
  { name: 'Python + Django', color: '#F5CF5C', scores: { ecosystem: 8, performance: 5, learningCurve: 8, hiring: 8 } },
  { name: 'Java + Spring', color: '#F7933C', scores: { ecosystem: 8, performance: 8, learningCurve: 4, hiring: 7 } },
  { name: 'Go + stdlib', color: '#6CA6FF', scores: { ecosystem: 6, performance: 9, learningCurve: 6, hiring: 5 } },
];

export default function TechStackBattle() {
  return (
    <DecisionLab
      dimensions={DIMENSIONS}
      options={OPTIONS}
      accent="#F7933C"
      assumptionsNote="Editorial 0–10 assumptions based on general reputation and current ecosystem state (2026) — not benchmarks of your specific use case. Your team's existing experience with a stack usually matters more than any of these general scores."
    />
  );
}
