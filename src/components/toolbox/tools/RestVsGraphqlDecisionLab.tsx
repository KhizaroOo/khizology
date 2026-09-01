import DecisionLab from '../shared/DecisionLab';

const DIMENSIONS = [
  { key: 'queryFlex', label: 'Query Flexibility' },
  { key: 'caching', label: 'Simple Caching' },
  { key: 'learningCurve', label: 'Easy Learning Curve' },
  { key: 'tooling', label: 'Tooling Maturity' },
];

const OPTIONS = [
  { name: 'REST', color: '#6CA6FF', scores: { queryFlex: 5, caching: 9, learningCurve: 8, tooling: 9 } },
  { name: 'GraphQL', color: '#DF78A0', scores: { queryFlex: 9, caching: 4, learningCurve: 5, tooling: 7 } },
];

export default function RestVsGraphqlDecisionLab() {
  return (
    <DecisionLab
      dimensions={DIMENSIONS}
      options={OPTIONS}
      accent="#6CA6FF"
      assumptionsNote="Editorial 0–10 assumptions. REST's HTTP-native caching is simpler out of the box; GraphQL's single flexible endpoint trades that away for letting clients ask for exactly the data shape they need. Both have mature tooling today, though REST's is older and broader."
    />
  );
}
