import DecisionLab from '../shared/DecisionLab';

const DIMENSIONS = [
  { key: 'ecosystem', label: 'Ecosystem Maturity' },
  { key: 'performance', label: 'Raw Performance' },
  { key: 'learningCurve', label: 'Easy Learning Curve' },
  { key: 'hiring', label: 'Hiring Pool Size' },
];

const OPTIONS = [
  { name: 'Node.js + React', nextStep: "Build a small Node.js/React slice of the actual product; measure responsiveness and confirm the team can operate and maintain it.", color: '#5CCFAF', scores: { ecosystem: 9, performance: 6, learningCurve: 7, hiring: 9 } },
  { name: 'Python + Django', nextStep: "Prototype the important data and request paths in Django; verify delivery effort and measured performance with your team.", color: '#F5CF5C', scores: { ecosystem: 8, performance: 5, learningCurve: 8, hiring: 8 } },
  { name: 'Java + Spring', nextStep: "Test a representative Spring service with the intended deployment; check team experience and operating costs alongside performance.", color: '#F7933C', scores: { ecosystem: 8, performance: 8, learningCurve: 4, hiring: 7 } },
  { name: 'Go + stdlib', nextStep: "Prototype the required integrations and request path in Go; verify library coverage and team maintenance effort before choosing it.", color: '#6CA6FF', scores: { ecosystem: 6, performance: 9, learningCurve: 6, hiring: 5 } },
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
