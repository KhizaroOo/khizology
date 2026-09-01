import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import VisualizationContainer from '../shared/VisualizationContainer';

type Dimension = 'consistency' | 'scalability' | 'queryFlexibility' | 'opsSimplicity' | 'cost';

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'consistency', label: 'Consistency' },
  { key: 'scalability', label: 'Scalability' },
  { key: 'queryFlexibility', label: 'Query Flexibility' },
  { key: 'opsSimplicity', label: 'Ops Simplicity' },
  { key: 'cost', label: 'Cost Efficiency' },
];

interface DbProfile {
  name: string;
  color: string;
  scores: Record<Dimension, number>;
}

// Editorial scores (0-10), disclosed as assumptions below — not universal truth.
const DATABASES: DbProfile[] = [
  { name: 'PostgreSQL', color: '#6CA6FF', scores: { consistency: 9, scalability: 6, queryFlexibility: 9, opsSimplicity: 7, cost: 7 } },
  { name: 'MongoDB', color: '#5CCFAF', scores: { consistency: 6, scalability: 8, queryFlexibility: 7, opsSimplicity: 7, cost: 6 } },
  { name: 'DynamoDB-style KV', color: '#F7933C', scores: { consistency: 5, scalability: 10, queryFlexibility: 3, opsSimplicity: 9, cost: 5 } },
  { name: 'Cassandra-style wide-column', color: '#DF78A0', scores: { consistency: 4, scalability: 10, queryFlexibility: 4, opsSimplicity: 4, cost: 6 } },
];

export default function DatabaseDecisionLab() {
  const [priorities, setPriorities] = useState<Record<Dimension, number>>({
    consistency: 5,
    scalability: 5,
    queryFlexibility: 5,
    opsSimplicity: 5,
    cost: 5,
  });

  const totalWeight = DIMENSIONS.reduce((sum, d) => sum + priorities[d.key], 0) || 1;

  const results = useMemo(() => {
    return DATABASES.map((db) => {
      const contributions = DIMENSIONS.map((d) => ({
        dimension: d.label,
        weight: priorities[d.key],
        dbScore: db.scores[d.key],
        contribution: (priorities[d.key] / totalWeight) * db.scores[d.key],
      }));
      const score = contributions.reduce((sum, c) => sum + c.contribution, 0);
      return { db, score, contributions };
    }).sort((a, b) => b.score - a.score);
  }, [priorities, totalWeight]);

  const winner = results[0];
  const topDimension = [...winner.contributions].sort((a, b) => b.contribution - a.contribution)[0];

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1.25rem' }}>
        How much do you care about each of these?
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {DIMENSIONS.map((d) => (
          <RangeControl
            key={d.key}
            label={d.label}
            value={priorities[d.key]}
            onChange={(v) => setPriorities((p) => ({ ...p, [d.key]: v }))}
            min={0}
            max={10}
            step={1}
            accent="#5CCFAF"
          />
        ))}
      </div>

      <VisualizationContainer minHeight={200}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {results.map(({ db, score }) => (
            <div key={db.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
                <span>{db.name}</span>
                <span style={{ color: db.color }}>{score.toFixed(1)} / 10</span>
              </div>
              <div style={{ background: 'var(--k-bg-card)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: db.color, transition: 'width .2s' }} />
              </div>
            </div>
          ))}
        </div>
      </VisualizationContainer>

      <div style={{ marginTop: '1.25rem', background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '.875rem', padding: '1.125rem' }}>
        <p style={{ margin: '0 0 .625rem', fontSize: '.9rem', color: 'var(--k-text)', lineHeight: 1.6 }}>
          <strong>For the priorities you selected, {winner.db.name} scores highest</strong> — driven mostly by its <strong>{topDimension.dimension.toLowerCase()}</strong> score ({topDimension.dbScore}/10) landing on the dimension you weighted most.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '.375rem 0', color: 'var(--k-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--k-border)' }}>Dimension</th>
              <th style={{ textAlign: 'right', padding: '.375rem 0', color: 'var(--k-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--k-border)' }}>Your weight</th>
              <th style={{ textAlign: 'right', padding: '.375rem 0', color: 'var(--k-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--k-border)' }}>{winner.db.name} score</th>
            </tr>
          </thead>
          <tbody>
            {winner.contributions.map((c) => (
              <tr key={c.dimension}>
                <td style={{ padding: '.375rem 0', color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)' }}>{c.dimension}</td>
                <td style={{ padding: '.375rem 0', textAlign: 'right', color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)' }}>{c.weight}/10</td>
                <td style={{ padding: '.375rem 0', textAlign: 'right', color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)' }}>{c.dbScore}/10</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif" }}>
          Where do the per-database scores come from?
        </summary>
        <p style={{ fontSize: '.8rem', color: 'var(--k-text-muted)', lineHeight: 1.6, marginTop: '.5rem' }}>
          Each database's 0–10 score per dimension is an editorial assumption based on general, well-known characteristics of that class of database — not a benchmark of any specific version or workload. Real-world results depend heavily on your schema, access patterns, and configuration. Use this to reason about tradeoffs, not as a purchasing decision on its own.
        </p>
      </details>
    </div>
  );
}
