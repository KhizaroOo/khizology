import DecisionLab from '../shared/DecisionLab';
import ResultPanel from '../shared/ResultPanel';

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

const RECONSIDER_WHEN = [
  'Independent scaling becomes a real, current bottleneck — not a hypothetical one you’re planning around.',
  'Domain boundaries have stabilized enough that the system can be split along clean, stable seams.',
  'Independent deployment cadence becomes a genuine blocker — teams are routinely waiting on each other to ship.',
  'Operational maturity (on-call rotation, observability, automated deploys) has grown enough to absorb the added overhead.',
];

export default function MonolithVsMicroservicesLab() {
  return (
    <>
      <DecisionLab
        dimensions={DIMENSIONS}
        options={OPTIONS}
        accent="#5CCFAF"
        assumptionsNote="Editorial 0–10 assumptions reflecting typical tradeoffs — microservices generally trade operational simplicity for independent scaling and deployment. Team size and organizational maturity usually matter more than the technology itself."
      />

      <ResultPanel title="Reconsider when...">
        <p style={{ margin: '0 0 .75rem', fontSize: '.85rem', color: 'var(--k-text-muted)', lineHeight: 1.6 }}>
          Architecture choices aren&apos;t permanent — here is what would change this recommendation over time.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {RECONSIDER_WHEN.map((reason) => (
            <li key={reason} style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', lineHeight: 1.6 }}>
              {reason}
            </li>
          ))}
        </ul>
      </ResultPanel>
    </>
  );
}
