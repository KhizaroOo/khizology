import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import RangeControl from '../shared/RangeControl';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import Warning from '../shared/Warning';
import { assessFit } from './responsiveFitModel';
import type { FitHealth, FitMeasurement } from './responsiveFitModel';

type ActionLayout = 'wrap' | 'row' | 'stack';
interface Configuration {
  heading: string;
  body: string;
  primary: string;
  secondary: string;
  headingSize: number;
  bodySize: number;
  padding: number;
  gap: number;
  minWidth: number;
  maxWidth: number;
  bodyLeading: number;
  align: 'left' | 'center';
  actionLayout: ActionLayout;
}

const ACCENT = '#F7933C';
const BREAKPOINTS = [1440, 1024, 768, 520, 390];
const DEFAULT: Configuration = {
  heading: 'Make room for your next idea.',
  body: 'A clear message needs space to breathe. Explore how the same content feels as its container gets smaller, and find the point where the layout needs a little help.',
  primary: 'Start a conversation', secondary: 'Explore the work',
  headingSize: 36, bodySize: 17, padding: 32, gap: 20,
  minWidth: 0, maxWidth: 680, bodyLeading: 1.6, align: 'left', actionLayout: 'wrap',
};
const PRESETS = [
  { label: 'Editorial card', values: DEFAULT },
  { label: 'Long actions', values: { ...DEFAULT, primary: 'Download the complete project guide', secondary: 'Schedule a free discovery conversation', actionLayout: 'row' as const } },
  { label: 'Wide reading', values: { ...DEFAULT, maxWidth: 1200, bodySize: 15, headingSize: 44, body: 'A broad canvas can make a short card feel spacious, but long passages need a comfortable reading measure. Follow each line from the beginning to the end, then try shrinking the maximum card width. The browser measures the rendered text and reports when the widest line crosses this lab’s eighty-character-width comfort threshold. This is a prompt to inspect the design, not a rule that applies to every typeface or audience.' } },
  { label: 'Narrow card', values: { ...DEFAULT, heading: 'Your next chapter starts here.', headingSize: 48, padding: 56, minWidth: 420, maxWidth: 580 } },
];
const LABEL: CSSProperties = { display: 'block', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.4rem', fontFamily: "'Poppins', sans-serif" };
const FIELD: CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', border: '1.5px solid var(--k-border)', borderRadius: '.5rem', background: 'var(--k-bg)', color: 'var(--k-text)', font: "inherit", padding: '.65rem .8rem' };
const GRID: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.25rem' };
const COLORS: Record<FitHealth, string> = { good: '#22c55e', caution: ACCENT, poor: '#ef4444' };
const HEALTH: Record<FitHealth, string> = { good: 'Good', caution: 'Caution', poor: 'Poor · overflow' };

/** The visible and measured cards share markup and styles, so the evidence matches the preview. */
function ContentCard({ config }: { config: Configuration }) {
  const { heading, body, primary, secondary } = config;
  return (
    <div data-fit-card style={{ position: 'relative', width: '100%', minWidth: config.minWidth, maxWidth: config.maxWidth, margin: '0 auto', boxSizing: 'border-box', padding: config.padding, background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: 20, textAlign: config.align, color: 'var(--k-text)', display: 'flex', flexDirection: 'column', gap: config.gap }}>
      {heading.trim() && <div data-fit-heading style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: config.headingSize, lineHeight: 1.2, whiteSpace: 'pre-wrap', overflowWrap: 'normal', wordBreak: 'normal' }}>{heading}</div>}
      {body.trim() && <p data-fit-body style={{ margin: 0, fontFamily: "'Mulish', sans-serif", fontSize: config.bodySize, lineHeight: config.bodyLeading, whiteSpace: 'pre-wrap', overflowWrap: 'normal', wordBreak: 'normal' }}>{body}</p>}
      {(primary.trim() || secondary.trim()) && (
        <div data-fit-actions style={{ display: 'flex', gap: config.gap, flexDirection: config.actionLayout === 'stack' ? 'column' : 'row', flexWrap: config.actionLayout === 'wrap' ? 'wrap' : 'nowrap', justifyContent: config.align === 'center' ? 'center' : 'flex-start', alignItems: config.actionLayout === 'stack' ? 'stretch' : 'flex-start' }}>
          {[primary, secondary].map((label, index) => label.trim() && <span key={index} data-fit-action style={{ display: 'block', flexShrink: 0, maxWidth: '100%', boxSizing: 'border-box', border: `1.5px solid ${index === 0 ? ACCENT : 'var(--k-border)'}`, borderRadius: 9, padding: '12px 20px', fontFamily: "'Mulish', sans-serif", fontWeight: 800, fontSize: config.bodySize, lineHeight: 1.3, whiteSpace: 'normal', overflowWrap: 'normal', wordBreak: 'normal', textAlign: 'center', background: index === 0 ? ACCENT : 'transparent', color: index === 0 ? '#171717' : 'var(--k-text)' }}><span data-fit-action-label>{label}</span></span>)}
        </div>
      )}
      <span data-fit-ch aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, visibility: 'hidden', whiteSpace: 'nowrap', fontFamily: "'Mulish', sans-serif", fontSize: config.bodySize, lineHeight: 1 }}>0000000000</span>
    </div>
  );
}

