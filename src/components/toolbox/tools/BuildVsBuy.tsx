import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import VisualizationContainer from '../shared/VisualizationContainer';

type Dimension = 'cost' | 'control' | 'speed' | 'maintenance';

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'cost', label: 'Cost Efficiency' },
  { key: 'control', label: 'Control & Customization' },
  { key: 'speed', label: 'Speed to Ship' },
  { key: 'maintenance', label: 'Low Ongoing Maintenance' },
];

interface Option {
  name: string;
  color: string;
  scores: Record<Dimension, number>;
}

const OPTIONS: Option[] = [
  { name: 'Build in-house', color: '#6CA6FF', scores: { cost: 4, control: 9, speed: 3, maintenance: 4 } },
  { name: 'Buy / integrate', color: '#F7933C', scores: { cost: 7, control: 4, speed: 9, maintenance: 7 } },
];

export default function BuildVsBuy() {
  const [priorities, setPriorities] = useState<Record<Dimension, number>>({
    cost: 5, control: 5, speed: 5, maintenance: 5,
  });

  const totalWeight = DIMENSIONS.reduce((sum, d) => sum + priorities[d.key], 0) || 1;

  const results = useMemo(() => {
    return OPTIONS.map((opt) => {
      const contributions = DIMENSIONS.map((d) => ({
        dimension: d.label,
        weight: priorities[d.key],
        score: opt.scores[d.key],
        contribution: (priorities[d.key] / totalWeight) * opt.scores[d.key],
      }));
      const score = contributions.reduce((sum, c) => sum + c.contribution, 0);
      return { opt, score, contributions };
    }).sort((a, b) => b.score - a.score);
  }, [priorities, totalWeight]);

  const winner = results[0];
  const topDim = [...winner.contributions].sort((a, b) => b.contribution - a.contribution)[0];

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
            accent="#5CCFAF"
          />
        ))}
      </div>

      <VisualizationContainer minHeight={140}>
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
          Editorial 0–10 assumptions based on general build-vs-buy tradeoffs — building typically wins on control but loses on speed and maintenance burden; buying is usually the reverse. Your specific situation (team size, budget, how core this is to your product) can easily flip these.
        </p>
      </details>
    </div>
  );
}
