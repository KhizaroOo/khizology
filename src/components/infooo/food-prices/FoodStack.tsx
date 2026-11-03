/* The picture: one dollar of each of two foods as stacks of slices on a fixed scale, with a table of the same numbers underneath.
   The table is the accessible version of the bars: every figure drawn is also written. */
import { FOODS, LINKS, type CostId } from './foodModel.ts';
import { barPercent, cents, cents0, fx, money, shortName, showSliceLabel, signed, type Calc } from './foodStory.ts';

const barLabel = (name: string, c: Calc) => `${name}. A $1.00 item becomes ${money(c.total)}. Slices in cents: ${c.slices.map(s => `${LINKS.find(l => l.id === s.id)!.label} ${fx(s.now, 1)}`).join(', ')}${c.cap > 0 ? `. Wage rise adds ${fx(c.cap, 1)} on top` : ''}.`;

function Bar({ c, name }: { c: Calc; name: string }) {
  return <div className="fp-barwrap" role="img" aria-label={barLabel(name, c)}>
    <div className="fp-toplabel" style={{ bottom: `${barPercent(c.total)}%` }}>{money(c.total)}</div>
    <div className="fp-bar">
      {c.slices.map(s => <div key={s.id} className={`fp-seg fp-s-${s.id}${s.extra > 0 ? ' fp-hit' : ''}`} style={{ height: `${barPercent(s.now)}%` }}>
        {showSliceLabel(s.now) && <span className="fp-v" aria-hidden="true">{cents0(s.now)}</span>}
        <div className="fp-extra" style={{ height: s.extra > 0 ? `${s.extra / s.now * 100}%` : 0 }}/>
      </div>)}
      {c.cap > 0 && <div className="fp-seg fp-cap" style={{ height: `${barPercent(c.cap)}%` }}/>}
    </div>
    <div className="fp-ghost" style={{ bottom: `${barPercent(100)}%` }}/>
  </div>;
}
function Cell({ base, extra, wage }: { base: number; extra: number; wage: boolean }) {
  return wage ? <><b>{cents(base)}</b>{extra > 0 && <span className="fp-to">{signed(extra)}{'¢'} more</span>}</>
    : <><b>{cents(base + extra)}</b>{extra > 0 && <span className="fp-to">was {cents(base)}</span>}</>;
}

interface Props { foodA: string; foodB: string; cost: CostId; a: Calc; b: Calc; onFood: (side: 'A' | 'B', id: string) => void }
export default function FoodStack({ foodA, foodB, cost, a, b, onFood }: Props) {
  const sides = [['A', foodA, a, 'First food'], ['B', foodB, b, 'Second food']] as const;
  return <table className="fp-stack" id="fp-stack">
    <caption>One dollar of each food, cut into slices (U.S., 2024)</caption>
    <thead><tr>
      <th scope="col"><span className="fp-sr">Slice of the dollar</span></th>
      {sides.map(([side, id, , label]) => <th key={side} scope="col"><label className="fp-pick"><span className="fp-sr">{label}</span>
        <select className="fp-select" value={id} onChange={e => onFood(side, e.target.value)}>{FOODS.map(f => <option key={f.id} value={f.id}>{shortName(f.id)}</option>)}</select></label></th>)}
    </tr></thead>
    <tbody>
      <tr className="fp-bars"><th scope="row">The dollar, drawn to scale</th>{sides.map(([side, id, c]) => <td key={side}><Bar c={c} name={shortName(id)}/></td>)}</tr>
      {LINKS.map((l, i) => <tr key={l.id} className={`fp-slice${cost === l.id ? ' fp-picked' : ''}`} data-row={l.id}>
        <th scope="row"><span className={`fp-sw fp-s-${l.id}`} aria-hidden="true"/>{l.label}</th>
        {sides.map(([side, , c]) => <td key={side}><Cell base={c.slices[i].base} extra={c.slices[i].extra} wage={false}/></td>)}
      </tr>)}
      <tr className={`fp-slice fp-wagesrow${cost === 'wages' ? ' fp-picked' : ''}`} data-row="wages">
        <th scope="row"><span className="fp-sw fp-cap-sw" aria-hidden="true"/>Wages &amp; benefits<br/><small className="fp-m">counted inside every slice</small></th>
        {sides.map(([side, , c]) => <td key={side}><Cell base={c.labor} extra={cost === 'wages' ? c.eff : 0} wage/></td>)}
      </tr>
      <tr className="fp-result"><th scope="row">Shelf price change<small className="fp-m">if all of it is passed on</small></th>{sides.map(([side, , c]) => <td key={side}><span className="fp-big" id={`fp-ch-${side}`}>{signed(c.eff)}%</span></td>)}</tr>
      <tr className="fp-result fp-price"><th scope="row">A $1.00 item then costs</th>{sides.map(([side, , c]) => <td key={side}><span className="fp-big" id={`fp-pr-${side}`}>{money(c.total)}</span></td>)}</tr>
    </tbody>
  </table>;
}
