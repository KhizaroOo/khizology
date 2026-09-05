import { useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import InputField from '../shared/InputField';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import Warning from '../shared/Warning';
import { calculateAiPricing, PRICING_FACTORS } from './aiPricingModel';
import type { AiPricingInput, PricingFactor, PricingLevel } from './aiPricingModel';

interface FormState {
  traditionalHours: string;
  aiHours: string;
  rate: string;
  supportWeeks: string;
  supportHoursPerWeek: string;
  reviewHours: string;
  factors: Record<PricingFactor, PricingLevel>;
  architecture: PricingLevel;
  criticality: PricingLevel;
  postLaunch: PricingLevel;
  customReserve: boolean;
  reserveLow: string;
  reserveHigh: string;
  currency: string;
  customCurrency: string;
}
const DEFAULT: FormState = {
  traditionalHours: '80', aiHours: '24', rate: '60', supportWeeks: '4', supportHoursPerWeek: '1.5', reviewHours: '4',
  factors: { complexity: 1, clarity: 0, revisions: 1, dependencies: 0, deadline: 0, collaboration: 1, uncertainty: 1 },
  architecture: 2, criticality: 1, postLaunch: 1,
  customReserve: false, reserveLow: '15', reserveHigh: '35', currency: 'USD', customCurrency: '',
};
const PRESETS = [
  { label: 'Client website', values: DEFAULT },
  { label: 'Internal prototype', values: { ...DEFAULT, traditionalHours: '32', aiHours: '12', supportWeeks: '0', reviewHours: '2', architecture: 0 as PricingLevel, criticality: 0 as PricingLevel, postLaunch: 0 as PricingLevel, factors: { ...DEFAULT.factors, complexity: 0 as PricingLevel, clarity: 1 as PricingLevel, revisions: 0 as PricingLevel, collaboration: 0 as PricingLevel } } },
  { label: 'Business integration', values: { ...DEFAULT, traditionalHours: '160', aiHours: '60', supportWeeks: '8', supportHoursPerWeek: '3', reviewHours: '12', architecture: 2 as PricingLevel, criticality: 2 as PricingLevel, postLaunch: 2 as PricingLevel, factors: { complexity: 2 as PricingLevel, clarity: 1 as PricingLevel, revisions: 1 as PricingLevel, dependencies: 2 as PricingLevel, deadline: 1 as PricingLevel, collaboration: 2 as PricingLevel, uncertainty: 2 as PricingLevel } } },
];
const RESPONSIBILITY = {
  architecture: { label: 'Architecture responsibility', options: ['Decisions owned elsewhere', 'Shared design ownership', 'You own the architecture'] },
  criticality: { label: 'Business criticality', options: ['Exploratory / low impact', 'Important workflow', 'Core business operation'] },
  postLaunch: { label: 'Post-launch responsibility', options: ['Handoff only', 'Bounded support', 'Operational / on-call ownership'] },
};
const ACCENT = '#F7933C';
const GRID: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.15rem' };
const LABEL: CSSProperties = { display: 'block', fontSize: '.8rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif" };
const FIELD: CSSProperties = { width: '100%', minWidth: 0, padding: '.65rem .8rem', boxSizing: 'border-box', background: 'var(--k-bg)', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', borderRadius: '.5rem', font: 'inherit' };
const H3: CSSProperties = { margin: '0 0 .9rem', fontSize: '1rem', fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: 'var(--k-text)' };
const NOTE: CSSProperties = { fontSize: '.8rem', lineHeight: 1.65, color: 'var(--k-text-muted)', margin: '.6rem 0 0' };
const fmt = (value: number, digits = 1) => value.toLocaleString('en-US', { maximumFractionDigits: digits });

function parseForm(form: FormState): { input: AiPricingInput | null; errors: string[] } {
  const errors: string[] = [];
  const read = (raw: string, label: string, max: number) => {
    const value = Number(raw);
    if (!raw.trim() || !Number.isFinite(value) || value < 0 || value > max || (value > 0 && value < 0.01)) errors.push(`${label}: enter 0 or a number from 0.01 to ${fmt(max, 0)}.`);
    return value;
  };
  const input: AiPricingInput = {
    traditionalHours: read(form.traditionalHours, 'Traditional effort', 10000),
    aiHours: read(form.aiHours, 'AI-assisted effort', 10000),
    rate: form.rate.trim() ? read(form.rate, 'Hourly baseline', 100000) : null,
    supportWeeks: read(form.supportWeeks, 'Support duration', 104),
    supportHoursPerWeek: read(form.supportHoursPerWeek, 'Support hours per week', 80),
    reviewHours: read(form.reviewHours, 'Review and handoff hours', 10000),
    factors: form.factors, architecture: form.architecture, criticality: form.criticality, postLaunch: form.postLaunch,
    reserveOverride: form.customReserve ? [read(form.reserveLow, 'Lower reserve', 300), read(form.reserveHigh, 'Upper reserve', 300)] : null,
  };
  if (input.reserveOverride && input.reserveOverride[0] > input.reserveOverride[1]) errors.push('The lower reserve must not exceed the upper reserve.');
  return { input: errors.length ? null : input, errors };
}

export default function AiProjectPricingLab() {
  const id = useId();
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [preset, setPreset] = useState<string | null>('Client website');
  const [checked, setChecked] = useState<string[]>([]);
  const { input, errors } = useMemo(() => parseForm(form), [form]);
  const result = useMemo(() => input ? calculateAiPricing(input) : null, [input]);
  const currency = (form.currency === 'custom' ? form.customCurrency.trim() : form.currency) || 'units';
  const money = (amount: number | null) => amount === null ? 'Add a rate to price' : `${currency} ${fmt(amount, 2)}`;
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(previous => ({ ...previous, [key]: value })); setPreset(null); setChecked([]);
  }
  function reset() { setForm(DEFAULT); setPreset('Client website'); setChecked([]); }
  function factorSelect(key: PricingFactor) {
    const factor = PRICING_FACTORS.find(item => item.key === key)!;
    return <div key={key}><label htmlFor={`${id}-${key}`} style={LABEL}>{factor.label}</label><select id={`${id}-${key}`} value={form.factors[key]} onChange={event => update('factors', { ...form.factors, [key]: Number(event.target.value) as PricingLevel })} style={FIELD}>{factor.options.map((option, index) => <option key={option} value={index}>{option}</option>)}</select></div>;
  }
  function responsibilitySelect(key: keyof typeof RESPONSIBILITY) {
    const definition = RESPONSIBILITY[key];
    return <div key={key}><label htmlFor={`${id}-${key}`} style={LABEL}>{definition.label}</label><select id={`${id}-${key}`} value={form[key]} onChange={event => update(key, Number(event.target.value) as PricingLevel)} style={FIELD}>{definition.options.map((option, index) => <option key={option} value={index}>{option}</option>)}</select></div>;
  }
  const checklist = [
    'Define deliverables, acceptance criteria, and what implementation hours include.',
    'Set revision rounds and a process for requests outside the agreed scope.',
    'Assign architecture decisions, review, testing, and final acceptance ownership.',
    form.factors.dependencies > 0 ? 'List integration access, vendor assumptions, and fallback work.' : 'Document external costs and client-provided inputs separately.',
    input && input.supportWeeks > 0 ? `Define ${fmt(input.supportWeeks)} weeks of support, the ${fmt(input.supportHoursPerWeek)} h/week allowance, response expectations, and exclusions.` : 'State whether support ends at handoff or needs a separate agreement.',
    form.postLaunch === 2 ? 'Price and scope availability or on-call responsibility separately from expected support work.' : 'Separate ongoing maintenance and future change requests from this project.',
    'Discuss business outcomes and accountability; do not price solely from AI tool usage.',
  ];
  const responsibilityLabel = result?.responsibilityLabel ?? '';
  const maxHours = input && result ? Math.max(1, input.traditionalHours, result.highHours) : 1;
  const moneyRange = result?.lowPrice !== null && result?.highPrice !== null && result ? `${money(result.lowPrice)} – ${money(result.highPrice)}` : 'Add your hourly baseline for a monetary range';

  return (
    <div style={{ display: 'grid', gap: '1.5rem', minWidth: 0 }}>
      <div>
        <p style={{ margin: '0 0 1rem', color: 'var(--k-text-muted)', lineHeight: 1.65 }}>AI can reduce execution time while you still own the result. Compare your implementation estimate with the work and uncertainty around it, using your own hourly baseline.</p>
        <PresetBar presets={PRESETS} activeLabel={preset} onSelect={(values, label) => { setForm(values); setPreset(label); setChecked([]); }} />
        <div style={GRID}>
          <InputField label="Traditional implementation" value={form.traditionalHours} onChange={value => update('traditionalHours', value)} min="0" step="0.5" suffix="h" />
          <InputField label="AI-assisted implementation" value={form.aiHours} onChange={value => update('aiHours', value)} min="0" step="0.5" suffix="h" />
          <InputField label="Your hourly baseline" value={form.rate} onChange={value => update('rate', value)} min="0" step="0.01" placeholder="Optional: enter your rate" />
          <div><label htmlFor={`${id}-currency`} style={LABEL}>Currency label</label><select id={`${id}-currency`} value={form.currency} onChange={event => update('currency', event.target.value)} style={FIELD}>{['USD', 'PKR', 'EUR', 'GBP', 'INR', 'AED'].map(value => <option key={value} value={value}>{value}</option>)}<option value="custom">Custom label</option></select></div>
          {form.currency === 'custom' && <div><label htmlFor={`${id}-custom-currency`} style={LABEL}>Custom currency or unit</label><input id={`${id}-custom-currency`} value={form.customCurrency} maxLength={12} onChange={event => update('customCurrency', event.target.value)} placeholder="e.g. CAD or credits" style={FIELD} /></div>}
        </div>
        <p style={NOTE}>Compare the same implementation scope. Keep review/handoff, support, and extra contingency outside both implementation estimates to avoid double counting. Currency is a label; no conversion occurs. Leave the rate blank to work in hours only.</p>
      </div>

      <section>
        <h3 style={H3}>What surrounds the implementation?</h3>
        <div style={GRID}>
          {(['complexity', 'clarity', 'revisions'] as PricingFactor[]).map(factorSelect)}
          {responsibilitySelect('architecture')}
          <InputField label="Support duration" value={form.supportWeeks} onChange={value => update('supportWeeks', value)} min="0" step="1" suffix="wk" />
          <InputField label="Expected support per week" value={form.supportHoursPerWeek} onChange={value => update('supportHoursPerWeek', value)} min="0" step="0.5" suffix="h" />
        </div>
        <p style={NOTE}>Support effort = weeks × your hours/week allowance. This covers expected work, not continuous availability. Set weeks to 0 for no included support.</p>
      </section>

      <AdvancedDisclosure summary="Dependencies, ownership & reserve assumptions">
        {(['dependencies', 'deadline', 'collaboration', 'uncertainty'] as PricingFactor[]).map(factorSelect)}
        {responsibilitySelect('criticality')}
        {responsibilitySelect('postLaunch')}
        <InputField label="Review & handoff allowance" value={form.reviewHours} onChange={value => update('reviewHours', value)} min="0" step="0.5" suffix="h" />
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)' }}><input type="checkbox" checked={form.customReserve} onChange={event => update('customReserve', event.target.checked)} style={{ accentColor: ACCENT }} /> Use my own contingency range</label>
          <p style={NOTE}>The default range adds disclosed scenario allowances to implementation hours. Use your own range if you have better project evidence or if the factors overlap.</p>
        </div>
        {form.customReserve && <><InputField label="Lower contingency" value={form.reserveLow} onChange={value => update('reserveLow', value)} min="0" step="1" suffix="%" /><InputField label="Upper contingency" value={form.reserveHigh} onChange={value => update('reserveHigh', value)} min="0" step="1" suffix="%" /></>}
      </AdvancedDisclosure>

      {errors.length > 0 && <div role="alert"><Warning level="warn" title="Check the estimate inputs"><ul style={{ margin: '.35rem 0 0', paddingLeft: '1.1rem' }}>{errors.map(error => <li key={error}>{error}</li>)}</ul></Warning></div>}

      {result && input && <>
        {input.aiHours === 0 && <Warning level="info" title="No implementation effort entered">The time baseline and percentage contingency are zero. Review and support allowances still apply. Check that verification and delivery work are represented before using these numbers.</Warning>}
        {input.rate === 0 && <Warning level="info" title="Your hourly baseline is zero">Monetary amounts are therefore zero. Clear the rate to explore hours only, or enter the baseline you want to use.</Warning>}
        {form.postLaunch > 0 && result.supportHours === 0 && <Warning level="warn" title="Post-launch responsibility has no support hours">Your responsibility selection does not create hidden work allowances. Add expected support effort or explicitly exclude it from the project scope.</Warning>}

        <div style={GRID}>
          <Metric label="Pure implementation baseline" value={money(result.timeBaseline)} sublabel={`${fmt(input.aiHours)} h × ${input.rate === null ? 'your rate' : `${currency} ${fmt(input.rate, 2)}/h`}`} />
          <Metric label="Risk-aware working effort" value={`${fmt(result.lowHours)}–${fmt(result.highHours)} h`} color={ACCENT} sublabel={`${fmt(result.supportHours)} h support + ${fmt(input.reviewHours)} h review included`} />
          <Metric label="Implementation time change" value={result.reductionPct === null ? 'No comparison basis' : `${fmt(Math.abs(result.reductionPct))}% ${result.reductionPct < 0 ? 'more' : 'less'}`} sublabel={result.hoursSaved >= 0 ? `${fmt(result.hoursSaved)} h saved against your traditional estimate` : `${fmt(Math.abs(result.hoursSaved))} h more than your traditional estimate`} />
        </div>

        <section style={{ padding: '1.25rem', background: 'var(--k-bg-elevated)', border: '1.5px solid var(--k-border)', borderRadius: '1rem', minWidth: 0 }}>
          <h3 style={H3}>Time shrinks. The whole commitment may not.</h3>
          <div style={{ display: 'grid', gap: '1.05rem' }}>
            {[
              { label: 'Traditional implementation', total: input.traditionalHours, segments: [{ amount: input.traditionalHours, color: 'var(--k-text-muted)' }] },
              { label: 'AI-assisted implementation', total: input.aiHours, segments: [{ amount: input.aiHours, color: ACCENT }] },
              { label: 'Working scope · lower reserve', total: result.lowHours, segments: [{ amount: input.aiHours, color: ACCENT }, { amount: input.reviewHours + result.supportHours, color: '#6CA6FF' }, { amount: result.reserveLowHours, color: '#b596f6' }] },
              { label: 'Working scope · upper reserve', total: result.highHours, segments: [{ amount: input.aiHours, color: ACCENT }, { amount: input.reviewHours + result.supportHours, color: '#6CA6FF' }, { amount: result.reserveHighHours, color: '#b596f6' }] },
            ].map(row => <div key={row.label}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '.2rem .6rem', fontSize: '.8rem', marginBottom: '.4rem' }}><span style={{ color: 'var(--k-text-muted)' }}>{row.label}</span><strong style={{ color: 'var(--k-text)' }}>{fmt(row.total)} h</strong></div>
              <div aria-hidden="true" style={{ display: 'flex', height: 18, background: 'var(--k-bg)', borderRadius: 5, overflow: 'hidden' }}>{row.segments.map((segment, index) => <span key={index} style={{ display: 'block', width: `${segment.amount / maxHours * 100}%`, background: segment.color, borderRight: index < row.segments.length - 1 && segment.amount > 0 ? '2px solid var(--k-bg-elevated)' : undefined, boxSizing: 'border-box' }} />)}</div>
            </div>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem 1rem', fontSize: '.75rem', marginTop: '1rem', color: 'var(--k-text-muted)' }}>{[['Implementation', ACCENT], ['Review + support', '#6CA6FF'], ['Contingency', '#b596f6']].map(([label, color]) => <span key={label}><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, background: color, marginRight: 5, borderRadius: 2 }} />{label}</span>)}</div>
          <p style={NOTE}>The first two bars compare implementation only. The working-scope bars add the explicitly listed delivery allowances. All bars use the same hours scale.</p>
        </section>

        <section style={{ border: `1.5px solid ${ACCENT}`, background: 'color-mix(in srgb, #F7933C 7%, var(--k-bg-card))', borderRadius: '1rem', padding: '1.25rem', minWidth: 0 }}>
          <div style={{ fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--k-text-muted)', fontWeight: 800 }}>Your risk-aware working range</div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 'clamp(1.05rem, 3vw, 1.5rem)', color: 'var(--k-text)', margin: '.45rem 0', overflowWrap: 'anywhere' }}>{moneyRange}</div>
          <p style={NOTE}>{fmt(result.lowHours)}–{fmt(result.highHours)} hours × {input.rate === null ? 'your hourly baseline' : `${currency} ${fmt(input.rate, 2)}/hour`}. This is a scope-and-contingency planning range, not a market price, a probability interval, or a promise that overruns stop here.</p>
        </section>

        <section>
          <h3 style={H3}>Responsibility stays visible: {responsibilityLabel.toLowerCase()}</h3>
          <div style={GRID}>{(Object.keys(RESPONSIBILITY) as (keyof typeof RESPONSIBILITY)[]).map(key => <div key={key} style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '.75rem', padding: '.9rem' }}><div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginBottom: '.35rem' }}>{RESPONSIBILITY[key].label}</div><div style={{ fontWeight: 700, fontSize: '.87rem', color: 'var(--k-text)' }}>{RESPONSIBILITY[key].options[form[key]]}</div></div>)}</div>
          <p style={NOTE}>Qualitative context, with no money multiplier: any full architecture ownership, core-business impact, or operational ownership makes this panel “High”; shared ownership, bounded support, or important workflow impact makes it “Moderate”; otherwise it is “Limited.” Faster implementation does not change those commitments. Business value needs a conversation about outcomes, alternatives, and accountability.</p>
        </section>

        <Insight
          what={result.reductionPct === null ? 'There is no traditional-effort baseline to compare yet.' : result.reductionPct >= 0 ? `Your estimates reduce implementation time by ${fmt(result.reductionPct)}%, from ${fmt(input.traditionalHours)} h to ${fmt(input.aiHours)} h.` : `Your AI-assisted estimate is ${fmt(Math.abs(result.hoursSaved))} h higher than the traditional estimate; this scenario assumes no time saving.`}
          why={`${fmt(input.reviewHours)} h of review/handoff and ${fmt(result.supportHours)} h of support remain in the working scope. The ${form.customReserve ? 'reserve range you entered' : 'selected scenario assumptions'} add ${fmt(result.reserveLowHours)}–${fmt(result.reserveHighHours)} h of contingency. Your ${responsibilityLabel.toLowerCase()} responsibility context is kept separate from the price math.`}
          tip={form.factors.clarity === 2 || form.factors.uncertainty === 2 ? 'Use a discovery step to resolve major unknowns before a fixed quote. Confirm acceptance criteria, revision limits, and the support boundary.' : form.postLaunch === 2 ? 'Separate expected support effort from availability commitments. Make ownership, response expectations, and the end of support explicit before quoting.' : 'Turn the working assumptions into scope: define review time, revision limits, support allowances, and what triggers a new estimate.'}
        />

        <details style={{ minWidth: 0, border: '1px solid var(--k-border)', borderRadius: '.75rem', padding: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--k-text)', fontSize: '.9rem' }}>Show every number in the range</summary>
          <div style={{ marginTop: '1rem', display: 'grid', gap: '.65rem', fontSize: '.85rem', color: 'var(--k-text)', lineHeight: 1.7 }}>
            <div><strong>Planned work:</strong> {fmt(input.aiHours)} implementation + {fmt(input.reviewHours)} review/handoff + ({fmt(input.supportWeeks)} weeks × {fmt(input.supportHoursPerWeek)} support h/week) = <strong>{fmt(result.plannedHours)} h</strong>.</div>
            <div><strong>Lower contingency:</strong> {fmt(input.aiHours)} h × {fmt(result.reserveLowPct)}% = <strong>{fmt(result.reserveLowHours)} h</strong>.</div>
            <div><strong>Upper contingency:</strong> {fmt(input.aiHours)} h × {fmt(result.reserveHighPct)}% = <strong>{fmt(result.reserveHighHours)} h</strong>.</div>
            <div><strong>Working range:</strong> ({fmt(result.plannedHours)} + {fmt(result.reserveLowHours)}) to ({fmt(result.plannedHours)} + {fmt(result.reserveHighHours)}) = <strong>{fmt(result.lowHours)}–{fmt(result.highHours)} h</strong>, then multiply by your rate.</div>
          </div>
          <p style={NOTE}>{form.customReserve ? 'Your manual reserve replaces the scenario percentages below; these selections remain context only.' : 'Each row contributes the listed percentage of AI-assisted implementation hours. Percentages are added once, never compounded, and are not applied to review or support.'}</p>
          <div tabIndex={0} role="region" aria-label="Scenario contingency assumptions; horizontally scrollable" style={{ overflowX: 'auto', marginTop: '.8rem', maxWidth: '100%' }}>
            <table style={{ width: '100%', minWidth: 470, borderCollapse: 'collapse', fontSize: '.78rem', textAlign: 'left' }}>
              <thead><tr>{['Factor', 'Selected assumption', 'Lower', 'Upper'].map(label => <th key={label} scope="col" style={{ padding: '.5rem', borderBottom: '1px solid var(--k-border)', color: 'var(--k-text)' }}>{label}</th>)}</tr></thead>
              <tbody>{result.factors.map(factor => <tr key={factor.key}><th scope="row" style={{ padding: '.5rem', fontWeight: 600, color: 'var(--k-text-muted)' }}>{factor.label}</th><td style={{ padding: '.5rem', color: 'var(--k-text-muted)' }}>{factor.selected}</td><td style={{ padding: '.5rem' }}>{factor.low}%</td><td style={{ padding: '.5rem' }}>{factor.high}%</td></tr>)}</tbody>
            </table>
          </div>
          <p style={NOTE}>These are illustrative planning coefficients, not measured failure rates or market research. Related factors can overlap; use your own contingency range to reflect your evidence. Deadline allowance represents possible coordination/rework effort, not a rush-price rule. Architecture ownership, criticality, and post-launch responsibility add no automatic fee. Taxes, software, hosting, subcontractors, margin, and availability premiums are not added.</p>
        </details>

        <section>
          <h3 style={H3}>Before you quote · {checked.length}/{checklist.length} considered</h3>
          <div style={{ display: 'grid', gap: '.7rem' }}>{checklist.map((item, index) => <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '.65rem', fontSize: '.85rem', color: 'var(--k-text)', lineHeight: 1.6 }}><input type="checkbox" checked={checked.includes(String(index))} onChange={event => setChecked(previous => event.target.checked ? [...previous, String(index)] : previous.filter(key => key !== String(index)))} style={{ accentColor: ACCENT, marginTop: '.3rem', flexShrink: 0 }} /><span>{item}</span></label>)}</div>
          <p style={NOTE}>This checklist stays in this tab and resets when the scenario changes. It is a planning aid, not a guarantee of project or pricing outcomes.</p>
        </section>
      </>}
      <button type="button" onClick={reset} style={{ justifySelf: 'start', padding: '.65rem 1rem', background: 'var(--k-bg)', color: 'var(--k-text)', border: '1px solid var(--k-border)', borderRadius: '.5rem', cursor: 'pointer', fontWeight: 700 }}>Reset lab</button>
    </div>
  );
}
