import { useMemo, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { useLocalPref } from '../shared/useLocalPref';
import { safeNumber, clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

interface AskItem {
  label: string;
  hours: number;
}

const PRESET_ASKS: AskItem[] = [
  { label: '"Just one more revision round"', hours: 2 },
  { label: '"Can you also make it mobile responsive?"', hours: 4 },
  { label: '"Quick logo tweak"', hours: 1 },
  { label: '"Add a contact form"', hours: 3 },
  { label: '"Small copy change"', hours: 0.5 },
  { label: '"One more color scheme option"', hours: 2 },
  { label: '"Can we add analytics?"', hours: 1.5 },
  { label: '"Minor animation polish"', hours: 2.5 },
  { label: '"Extra stakeholder review round"', hours: 3 },
  { label: '"Quick accessibility pass"', hours: 2 },
  { label: '"Add a loading state"', hours: 1 },
  { label: '"One more round of feedback"', hours: 2 },
];

const MAX_ASKS = PRESET_ASKS.length;

// Rush penalty — a compressed deadline is treated as just another form of scope creep.
const RUSH_ASK: AskItem = { label: '"Can you also just... deliver it sooner?"', hours: 6 };

interface CurrencyPref {
  code: string;
  custom: string;
}

const CURRENCY_PRESETS: { code: string; label: string; symbol: string }[] = [
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'PKR', label: 'PKR (Rs)', symbol: 'Rs' },
  { code: 'INR', label: 'INR (Rs)', symbol: 'Rs' },
  { code: 'CUSTOM', label: 'Custom…', symbol: '' },
];

type Severity = 'good' | 'warn' | 'danger';

function severityFor(rateLostPct: number): Severity {
  if (rateLostPct >= 30) return 'danger';
  if (rateLostPct >= 10) return 'warn';
  return 'good';
}

const SEVERITY_COLOR: Record<Severity, string> = {
  good: '#22c55e',
  warn: '#F7933C',
  danger: '#ef4444',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.8rem',
  fontWeight: 700,
  color: 'var(--k-text-muted)',
  marginBottom: '.375rem',
  fontFamily: "'Poppins', sans-serif",
  textTransform: 'uppercase',
  letterSpacing: '.06em',
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '.6rem .875rem',
  borderRadius: '.5rem',
  border: '1.5px solid var(--k-border)',
  background: 'var(--k-bg)',
  color: 'var(--k-text)',
  fontSize: '.9rem',
  fontFamily: "'Mulish', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

/** Rounds to one decimal and drops a trailing .0 so hand-typed hours don't show float noise. */
function fmtHours(n: number): string {
  const r = Math.round(safeNumber(n, 0) * 10) / 10;
  return Number.isInteger(r) ? `${r}` : r.toFixed(1);
}

export default function ScopeCreepVisualizer() {
  const [quotedPrice, setQuotedPrice] = useState('3000');
  const [originalHours, setOriginalHours] = useState('40');
  const [asksCount, setAsksCount] = useState(0);

  // Currency is display-only relabeling — never a real exchange-rate conversion.
  const [currencyPref, setCurrencyPref] = useLocalPref<CurrencyPref>('scopeCreepCurrency', { code: 'USD', custom: '$' });
  const activeCurrency = CURRENCY_PRESETS.find((c) => c.code === currencyPref.code);
  const symbol = currencyPref.code === 'CUSTOM' ? currencyPref.custom.trim() || '$' : activeCurrency?.symbol ?? '$';
  const symbolIsWordy = /[a-zA-Z]/.test(symbol);
  const fmtMoney = (n: number, decimals = 0) => {
    const val = formatNumber(safeNumber(n, 0), decimals);
    return symbolIsWordy ? `${symbol} ${val}` : `${symbol}${val}`;
  };

  // Free-form "add your own ask" entries — participate in the same math as the preset asks.
  const [customAsks, setCustomAsks] = useState<AskItem[]>([]);
  const [newAskLabel, setNewAskLabel] = useState('');
  const [newAskHours, setNewAskHours] = useState('1');
  const addCustomAsk = () => {
    const label = newAskLabel.trim();
    const hours = clamp(safeNumber(newAskHours, 0), 0, 200);
    if (!label || hours <= 0) return;
    setCustomAsks((prev) => [...prev, { label, hours }]);
    setNewAskLabel('');
    setNewAskHours('1');
  };
  const removeCustomAsk = (idx: number) => setCustomAsks((prev) => prev.filter((_, i) => i !== idx));

  // "Deadline moved up" — a compressed timeline, modeled as one more fixed-size ask.
  const [rushEnabled, setRushEnabled] = useState(false);

  const price = clamp(safeNumber(quotedPrice, 0), 0, Number.MAX_SAFE_INTEGER);
  const origHours = clamp(safeNumber(originalHours, 0.5), 0.5, Number.MAX_SAFE_INTEGER);

  // cumulativeHours[k] = total extra hours added by the first k preset asks
  const cumulativeHours = useMemo(() => {
    const arr: number[] = [0];
    for (let i = 0; i < PRESET_ASKS.length; i++) {
      arr.push(arr[i] + PRESET_ASKS[i].hours);
    }
    return arr;
  }, []);

  const customExtraHours = useMemo(
    () => customAsks.reduce((sum, a) => sum + a.hours, 0) + (rushEnabled ? RUSH_ASK.hours : 0),
    [customAsks, rushEnabled]
  );

  // effective rate at every possible preset-ask count, 0..MAX_ASKS, always including custom asks + rush on top
  const curve = useMemo(
    () => cumulativeHours.map((added) => safeDiv(price, origHours + customExtraHours + added, 0)),
    [cumulativeHours, price, origHours, customExtraHours]
  );

  const addedAsks = PRESET_ASKS.slice(0, asksCount);
  const combinedAddedAsks = [...addedAsks, ...customAsks, ...(rushEnabled ? [RUSH_ASK] : [])];
  const addedHours = cumulativeHours[asksCount] + customExtraHours;
  const totalHours = origHours + addedHours;
  const originalRate = safeDiv(price, origHours, 0);
  const effectiveRate = safeDiv(price, totalHours, 0);
  const rateLostPct = originalRate > 0 ? clamp(((originalRate - effectiveRate) / originalRate) * 100, 0, 100) : 0;
  const sev = severityFor(rateLostPct);
  const color = SEVERITY_COLOR[sev];

  const chartW = 560;
  const chartH = 180;
  const maxRate = originalRate || 1;
  const yFor = (r: number) => chartH - clamp(safeDiv(r, maxRate, 0), 0, 1) * chartH;
  const xFor = (k: number) => (k / MAX_ASKS) * chartW;

  const linePoints = curve.map((r, k) => `${xFor(k)},${yFor(r)}`).join(' ');
  const curX = xFor(asksCount);
  const curY = yFor(effectiveRate);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Quoted project price" value={quotedPrice} onChange={setQuotedPrice} suffix={symbol} />
        <InputField label="Original estimated hours" value={originalHours} onChange={setOriginalHours} suffix="hrs" />
        <div>
          <label style={fieldLabelStyle}>Currency</label>
          <select
            style={fieldInputStyle}
            value={currencyPref.code}
            onChange={(e) => setCurrencyPref({ ...currencyPref, code: e.target.value })}
          >
            {CURRENCY_PRESETS.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        {currencyPref.code === 'CUSTOM' && (
          <InputField
            label="Custom symbol / code"
            type="text"
            value={currencyPref.custom}
            onChange={(v) => setCurrencyPref({ ...currencyPref, custom: v })}
            placeholder="e.g. AED, kr, R$"
          />
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <RangeControl
          label='Extra "small" asks added'
          value={asksCount}
          onChange={setAsksCount}
          min={0}
          max={MAX_ASKS}
          formatValue={(v) => (v === 1 ? '1 ask' : `${v} asks`)}
          accent="#F7933C"
        />
      </div>

      <AdvancedDisclosure summary="More ways scope creeps in">
        <InputField label="Your own ask" type="text" value={newAskLabel} onChange={setNewAskLabel} placeholder='e.g. "Can we also support dark mode?"' />
        <InputField label="Hours it'll cost" type="number" value={newAskHours} onChange={setNewAskHours} step="0.5" min="0" suffix="hrs" />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={addCustomAsk}
            disabled={!newAskLabel.trim()}
            style={{
              width: '100%',
              background: newAskLabel.trim() ? '#F7933C' : 'var(--k-border)',
              color: '#fff',
              border: 'none',
              padding: '.6rem 1rem',
              borderRadius: '.5rem',
              fontWeight: 700,
              fontSize: '.85rem',
              fontFamily: "'Poppins', sans-serif",
              cursor: newAskLabel.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add to the pile
          </button>
        </div>

        {customAsks.length > 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {customAsks.map((ask, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '.75rem',
                  fontSize: '.85rem',
                  color: 'var(--k-text)',
                  background: 'var(--k-bg)',
                  border: '1px solid var(--k-border)',
                  borderRadius: '.5rem',
                  padding: '.4rem .75rem',
                }}
              >
                <span>{ask.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexShrink: 0 }}>
                  <span style={{ color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                    +{fmtHours(ask.hours)}h
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustomAsk(i)}
                    aria-label={`Remove ${ask.label}`}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--k-text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--k-text)', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
            <input
              type="checkbox"
              checked={rushEnabled}
              onChange={(e) => setRushEnabled(e.target.checked)}
              style={{ accentColor: '#F7933C', width: '16px', height: '16px' }}
            />
            Deadline moved up (adds a fixed rush penalty: +{fmtHours(RUSH_ASK.hours)}h)
          </label>
          <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', margin: '.4rem 0 0' }}>
            Custom asks and the rush penalty are added on top of the slider above the moment you add them — this is a simplified model, not an invoice.
          </p>
        </div>
      </AdvancedDisclosure>

      <VisualizationContainer minHeight={220}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 24}`}
          style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
          role="img"
          aria-label="Effective hourly rate declining as more small asks pile onto the project"
        >
          <line x1={0} y1={yFor(curve[0])} x2={chartW} y2={yFor(curve[0])} stroke="var(--k-border)" strokeWidth={1} strokeDasharray="4 4" />
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} />
          <circle cx={curX} cy={curY} r={6} fill={color} stroke="var(--k-bg)" strokeWidth={2} />
          <text x={4} y={12} fontSize="9" fill="var(--k-text-muted)">{fmtMoney(originalRate)}/hr quoted</text>
          <text x={4} y={chartH + 18} fontSize="9" fill="var(--k-text-muted)">0 asks</text>
          <text x={chartW - 46} y={chartH + 18} fontSize="9" fill="var(--k-text-muted)">{MAX_ASKS} asks</text>
        </svg>
      </VisualizationContainer>

      <div style={{ marginTop: '1.25rem' }}>
        <div
          style={{
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--k-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            fontFamily: "'Poppins', sans-serif",
            marginBottom: '.5rem',
          }}
        >
          What you've quietly said yes to
        </div>
        {combinedAddedAsks.length === 0 ? (
          <p style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', margin: 0 }}>
            Nothing yet — drag the slider above to start adding "just one small thing" requests.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {combinedAddedAsks.map((ask, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '.75rem',
                  fontSize: '.85rem',
                  color: 'var(--k-text)',
                  background: 'var(--k-bg)',
                  border: '1px solid var(--k-border)',
                  borderRadius: '.5rem',
                  padding: '.5rem .75rem',
                }}
              >
                <span>{ask.label}</span>
                <span style={{ color: 'var(--k-text-muted)', fontFamily: "'Poppins', sans-serif", fontWeight: 700, flexShrink: 0 }}>
                  +{fmtHours(ask.hours)}h
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Original rate" value={`${fmtMoney(originalRate)}/hr`} sublabel={`${origHours}h estimated`} />
        <Metric label="Effective rate now" value={`${fmtMoney(effectiveRate)}/hr`} color={color} sublabel={`${totalHours.toFixed(1)}h actual`} />
        <Metric label="Rate lost" value={`${rateLostPct.toFixed(0)}%`} color={color} sublabel="vs. what you quoted" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {combinedAddedAsks.length === 0 ? (
          <Warning level="good" title="Still on scope — charging exactly what you quoted">
            Every "quick" ask below costs real hours nobody paid for. Drag the slider up to watch your rate quietly shrink.
          </Warning>
        ) : (
          <Warning level={sev} title={`You're now effectively working for ${rateLostPct.toFixed(0)}% less than you quoted`}>
            {sev === 'danger' &&
              `${fmtHours(addedHours)}h of "small" extras turned a ${fmtMoney(originalRate)}/hr job into a ${fmtMoney(effectiveRate)}/hr one. None of these asks were unreasonable on their own — that's exactly how scope creep works. Worth pricing the next one as its own line item.`}
            {sev === 'warn' &&
              `That's real money walking out the door for free. A quick "happy to do this — here's the extra cost" message now is cheaper than staying quiet.`}
            {sev === 'good' &&
              `Small so far, but it adds up fast. This is the moment to start saying "sure, that's a ${symbol}X add-on" instead of just nodding along.`}
          </Warning>
        )}
      </div>
    </div>
  );
}
