import type { CSSProperties } from 'react';
export interface ToolScenario<T> { id: string; label: string; description?: string; inputPatch: Partial<T>; }
interface Props<T> { scenarios: ToolScenario<T>[]; activeId: string | null; onSelect: (scenario: ToolScenario<T>) => void; onReset: () => void; }
const button = (active: boolean): CSSProperties => ({ minHeight: 38, padding: '.45rem .7rem', border: `1px solid ${active ? '#F7933C' : 'var(--k-border)'}`, borderRadius: '.5rem', background: active ? 'color-mix(in srgb, #F7933C 10%, var(--k-bg-card))' : 'var(--k-bg)', color: active ? '#C66B19' : 'var(--k-text)', font: '700 .73rem Poppins, sans-serif', cursor: 'pointer' });
export default function ToolScenarioSwitcher<T>({ scenarios, activeId, onSelect, onReset }: Props<T>) {
  return <section aria-label="Scenario mode" style={{ margin: '1rem 0', padding: '.9rem', border: '1px solid var(--k-border)', borderRadius: '.75rem', background: 'var(--k-bg)' }}>
    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}><div><strong style={{ font: '800 .78rem Poppins, sans-serif', color: 'var(--k-text)' }}>Scenario mode</strong><p style={{ margin: '.2rem 0 0', fontSize: '.74rem', color: 'var(--k-text-muted)' }}>Compare meaningful planning states. Your changes stay in this browser.</p></div><button type="button" onClick={onReset} style={button(false)}>Reset</button></div>
    <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', marginTop: '.7rem' }}>{scenarios.map((scenario) => <button key={scenario.id} type="button" aria-pressed={activeId === scenario.id} onClick={() => onSelect(scenario)} title={scenario.description} style={button(activeId === scenario.id)}>{scenario.label}</button>)}</div>
  </section>;
}
