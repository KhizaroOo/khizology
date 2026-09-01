import DecisionLab from '../shared/DecisionLab';

const DIMENSIONS = [
  { key: 'teamFit', label: 'Fits a Small Team' },
  { key: 'deployFreq', label: 'Independent Deploys' },
  { key: 'opsSimplicity', label: 'Ops Simplicity' },
  { key: 'scaling', label: 'Per-Service Scaling' },
];

const OPTIONS = [
  { name: 'Monolith', color: '#6CA6FF', scores: { teamFit: 8, deployFreq: 5, opsSimplicity: 9, scaling: 4 } },
  { name: 'Microservices', color: '#DF78A0', scores: { teamFit: 4, deployFreq: 9, opsSimplicity: 3, scaling: 9 } },
];

export default function MonolithVsMicroservicesLab() {
  return (
    <DecisionLab
      dimensions={DIMENSIONS}
      options={OPTIONS}
      accent="#5CCFAF"
      assumptionsNote="Editorial 0–10 assumptions reflecting typical tradeoffs — microservices generally trade operational simplicity for independent scaling and deployment. Team size and organizational maturity usually matter more than the technology itself."
    />
  );
}