function textRects(element: Element | null): DOMRect[] {
  if (!element || !element.textContent?.trim()) return [];
  const range = document.createRange();
  range.selectNodeContents(element);
  return Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
}
function lineCount(rects: DOMRect[]): number {
  return new Set(rects.map(rect => Math.round(rect.top))).size;
}
function readMeasurement(surface: HTMLDivElement, width: number): FitMeasurement {
  const card = surface.querySelector<HTMLElement>('[data-fit-card]')!;
  const heading = card.querySelector<HTMLElement>('[data-fit-heading]');
  const body = card.querySelector<HTMLElement>('[data-fit-body]');
  const actions = Array.from(card.querySelectorAll<HTMLElement>('[data-fit-action]'));
  const actionGroup = card.querySelector<HTMLElement>('[data-fit-actions]');
  const style = getComputedStyle(card);
  const innerWidth = card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const bodyRects = textRects(body);
  const chWidth = (card.querySelector('[data-fit-ch]')?.getBoundingClientRect().width || 100) / 10;
  const overflowElements = [card, heading, body, actionGroup, ...actions].filter((element): element is HTMLElement => element !== null);
  return {
    width, cardWidth: card.getBoundingClientRect().width, height: Math.ceil(surface.getBoundingClientRect().height), innerWidth,
    headingLines: lineCount(textRects(heading)), bodyLines: lineCount(bodyRects),
    lineMeasure: bodyRects.length ? Math.max(...bodyRects.map(rect => rect.width)) / chWidth : 0,
    actionRows: new Set(actions.map(element => Math.round(element.getBoundingClientRect().top))).size,
    actionCount: actions.length,
    wrappedLabels: actions.filter(element => lineCount(textRects(element.querySelector('[data-fit-action-label]'))) > 1).length,
    overflow: card.getBoundingClientRect().width > width - 32 + 2 || overflowElements.some(element => element.scrollWidth > element.clientWidth + 2),
  };
}

