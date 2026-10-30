/* The visible truth boundary: what is measured, what the model assumes, what is simulated, and what it leaves out.
   Numbered notes point at the world's registry sources, so the list below cannot drift from them. */
import type { ReactNode } from 'react';

const note = (n: number) => <sup><a href={`#ch-s${n}`} aria-label={`Source ${n}`}>{n}</a></sup>;
interface Props { sources: readonly { label: string; url: string }[]; params: string[][]; lastReviewed?: string }

export default function HeatTruth({ sources, params, lastReviewed }: Props) {
  const facts: ReactNode[] = [
    <>Roofs and paving can be far hotter than the air: conventional roofing up to 66 °F (about 37 °C) warmer on a warm day. These <em>surface</em> heat islands are strongest by day. {note(1)}</>,
    <>Within one city, neighbourhoods differ a lot: up to 16 °F (about 9 °C) on a July 2017 afternoon in Richmond, Virginia (87 °F vs 103 °F). {note(2)} In a 2023 Kansas City-area mapping, the biggest gap (11.7 °F, about 6.5 °C) came in the evening. {note(3)}</>,
    <>Much of the night-time heat island is thermal inertia: heat trapped in urban surfaces by day is released at night. {note(4)} Walled-in streets see less sky and lose heat slowly, most noticeably in the first hours after sunset. {note(5)}</>,
    <>Tree shade cut asphalt surface temperatures by 13.8–22.8 °C in one Florence study. {note(6)} Boston data show about 0.07 °C of afternoon <em>air</em> cooling per extra 10 % canopy. {note(7)}</>,
    <>Clear, calm weather makes heat islands stronger; wind and cloud weaken them. {note(1)}</>,
    <>Hot nights matter: across 178 locations, extreme night-time heat was linked to about 2.6 % higher daily mortality risk, on top of that day’s maximum temperature. A population-level link, not a personal risk estimate. {note(8)}</>,
  ];
  const model: ReactNode[] = [
    <>Each block has three places heat can sit: the <b>surface skin</b> (changes in minutes), the <b>thermal mass</b> of walls, roofs and ground (changes over hours and days), and the <b>street air</b>.</>,
    'Sunlight is reflected, shaded, or absorbed. Plants spend some of it evaporating water. The rest warms the surface, which passes heat to the air, to the sky, and into the mass. After dark the flow reverses.',
    'Air mixes deeply with the surrounding region by day and only weakly at night, so heat released at night stays near the street.',
    <>A third run, <b>open countryside</b>, uses the same physics on open ground. It is the yardstick for the “heat island”.</>,
    'Values are illustrative and chosen so the results fall inside published ranges. They describe no real city.',
  ];
  const simulation = [
    'A deterministic day: sunrise 6:00 AM, sunset 7:30 PM. Day 1 is the first hot day after cooler weather, so both blocks start the morning at the air temperature (24 °C). The regional air behind the weather warms to 35 °C by mid-afternoon.',
    'Every number you see is generated in your browser by the model. None is a forecast or a reading from a real street.',
    'The model runs in your browser. No account, no upload, nothing stored. If you accepted the site’s analytics, anonymous counts of which controls were used are recorded; nothing else leaves this page.',
  ];
  const limits: ReactNode[] = [
    <><b>Temperature only.</b> No humidity or heat index, and nothing about how hot a person feels or any health risk. This is not medical advice.</>,
    <><b>No waste heat.</b> Air conditioners, vehicles and industry add to real city heat. They are not modelled.</>,
    <><b>Each block is on its own.</b> In a real city, air drifts between blocks, so one block’s trees or roofs cool the district’s air less than shown.</>,
    <><b>Plants are well watered.</b> Dry or stressed plants evaporate less.</>,
    '“Surface” is a block average of roofs, walls and paving. Real surfaces range far more widely.',
    'Real cities differ: coastal, desert and humid places behave differently.',
  ];
  return <section className="ch-block" aria-labelledby="ch-truth-title">
    <h2 id="ch-truth-title">What’s real, what’s modelled, what’s simulated</h2>
    <p className="ch-lead">Every claim here is one of three things. Sources are listed below.</p>
    <div className="ch-truth">
      <div className="ch-card"><span className="ch-pill">FACT</span><ul>{facts.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      <div className="ch-card"><span className="ch-pill">MODEL</span><ul>{model.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <div className="ch-tablewrap" tabIndex={0} role="region" aria-label="Block settings used by the model, scrollable">
          <table className="ch-params"><thead><tr><th scope="col">Setting</th><th scope="col">A</th><th scope="col">B</th><th scope="col">Country</th></tr></thead>
            <tbody>{params.map(r => <tr key={r[0]}><th scope="row">{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody></table>
        </div>
      </div>
      <div className="ch-card"><span className="ch-pill">SIMULATION</span><ul>{simulation.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    </div>
    <div className="ch-card ch-wide"><h3>Limits</h3><ul>{limits.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    <div className="ch-card ch-wide" id="ch-sources"><h3>Sources</h3>
      <ol>{sources.map((s, i) => <li key={s.url} id={`ch-s${i + 1}`}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ol>
      {lastReviewed && <p className="ch-meta">Last reviewed {lastReviewed}. The physics is stable; links are worth re-checking once a year.</p>}
    </div>
  </section>;
}
