import DecisionLab from '../shared/DecisionLab';

const DIMENSIONS = [
  { key: 'consistency', label: 'Consistency' },
  { key: 'scalability', label: 'Scalability' },
  { key: 'queryFlexibility', label: 'Query Flexibility' },
  { key: 'opsSimplicity', label: 'Ops Simplicity' },
  { key: 'cost', label: 'Cost Efficiency' },
];

const OPTIONS = [
  { name: 'PostgreSQL', color: '#6CA6FF', scores: { consistency: 9, scalability: 6, queryFlexibility: 9, opsSimplicity: 7, cost: 7 } },
  { name: 'MongoDB', color: '#5CCFAF', scores: { consistency: 6, scalability: 8, queryFlexibility: 7, opsSimplicity: 7, cost: 6 } },
  {
    name: 'DynamoDB-style KV',
    color: '#F7933C',
    scores: { consistency: 5, scalability: 10, queryFlexibility: 3, opsSimplicity: 9, cost: 5 },
    dealBreakers: [
      {
        dimensionKey: 'queryFlexibility',
        whenPriorityAtLeast: 8,
        reason: "Key-value stores can't do complex relational queries or joins — not suitable when query flexibility matters this much.",
      },
    ],
  },
  {
    name: 'Cassandra-style wide-column',
    color: '#DF78A0',
    scores: { consistency: 4, scalability: 10, queryFlexibility: 4, opsSimplicity: 4, cost: 6 },
    dealBreakers: [
      {
        dimensionKey: 'consistency',
        whenPriorityAtLeast: 8,
        reason: 'Wide-column stores are built for eventual consistency and weak transactional guarantees — not suitable when strong consistency matters this much.',
      },
    ],
  },
];

export default function DatabaseDecisionLab() {
  return (
    <DecisionLab
      dimensions={DIMENSIONS}
      options={OPTIONS}
      accent="#5CCFAF"
      assumptionsNote="Each database's 0–10 score per dimension is an editorial assumption based on general, well-known characteristics of that class of database — not a benchmark of any specific version or workload. Real-world results depend heavily on your schema, access patterns, and configuration. Use this to reason about tradeoffs, not as a purchasing decision on its own."
    />
  );
}
