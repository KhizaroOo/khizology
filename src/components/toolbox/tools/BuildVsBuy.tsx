import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';
import DecisionLab from '../shared/DecisionLab';
import { safeNumber, safeDiv, formatNumber } from '../shared/mathHelpers';

const BUILD_COLOR = '#6CA6FF';
const BUY_COLOR = '#F7933C';

const DIMENSIONS = [
  { key: 'cost', label: 'Cost Efficiency' },
  { key: 'control', label: 'Control & Customization' },
  { key: 'speed', label: 'Speed to Ship' },
  { key: 'maintenance', label: 'Low Ongoing Maintenance' },
];

const OPTIONS = [
  { name: 'Build in-house', color: BUILD_COLOR, scores: { cost: 4, control: 9, speed: 3, maintenance: 4 } },
  { name: 'Buy / integrate', color: BUY_COLOR, scores: { cost: 7, control: 4, speed: 9, maintenance: 7 } },
];

const CHART_YEARS = 5;
const MARK_YEARS = [1, 2, 3, 5];
const CHART_W = 600;
const CHART_H = 200;

const sectionHeadingStyle = { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--k-text)', margin: '0 0 .35rem' } as const;
const sectionSubStyle = { fontSize: '.82rem', color: 'var(--k-text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 } as const;

export default function BuildVsBuy() {
  // ---- cost-over-time inputs ----
  const [hourlyCost, setHourlyCost] = useState('85');
  const [buildHours, setBuildHours] = useState('320');
  const [buySetupHours, setBuySetupHours] = useState('40');
  const [buyAnnualPrice, setBuyAnnualPrice] = useState('12000');
  const [buildMaintHours, setBuildMaintHours] = useState('80');
  const [buyMaintHours, setBuyMaintHours] = useState('20');

  const model = useMemo(() => {
    const hourly = Math.max(0, safeNumber(hourlyCost, 0));
    const buildOneTime = Math.max(0, safeNumber(buildHours, 0)) * hourly;
    const buySetupOneTime = Math.max(0, safeNumber(buySetupHours, 0)) * hourly;
    const buyAnnual = Math.max(0, safeNumber(buyAnnualPrice, 0));
    const buildMaintPerYear = Math.max(0, safeNumber(buildMaintHours, 0)) * hourly;
    const buyMaintPerYear = Math.max(0, safeNumber(buyMaintHours, 0)) * hourly;

    const buildCostAt = (year: number) => buildOneTime + buildMaintPerYear * year;
    const buyCostAt = (year: number) => buySetupOneTime + buyAnnual * year + buyMaintPerYear * year;

    // Solve buildCostAt(y) = buyCostAt(y) for y (linear in year, so at most one crossing).
    const numer = buildOneTime - buySetupOneTime;
    const denom = buyAnnual + buyMaintPerYear - buildMaintPerYear;
    const rawBreakEven = safeDiv(numer, denom, Infinity);
    const breakEvenYear = Number.isFinite(rawBreakEven) && rawBreakEven > 0 && rawBreakEven <= CHART_YEARS ? rawBreakEven : null;

    const diffStart = buildCostAt(0) - buyCostAt(0);
    const diffEnd = buildCostAt(CHART_YEARS) - buyCostAt(CHART_YEARS);
    const cheaperAtStart = diffStart <= 0 ? 'Build in-house' : 'Buy / integrate';
    const cheaperAtEnd = diffEnd <= 0 ? 'Build in-house' : 'Buy / integrate';
    const roughlyTied = Math.abs(diffStart) < 1 && Math.abs(diffEnd) < 1;

    const marks = MARK_YEARS.map((year) => ({ year, build: buildCostAt(year), buy: buyCostAt(year) }));
    const maxCost = Math.max(buildCostAt(CHART_YEARS), buyCostAt(CHART_YEARS), 1);

    return { buildCostAt, buyCostAt, breakEvenYear, marks, maxCost, cheaperAtStart, cheaperAtEnd, roughlyTied };
  }, [hourlyCost, buildHours, buySetupHours, buyAnnualPrice, buildMaintHours, buyMaintHours]);

  const chart = useMemo(() => {
    const xScale = (year: number) => safeDiv(year, CHART_YEARS, 0) * CHART_W;
    const yScale = (cost: number) => CHART_H - safeDiv(cost, model.maxCost, 0) * CHART_H;
    const buildLine = `${xScale(0)},${yScale(model.buildCostAt(0))} ${xScale(CHART_YEARS)},${yScale(model.buildCostAt(CHART_YEARS))}`;
    const buyLine = `${xScale(0)},${yScale(model.buyCostAt(0))} ${xScale(CHART_YEARS)},${yScale(model.buyCostAt(CHART_YEARS))}`;
    const breakEvenX = model.breakEvenYear !== null ? xScale(model.breakEvenYear) : null;
    const labelX = breakEvenX !== null ? Math.min(Math.max(breakEvenX, 55), CHART_W - 55) : null;
    return { xScale, yScale, buildLine, buyLine, breakEvenX, labelX };
  }, [model]);

  const year1 = model.marks.find((m) => m.year === 1)!;
  const year3 = model.marks.find((m) => m.year === 3)!;

  return (
    <>
      <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
        <h3 style={sectionHeadingStyle}>The numbers: cost over time</h3>
        <p style={sectionSubStyle}>
          One-time setup versus ongoing fees — see when, if ever, one path becomes cheaper than the other.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <InputField label="Internal hourly cost" value={hourlyCost} onChange={setHourlyCost} min="0" step="5" suffix="$/hr" />
          <InputField label="Build effort" value={buildHours} onChange={setBuildHours} min="0" step="10" suffix="hrs" />
          <InputField label="Buy setup / integration effort" value={buySetupHours} onChange={setBuySetupHours} min="0" step="5" suffix="hrs" />
          <InputField label="SaaS / license price" value={buyAnnualPrice} onChange={setBuyAnnualPrice} min="0" step="500" suffix="$/yr" />
          <InputField label="Build maintenance" value={buildMaintHours} onChange={setBuildMaintHours} min="0" step="5" suffix="hrs/yr" />
          <InputField label="Buy maintenance" value={buyMaintHours} onChange={setBuyMaintHours} min="0" step="5" suffix="hrs/yr" />
        </div>

        <VisualizationContainer minHeight={240}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H + 26}`}
            style={{ width: '100%', maxWidth: `${CHART_W}px`, height: 'auto' }}
            role="img"
            aria-label="Cumulative cost of building versus buying across 5 years, with a break-even point marked if the lines cross"
          >
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={CHART_W} y1={CHART_H * f} y2={CHART_H * f} stroke="var(--k-border)" strokeDasharray="3 3" strokeWidth={1} />
            ))}
            {MARK_YEARS.map((year) => (
              <line key={year} x1={chart.xScale(year)} x2={chart.xScale(year)} y1={0} y2={CHART_H} stroke="var(--k-border)" strokeDasharray="2 4" strokeWidth={1} />
            ))}

            {chart.breakEvenX !== null && (
              <line x1={chart.breakEvenX} x2={chart.breakEvenX} y1={0} y2={CHART_H} stroke="var(--k-text-muted)" strokeDasharray="4 4" strokeWidth={1.5} />
            )}

            <polyline points={chart.buildLine} fill="none" stroke={BUILD_COLOR} strokeWidth={2.5} />
            <polyline points={chart.buyLine} fill="none" stroke={BUY_COLOR} strokeWidth={2.5} />

            {model.marks.map((m) => (
              <g key={m.year}>
                <circle cx={chart.xScale(m.year)} cy={chart.yScale(m.build)} r={3.5} fill={BUILD_COLOR} stroke="var(--k-bg)" strokeWidth={1} />
                <circle cx={chart.xScale(m.year)} cy={chart.yScale(m.buy)} r={3.5} fill={BUY_COLOR} stroke="var(--k-bg)" strokeWidth={1} />
                <text x={chart.xScale(m.year)} y={CHART_H + 18} textAnchor="middle" fontSize="9" fill="var(--k-text-muted)">Yr {m.year}</text>
              </g>
            ))}

            {chart.breakEvenX !== null && chart.labelX !== null && (
              <text x={chart.labelX} y={12} textAnchor="middle" fontSize="9" fontWeight={700} fill="var(--k-text-muted)">
                Break-even ~Yr {formatNumber(model.breakEvenYear!, 1)}
              </text>
            )}

            <text x={4} y={12} fontSize="9" fill="var(--k-text-muted)">${formatNumber(model.maxCost, 0)}</text>
            <text x={4} y={CHART_H - 4} fontSize="9" fill="var(--k-text-muted)">$0</text>
          </svg>
        </VisualizationContainer>

        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: BUILD_COLOR, borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />Build in-house</span>
          <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: BUY_COLOR, borderRadius: '2px', marginRight: '.375rem', verticalAlign: 'middle' }} />Buy / integrate</span>
          <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '1px dashed var(--k-text-muted)', marginRight: '.375rem', verticalAlign: 'middle' }} />Break-even</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
          <Metric label="Build — Year 1" value={`$${formatNumber(year1.build, 0)}`} color={BUILD_COLOR} />
          <Metric label="Buy — Year 1" value={`$${formatNumber(year1.buy, 0)}`} color={BUY_COLOR} />
          <Metric label="Build — Year 3" value={`$${formatNumber(year3.build, 0)}`} color={BUILD_COLOR} />
          <Metric label="Buy — Year 3" value={`$${formatNumber(year3.buy, 0)}`} color={BUY_COLOR} />
          <Metric
            label="Break-even"
            value={model.breakEvenYear !== null ? `Year ${formatNumber(model.breakEvenYear, 1)}` : `No break-even within ${CHART_YEARS} yrs`}
            sublabel={
              model.roughlyTied
                ? `Both paths cost about the same through Year ${CHART_YEARS}`
                : model.breakEvenYear !== null
                ? `${model.cheaperAtEnd} is cheaper after this point`
                : `${model.cheaperAtStart} stays cheaper through Year ${CHART_YEARS}`
            }
          />
        </div>

        <p style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', margin: '.75rem 0 0', lineHeight: 1.5 }}>
          Simplified, linear model — assumes steady maintenance hours and a flat license price over time. Treat the break-even year as a rough signal, not a forecast.
        </p>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={sectionHeadingStyle}>The priorities: how each path scores</h3>
        <p style={sectionSubStyle}>
          Cost is only one lens — weigh it against control, speed to ship, and ongoing maintenance overhead below.
        </p>
        <DecisionLab
          dimensions={DIMENSIONS}
          options={OPTIONS}
          accent="#5CCFAF"
          assumptionsNote="Editorial 0–10 assumptions based on general build-vs-buy tradeoffs — building typically wins on control but loses on speed and maintenance burden; buying is usually the reverse. Your specific situation (team size, budget, how core this is to your product) can easily flip these."
        />
      </div>
    </>
  );
}
