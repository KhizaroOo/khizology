import { useMemo, useState } from 'react';
import RangeControl from './RangeControl';
import VisualizationContainer from './VisualizationContainer';

export interface DecisionDimension {
  key: string;
  label: string;
}

export interface DecisionOption {
  name: string;
  color: string;
  scores: Record<string, number>;
}

interface DecisionLabProps {
  dimensions: DecisionDimension[];
  options: DecisionOption[];
  assumptionsNote: string;
  accent?: string;
}

export default function DecisionLab({ dimensions, options, assumptionsNote, accent = '#5CCFAF' }: DecisionLabProps) {
  const [priorities, setPriorities] = useState<Record<string, number>>(() =>
    Object.fromEntries(dimensions.map((d) => [d.key, 5]))
  );

  const totalWeight = dimensions.reduce((sum, d) => sum + priorities[d.key], 0) || 1;

  const results = useMemo(() => {
    return options
      .map((opt) => {
        const contributions = dimensions.map((d) => ({
          dimension: d.label,
          weight: priorities[d.key],
          score: opt.scores[d.key],
          contribution: (priorities[d.key] / totalWeight) * opt.scores[d.key],
        }));
        const score = contributions.reduce((sum, c) => sum + c.contribution, 0);
        return { opt, score, contributions };
      })
      .sort((a, b) => b.score - a.score);
  }, [priorities, totalWeight, dimensions, options]);

  const winner = results[0];
  const topDim = [...winner.contributions].sort((a, b) => b.contribution - a.contribution)[0];

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1.25rem' }}>
        How much do you care about each of these?
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {dimensions.map((d) => (
          <RangeControl
            key={d.key}
            label={d.label}
            value={priorities[d.key]}
            onChange={(v) => setPriorities((p) => ({ ...p, [d.key]: v }))}
            min={0}
            max={10}
            accent={accent}
          />
        ))}
      </div>

      <VisualizationContainer minHeight={Math.max(options.length * 44, 120)}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
          {results.map(({ opt, score }) => (
            <div key={opt.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
                <span>{opt.name}</span>
                <span style={{ color: opt.color }}>{score.toFixed(1)} / 10</span>
              </div>
              <div style={{ background: 'var(--k-bg-card)', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: opt.color, transition: 'width .2s' }} />
              </div>
            </div>
          ))}
        </div>
      </VisualizationContainer>

      <div style={{ marginTop: '1.25rem', background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '.875rem', padding: '1.125rem' }}>
        <p style={{ margin: '0 0 .625rem', fontSize: '.9rem', color: 'var(--k-text)', lineHeight: 1.6 }}>
          <strong>For the priorities you selected, {winner.opt.name} scores highest</strong> — driven mostly by <strong>{topDim.dimension.toLowerCase()}</strong>.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '.375rem 0', color: 'var(--k-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--k-border)' }}>Dimension</th>
              <th style={{ textAlign: 'right', padding: '.375rem 0', color: 'var(--k-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--k-border)' }}>Your weight</th>
              <th style={{ textAlign: 'right', padding: '.375rem 0', color: 'var(--k-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--k-border)' }}>{winner.opt.name}</th>
            </tr>
          </thead>
          <tbody>
            {winner.contributions.map((c) => (
              <tr key={c.dimension}>
                <td style={{ padding: '.375rem 0', color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)' }}>{c.dimension}</td>
                <td style={{ padding: '.375rem 0', textAlign: 'right', color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)' }}>{c.weight}/10</td>
                <td style={{ padding: '.375rem 0', textAlign: 'right', color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)' }}>{c.score}/10</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif" }}>
          Where do these scores come from?
        </summary>
        <p style={{ fontSize: '.8rem', color: 'var(--k-text-muted)', lineHeight: 1.6, marginTop: '.5rem' }}>
          {assumptionsNote}
        </p>
      </details>
    </div>
  );
}
