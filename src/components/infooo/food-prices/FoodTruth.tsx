/* The visible truth boundary: what is measured, what the model assumes, what is simulated, and what it leaves out.
   Numbered notes point at the world's registry sources, so the list below cannot drift from them. Figures come from the model. */
import type { ReactNode } from 'react';
import { ALL_FOOD_FARM_SHARE, ALL_GROCERIES, AWAY_FROM_HOME_FARM_SHARE, INCOME, food } from './foodModel.ts';
import { cents, fx } from './foodStory.ts';
import { ALL_FOODS_HEAD, allFoodsRows, usd } from './foodViews.ts';

const note = (...ns: number[]) => <sup>{ns.map((n, i) => <a key={n} href={`#fp-s${n}`} aria-label={`Source ${n}`}>{i ? ` ${n}` : n}</a>)}</sup>;
interface Props { sources: readonly { label: string; url: string }[]; lastReviewed?: string }

export default function FoodTruth({ sources, lastReviewed }: Props) {
  const f = (id: string) => cents(food(id).farmShare);
  const facts: ReactNode[] = [
    <>In 2024 U.S. farms received {f(ALL_GROCERIES)} of each dollar spent on food at home (groceries), {cents(AWAY_FROM_HOME_FARM_SHARE)} of each dollar spent on food away from home, and {cents(ALL_FOOD_FARM_SHARE)} across all domestically produced food. The rest, the “marketing share”, pays for processing, transport, storage, wholesale and retail. {note(1)}</>,
    <>The farm share differs a lot by food: {f('Xf1110')} for fresh eggs, {f('Xf1103')} for beef, {f('Xf1108')} for fresh milk, {f('Xf1102')} for bakery products, {f('Xf1128')} for soft drinks and bottled water. {note(2)}</>,
    <>Seen another way, salaries and benefits across the whole chain are {cents(food(ALL_GROCERIES).labor)} of the average grocery dollar. This is a second accounting of the same dollar, not an extra slice. {note(2, 3)}</>,
    <>Because the farm share is small, big commodity swings move retail food prices less than people expect. Transmission is quicker and fuller when the farm share is larger, and retail prices tend to follow commodity prices up faster than down. {note(4, 5)}</>,
    <>In 2024 the lowest-income fifth of U.S. households spent about {usd(INCOME[0].spend)} on food, {fx(INCOME[0].share, 1)}% of before-tax income. The middle fifth spent {usd(INCOME[1].spend)} ({fx(INCOME[1].share, 1)}%) and the highest fifth {usd(INCOME[2].spend)} ({fx(INCOME[2].share, 1)}%). {note(6)}</>,
  ];
  const model: ReactNode[] = [
    <>Each food’s price is split into seven slices: the <b>farm gate</b> (USDA’s farm share) and six <b>links</b> after the farm. The post-farm part is divided among the links in proportion to the value USDA assigns to each industry group for that food.</>,
    <>A cost shock grows one slice by the percentage you choose. If nothing else changes and the whole extra cost reaches the shelf, the price rises by <b>slice × shock</b>. Doubling the shock doubles the effect.</>,
    <><b>Wages</b> use USDA’s salary-and-benefits figure. Wages sit inside every slice, so the wage rise is drawn as an extra block on top and is never added to the others.</>,
    'The household panel multiplies a price rise by the share of income spent on food, with the same purchases and the same income.',
    'This is arithmetic about where the money goes. It does not say why prices really moved, and it is not a forecast.',
  ];
  const simulation = [
    '“Play the shock” slides the chosen cost from 0% to 50% over a few seconds. Nothing is random.',
    'Every number you see is computed in your browser from the 2024 USDA figures bundled in this page. None is a live price, a forecast, or a reading from a real store.',
    'The model runs in your browser. No account, no upload, nothing stored. If you accepted the site’s analytics, anonymous counts of which controls were used are recorded; nothing else leaves this page.',
  ];
  const limits: ReactNode[] = [
    <><b>A ceiling, not a prediction.</b> It assumes the full extra cost reaches the shelf at once, shoppers keep buying the same things, and no one absorbs it in profit. Real prices rarely behave that neatly.</>,
    <><b>Averages.</b> USDA shares are national averages across all items in a category. Your store, brand or region will differ.</>,
    <><b>The post-farm split is an assumption.</b> USDA gives the farm share directly. Splitting the rest across the six links by value added is this model’s choice.</>,
    <><b>Energy counts only after the farm.</b> Farms’ own fuel and fertilizer costs sit inside the farm-gate slice, so the energy row understates how much fuel matters overall.</>,
    <><b>Profit and fairness are left out.</b> The slices show where money goes, not who deserves what or who has market power.</>,
    <><b>Demand is not modelled.</b> Shortages, stockpiling and shifting demand also move prices. They are not here.</>,
    <><b>U.S. only, one year.</b> 2024 data on domestically produced food, from a model USDA revised in 2026. Results are not comparable with older USDA releases.</>,
    <><b>The household panel is an upper bound.</b> USDA’s food spending includes eating out; the panel treats the whole food bill like groceries. Not financial advice.</>,
  ];
  return <section className="fp-block" aria-labelledby="fp-truth-title">
    <h2 id="fp-truth-title">What’s real, what’s modelled, what’s simulated</h2>
    <p className="fp-lead">Every claim here is one of three things. Sources are listed below.</p>
    <div className="fp-truth">
      <div className="fp-card"><span className="fp-pill">FACT</span><ul>{facts.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      <div className="fp-card"><span className="fp-pill">MODEL</span><ul>{model.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      <div className="fp-card"><span className="fp-pill">SIMULATION</span><ul>{simulation.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    </div>
    <div className="fp-card fp-wide"><h3>Limits</h3><ul>{limits.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    <details className="fp-data"><summary>Show the numbers for all 21 foods</summary>
      <div className="fp-tablewrap" tabIndex={0} role="region" aria-label="Slice numbers for every food, scrollable"><table className="fp-plain">
        <caption className="fp-sr">Cents of each food dollar, by slice. Wages are counted inside every slice.</caption>
        <thead><tr>{ALL_FOODS_HEAD.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{allFoodsRows().map(r => <tr key={r[0]}><th scope="row">{r[0]}</th>{r.slice(1).map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
    </details>
    <div className="fp-card fp-wide" id="fp-sources"><h3>Sources</h3>
      <ol>{sources.map((s, i) => <li key={s.url} id={`fp-s${i + 1}`}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ol>
      {lastReviewed && <p className="fp-meta">Last reviewed {lastReviewed}. USDA updates the Food Dollar every year (this edition: March 10, 2026). Refresh the bundled numbers and re-check the links each spring.</p>}
    </div>
  </section>;
}
