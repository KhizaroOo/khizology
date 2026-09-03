import DecisionLab from '../shared/DecisionLab';

const DIMENSIONS = [
  { key: 'queryFlex', label: 'Query Flexibility' },
  { key: 'caching', label: 'Simple Caching' },
  { key: 'learningCurve', label: 'Easy Learning Curve' },
  { key: 'tooling', label: 'Tooling Maturity' },
  { key: 'streaming', label: 'Real-time / Streaming' },
];

const OPTIONS = [
  { name: 'REST', color: '#6CA6FF', scores: { queryFlex: 5, caching: 9, learningCurve: 8, tooling: 9, streaming: 3 } },
  { name: 'GraphQL', color: '#DF78A0', scores: { queryFlex: 9, caching: 4, learningCurve: 5, tooling: 7, streaming: 6 } },
  { name: 'gRPC', color: '#A78BFA', scores: { queryFlex: 6, caching: 3, learningCurve: 4, tooling: 6, streaming: 9 } },
];

export default function RestVsGraphqlDecisionLab() {
  return (
    <DecisionLab
      dimensions={DIMENSIONS}
      options={OPTIONS}
      accent="#6CA6FF"
      assumptionsNote="Editorial 0–10 assumptions. REST's HTTP-native caching is simpler out of the box; GraphQL's single flexible endpoint trades that away for letting clients ask for exactly the data shape they need. gRPC is now included too — it favors fixed, strongly-typed RPC methods over ad-hoc queries, leans on protobuf schemas and code generation that most web teams find less familiar, and shines for internal service-to-service calls and bidirectional streaming rather than public-facing browser APIs. All three have workable tooling today, but REST's is the oldest and broadest, gRPC's is strongest in specific ecosystems (gRPC-Web, microservices), and streaming support is where they differ most: gRPC's is native, GraphQL's subscriptions are a middle ground, and REST typically needs polling or a bolted-on mechanism like websockets."
    />
  );
}