export default function ResponsiveContentFitLab() {
  const id = useId();
  const [config, setConfig] = useState<Configuration>(DEFAULT);
  const [activePreset, setActivePreset] = useState<string | null>('Editorial card');
  const [width, setWidth] = useState(768);
  const [fitPreview, setFitPreview] = useState(true);
  const [measurements, setMeasurements] = useState<Record<number, FitMeasurement>>({});
  const [measurementError, setMeasurementError] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(600);
  const measurementNodes = useRef(new Map<number, HTMLDivElement>());
  const previewFrame = useRef<HTMLDivElement>(null);
  const allWidths = [...new Set([...BREAKPOINTS, width])];
  const hasContent = Boolean(config.heading.trim() || config.body.trim() || config.primary.trim() || config.secondary.trim());

  function update<K extends keyof Configuration>(key: K, value: Configuration[K]) {
    setConfig(previous => ({ ...previous, [key]: value }));
    setActivePreset(null);
  }
  function reset() {
    setConfig(DEFAULT); setActivePreset('Editorial card'); setWidth(768); setFitPreview(true);
  }

  useEffect(() => {
    const frame = previewFrame.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => setAvailableWidth(Math.max(1, frame.clientWidth)));
    observer.observe(frame);
    setAvailableWidth(Math.max(1, frame.clientWidth));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let animation = 0;
    const measure = () => {
      cancelAnimationFrame(animation);
      animation = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          const next: Record<number, FitMeasurement> = {};
          for (const [testWidth, element] of measurementNodes.current) next[testWidth] = readMeasurement(element, testWidth);
          setMeasurements(next);
          setMeasurementError(false);
        } catch {
          setMeasurementError(true);
        }
      });
    };
    measure();
    void document.fonts?.ready.then(() => { if (!cancelled) measure(); });
    // Loaded font changes also need a fresh reading; no raw content is persisted.
    document.fonts?.addEventListener('loadingdone', measure);
    return () => { cancelled = true; cancelAnimationFrame(animation); document.fonts?.removeEventListener('loadingdone', measure); };
  }, [config, width]);

  const selected = measurements[width];
  const referenceLines = measurements[1440]?.headingLines ?? 0;
  const assessment = selected ? assessFit(selected, referenceLines, config.actionLayout) : null;
  const scale = fitPreview ? Math.min(1, availableWidth / width) : 1;
  const surfaceHeight = selected?.height ?? 420;
  const wrappedAt = BREAKPOINTS.filter(point => (measurements[point]?.actionRows ?? 0) > 1);

  const contentFields: { key: 'heading' | 'body' | 'primary' | 'secondary'; label: string; limit: number; rows?: number }[] = [
    { key: 'heading', label: 'Heading', limit: 240, rows: 2 },
    { key: 'body', label: 'Paragraph', limit: 2400, rows: 4 },
    { key: 'primary', label: 'Primary action label', limit: 100 },
    { key: 'secondary', label: 'Secondary action label (optional)', limit: 100 },
  ];

  return (
    <div style={{ display: 'grid', gap: '1.5rem', minWidth: 0, position: 'relative' }}>
      <div>
        <p style={{ margin: '0 0 1rem', color: 'var(--k-text-muted)', lineHeight: 1.65 }}>Put your own copy under pressure. Drag the width, inspect the rendered card, and see which changes would give it more room.</p>
        <PresetBar presets={PRESETS} activeLabel={activePreset} onSelect={(values, label) => { setConfig(values); setActivePreset(label); }} />
        <div style={GRID}>
          {contentFields.map(field => <div key={field.key} style={{ minWidth: 0 }}>
            <label htmlFor={`${id}-${field.key}`} style={LABEL}>{field.label}</label>
            {field.rows ? <textarea id={`${id}-${field.key}`} value={config[field.key]} rows={field.rows} maxLength={field.limit} onChange={event => update(field.key, event.target.value)} style={{ ...FIELD, resize: 'vertical' }} /> : <input id={`${id}-${field.key}`} type="text" value={config[field.key]} maxLength={field.limit} onChange={event => update(field.key, event.target.value)} style={FIELD} />}
          </div>)}
        </div>
        <p style={{ fontSize: '.75rem', color: 'var(--k-text-muted)', margin: '.6rem 0 0' }}>Heading: up to 240 characters. Paragraph: 2,400. Action labels: 100 each. Preview actions are display only.</p>
      </div>

      <div style={GRID}>
        <RangeControl label="Heading size" value={config.headingSize} min={20} max={72} formatValue={value => `${value} px`} onChange={value => update('headingSize', value)} />
        <RangeControl label="Body & action size" value={config.bodySize} min={12} max={24} formatValue={value => `${value} px`} onChange={value => update('bodySize', value)} />
        <RangeControl label="Card padding" value={config.padding} min={8} max={64} formatValue={value => `${value} px`} onChange={value => update('padding', value)} />
      </div>

      <AdvancedDisclosure summary="Layout, spacing & width limits">
        <RangeControl label="Content & action gap" value={config.gap} min={8} max={40} formatValue={value => `${value} px`} onChange={value => update('gap', value)} />
        <RangeControl label="Minimum card width" value={config.minWidth} min={0} max={480} step={10} formatValue={value => value ? `${value} px` : 'Flexible'} onChange={value => update('minWidth', value)} />
        <RangeControl label="Maximum card width" value={config.maxWidth} min={480} max={1440} step={10} formatValue={value => `${value} px`} onChange={value => update('maxWidth', value)} />
        <RangeControl label="Paragraph line height" value={config.bodyLeading} min={1.2} max={2} step={0.05} formatValue={value => `${value.toFixed(2)}×`} onChange={value => update('bodyLeading', value)} />
        <div><label htmlFor={`${id}-alignment`} style={LABEL}>Content alignment</label><select id={`${id}-alignment`} value={config.align} onChange={event => update('align', event.target.value as Configuration['align'])} style={FIELD}><option value="left">Left</option><option value="center">Center</option></select></div>
        <div><label htmlFor={`${id}-actions`} style={LABEL}>Action layout</label><select id={`${id}-actions`} value={config.actionLayout} onChange={event => update('actionLayout', event.target.value as ActionLayout)} style={FIELD}><option value="wrap">Wrap when needed</option><option value="row">Keep one row</option><option value="stack">Always stack</option></select></div>
      </AdvancedDisclosure>

      <section aria-label="Live content preview" style={{ minWidth: 0, border: '1px solid var(--k-border)', borderRadius: '1rem', overflow: 'hidden', background: 'var(--k-bg-elevated)' }}>
        <div style={{ padding: '1rem' }}>
          <RangeControl label="Preview container width" value={width} min={320} max={1600} step={1} formatValue={value => `${value} px`} onChange={setWidth} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '.65rem', fontSize: '.8rem', color: 'var(--k-text-muted)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><input type="checkbox" checked={fitPreview} onChange={event => setFitPreview(event.target.checked)} style={{ accentColor: ACCENT }} /> Scale preview to fit</label>
            <span>{fitPreview ? `${Math.round(scale * 100)}% display scale · layout measured at ${width} px` : '100% display scale · scroll inside preview'}</span>
          </div>
          {selected?.overflow && hasContent && <p style={{ margin: '.65rem 0 0', color: '#ef4444', fontSize: '.8rem', lineHeight: 1.5 }}>Overflow detected: content is clipped at the simulated container edge. Adjust the controls in “Layout, spacing & width limits.”</p>}
        </div>
        <div ref={previewFrame} tabIndex={0} role="region" aria-label="Card preview; horizontal scroll is available at full scale" style={{ width: '100%', minWidth: 0, maxHeight: 720, overflow: 'auto', background: 'var(--k-bg)', borderTop: '1px solid var(--k-border)' }}>
          <div style={{ position: 'relative', width: width * scale, height: Math.max(96, surfaceHeight * scale), margin: '0 auto' }}>
            <div style={{ width, padding: 16, boxSizing: 'border-box', overflow: 'hidden', transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              {hasContent ? <ContentCard config={config} /> : <div style={{ padding: 32, textAlign: 'center', color: 'var(--k-text-muted)' }}>Add a heading, paragraph, or action label to preview your content.</div>}
            </div>
          </div>
        </div>
      </section>

      {!hasContent ? <Warning level="info" title="Your canvas is empty">Add some content above or choose a preset. Fit checks appear once there is something to measure.</Warning> : measurementError ? <Warning level="warn" title="The browser could not measure this layout">The live preview still works. Change a control or reload to retry; no fit verdict is available yet.</Warning> : selected && assessment ? <>
        <div style={GRID}>
          <Metric label="At this width" value={HEALTH[assessment.health]} color={COLORS[assessment.health]} sublabel={`${Math.round(selected.cardWidth)} px card inside ${width} px container`} />
          <Metric label="Heading / paragraph" value={`${selected.headingLines} / ${selected.bodyLines} lines`} sublabel="Measured rendered text lines" />
          <Metric label="Action rows" value={String(selected.actionRows)} sublabel={`${selected.actionCount} action${selected.actionCount === 1 ? '' : 's'} · ${selected.wrappedLabels} multi-line label${selected.wrappedLabels === 1 ? '' : 's'}`} />
          <Metric label="Widest paragraph line" value={selected.bodyLines ? `≈ ${Math.round(selected.lineMeasure)} ch` : 'No paragraph'} sublabel={`${Math.round(selected.innerWidth)} px inner space · ${Math.max(0, selected.height - 32)} px card height`} />
        </div>

        <section aria-label="Breakpoint health summary" style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 .5rem', fontFamily: "'Poppins', sans-serif", fontSize: '1rem' }}>Same content, five widths</h3>
          <p style={{ color: 'var(--k-text-muted)', fontSize: '.8rem', lineHeight: 1.6, margin: '0 0 .9rem' }}>Choose a width to inspect it. “Caution” asks you to review a comfort threshold; “Poor” means measured overflow.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '.65rem' }}>
            {BREAKPOINTS.map(point => {
              const measure = measurements[point];
              const health = measure ? assessFit(measure, referenceLines, config.actionLayout) : null;
              return <button type="button" key={point} aria-pressed={width === point} onClick={() => setWidth(point)} style={{ textAlign: 'left', minWidth: 0, border: `${width === point ? 2 : 1}px solid ${width === point ? ACCENT : 'var(--k-border)'}`, borderRadius: '.75rem', background: 'var(--k-bg-card)', padding: '.85rem', cursor: 'pointer', color: 'var(--k-text)' }}>
                <span style={{ display: 'block', fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 700 }}>{point} px</span>
                <span style={{ display: 'block', fontWeight: 800, fontSize: '.78rem', color: health ? COLORS[health.health] : 'var(--k-text-muted)', margin: '.3rem 0' }}>{health ? HEALTH[health.health] : 'Measuring…'}</span>
                <span style={{ display: 'block', fontSize: '.72rem', lineHeight: 1.5, color: 'var(--k-text-muted)' }}>{measure ? `${measure.headingLines} heading lines · ${measure.actionRows} action rows` : 'Waiting for browser layout'}</span>
              </button>;
            })}
          </div>
        </section>

        <Insight what={`At ${width} px: ${HEALTH[assessment.health].toLowerCase()}.`} why={<>{assessment.reasons.join(' ')} {config.actionLayout === 'wrap' && wrappedAt.length > 0 ? `Of the sampled widths, actions first use multiple rows at ${Math.max(...wrappedAt)} px when moving from wide to narrow.` : ''}</>} tip={assessment.actions.length ? assessment.actions.join(' ') : 'Try a narrower width, a longer label, or larger type. Check whether the layout still expresses your intended hierarchy.'} />
      </> : <p role="status" style={{ color: 'var(--k-text-muted)' }}>Measuring the rendered text in your browser…</p>}

      <details style={{ fontSize: '.82rem', color: 'var(--k-text-muted)', lineHeight: 1.7 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--k-text)' }}>How these checks work</summary>
        <p>The browser renders this exact card at each tested width using Poppins headings and Mulish body text. The container has a fixed 16 px gutter on each side; card padding and width limits are additional. The preview may be scaled for display, but measurements always use the full configured width. Check at 100% scale to judge reading size.</p>
        <p>Overflow is measured from rendered element and scroll widths with a 2 px rounding tolerance. Text lines and action rows come from their rendered positions. A “ch” is the width of the zero character in the configured body font; the paragraph metric is its widest rendered line in those units, not a literal character count.</p>
        <p>Comfort flags are specific to this experiment: at least 4 heading lines or more than twice the 1440 px line count, an action label wrapping, actions moving to another row (unless stacking is intentional), a paragraph line over 80 ch, inner width below 220 px, or more than 18 paragraph lines. These are inspection prompts, not accessibility or universal design rules. The five sampled widths do not establish an exact transition point.</p>
        <p>Plain text only. Content stays in memory in this tab; nothing is uploaded or automatically saved. This is a single card experiment, so production fonts, styles, surrounding components, browser zoom, and content can change the result.</p>
      </details>
      <button type="button" onClick={reset} style={{ justifySelf: 'start', border: '1px solid var(--k-border)', borderRadius: '.5rem', padding: '.65rem 1rem', background: 'var(--k-bg)', color: 'var(--k-text)', fontWeight: 700, cursor: 'pointer' }}>Reset lab</button>

      {/* Layout runs inside a zero-sized clipped box: no extra page width, focus targets, or accessible duplicate text. */}
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none', contain: 'strict' }}>
        {allWidths.map(testWidth => <div key={testWidth} ref={element => { if (element) measurementNodes.current.set(testWidth, element); else measurementNodes.current.delete(testWidth); }} style={{ width: testWidth, boxSizing: 'border-box', padding: 16 }}><ContentCard config={config} /></div>)}
      </div>
    </div>
  );
}
