import type { ReactNode } from 'react';
import './first-visit.css';

/** Presentation only: the world supplies its own state, visual and model-backed action. */
export function InfoooFirstVisit({ question, takeaway, visual, action, onAction, result, onReset }: {
  question: string; takeaway: string; visual: ReactNode; action: string;
  onAction: () => void; result?: { happened: string; why: string; next: string }; onReset?: () => void;
}) {
  return <section className="infooo-entry" aria-label="First experience">
    <header><h2>{question}</h2><p>{takeaway}</p></header>
    <div className="infooo-entry-visual">{visual}</div>
    <div className="infooo-entry-actions"><button type="button" className="k-button k-button--primary" onClick={onAction}>{action}</button>{result && onReset && <button type="button" className="k-button k-button--ghost" onClick={onReset}>Try again</button>}</div>
    <div className="infooo-entry-result" role="status" aria-live="polite" aria-atomic="true">{result && <dl><div><dt>What happened</dt><dd>{result.happened}</dd></div><div><dt>Why</dt><dd>{result.why}</dd></div><div><dt>What changes it</dt><dd>{result.next}</dd></div></dl>}</div>
    <small>Simplified, browser-only simulation.</small>
  </section>;
}

export function InfoooEntryFlow({ children, label, connected = true }: { children: ReactNode; label: string; connected?: boolean }) {
  return <div className="infooo-entry-flow" data-connected={connected} aria-label={label}>{children}</div>;
}

export function InfoooEntryObject({ icon, title, children, state }: { icon: ReactNode; title: string; children: ReactNode; state?: 'good' | 'bad' }) {
  return <div className="infooo-entry-object" data-state={state}>{icon}<strong>{title}</strong><span>{children}</span></div>;
}
