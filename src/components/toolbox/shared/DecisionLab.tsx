import { useMemo, useState } from 'react';
import RangeControl from './RangeControl';
import VisualizationContainer from './VisualizationContainer';

export interface DecisionDimension {
  key: string;
  label: string;
}

export interface DealBreaker {
  dimensionKey: string;
  /** Triggers when the user's priority for dimensionKey is at least this value (0-10). */
  whenPriorityAtLeast: number;
  reason: string;
}

export interface DecisionOption {
  name: string;
  color: string;
  scores: Record<string, number>;
  dealBreakers?: DealBreaker[];
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
          dimensionKey: d.key,
          weight: priorities[d.key],
          score: opt.scores[d.key],
          contribution: (priorities[d.key] / totalWeight) * opt.scores[d.key],
        }));
        const score = contributions.reduce((sum, c) => sum + c.contribution, 0);
        const triggeredDealBreakers = (opt.dealBreakers ?? []).filter(
          (db) => priorities[db.dimensionKey] >= db.whenPriorityAtLeast
        );
        return { opt, score, contributions, disqualified: triggeredDealBreakers.length > 0, triggeredDealBreakers };
      })
      .sort((a, b) => {
        if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
        return b.score - a.score;
      });
  }, [priorities, totalWeight, dimensions, options]);

  const winner = results.find((r) => !r.disqualified) ?? results[0];
  const runnerUp = results.find((r) => r !== winner && !r.disqualified);
  const topDim = [...winner.contributions].sort((a, b) => b.contribution - a.contribution)[0];

  // "What would change the winner?" — the dimension where the runner-up's raw score
  // most exceeds the winner's; turning that priority up would favor the runner-up.
  const flipHint = useMemo(() => {
    if (!runnerUp) return null;
    const gaps = dimensions
      .map((d) => ({ dimension: d.label, gap: runnerUp.opt.scores[d.key] - winner.opt.scores[d.key] }))
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap);
    return gaps[0] ?? null;
  }, [runnerUp, winner, dimensions]);

  // Per-dimension leader — which option scores highest on each individual dimension,
  // regardless of the user's current weighting. Only meaningful with 3+ options.
  const categoryWinners = useMemo(() => {
    if (options.length < 3) return null;
    return dimensions.map((d) => {
      const best = [...options].sort((a, b) => b.scores[d.key] - a.scores[d.key])[0];
      return { dimension: d.label, name: best.name, color: best.color, score: best.scores[d.key] };
    });
  }, [dimensions, options]);

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
          {results.map(({ opt, score, disqualified, triggeredDealBreakers }) => (
            <div key={opt.name} style={{ opacity: disqualified ? 0.55 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', marginBottom: '.25rem', fontFamily: "'Poppins', sans-serif" }}>
                <span>{opt.name}{disqualified && ' ⚠ Deal-breaker'}</span>
                <span style={{ color: opt.color }}>{score.toFixed(1)} / 10</span>
              </div>
              <div style={{ background: 'var(--k-bg-card)', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: opt.color, transition: 'width .2s' }} />
              </div>
              {disqualified && (
                <p style={{ margin: '.3rem 0 0', fontSize: '.75rem', color: 'var(--k-text-muted)', lineHeight: 1.4 }}>
                  {triggeredDealBreakers.map((db) => db.reason).join(' ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </VisualizationContainer>

      {categoryWinners && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '1rem' }}>
          {categoryWinners.map((c) => (
            <div
              key={c.dimension}
              style={{
                display: 'flex', alignItems: 'center', gap: '.4rem',
                padding: '.3rem .625rem', borderRadius: '999px',
                background: `color-mix(in srgb, ${c.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${c.color} 30%, transparent)`,
                fontSize: '.72rem', fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span style={{ color: 'var(--k-text-muted)', fontWeight: 600 }}>{c.dimension}</span>
              <span style={{ color: 'var(--k-text-muted)' }}>→</span>
              <span style={{ color: c.color, fontWeight: 800 }}>{c.name}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.25rem', background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '.875rem', padding: '1.125rem' }}>
        <p style={{ margin: '0 0 .625rem', fontSize: '.9rem', color: 'var(--k-text)', lineHeight: 1.6 }}>
          <strong>For the priorities you selected, {winner.opt.name} scores highest</strong> — driven mostly by <strong>{topDim.dimension.toLowerCase()}</strong>.
        </p>
        {flipHint && (
          <p style={{ margin: '0 0 .625rem', fontSize: '.82rem', color: 'var(--k-text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--k-text)' }}>What would change this:</strong> {runnerUp!.opt.name} scores higher on {flipHint.dimension.toLowerCase()} — raise that priority enough and it can overtake {winner.opt.name}.
          </p>
        )}
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
