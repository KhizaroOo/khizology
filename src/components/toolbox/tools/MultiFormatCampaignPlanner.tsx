import { useMemo, useState, type CSSProperties } from 'react';
import { campaignFormats, CAMPAIGN_FORMATS_REVIEWED, type CampaignFormat } from '../../../data/campaignFormats';
import { cropLoss, planCampaign } from './campaignPlannerModel';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import PresetBar from '../shared/PresetBar';

const orange = '#F7933C';
const box: CSSProperties = { padding: '1rem', border: '1px solid var(--k-border)', background: 'var(--k-bg-card)', borderRadius: '.8rem', minWidth: 0 };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '1rem' };
const button: CSSProperties = { padding: '.6rem .85rem', border: '1px solid var(--k-border)', borderRadius: '.5rem', background: 'var(--k-bg)', color: 'var(--k-text)', cursor: 'pointer', fontWeight: 700 };
const presets = [
  { label: 'Creator campaign', ids: ['instagram-portrait', 'story', 'youtube', 'linkedin-square', 'linkedin-portrait', 'pinterest'], tolerance: 15 },
  { label: 'Portrait launch', ids: ['instagram-portrait', 'story', 'linkedin-portrait', 'pinterest'], tolerance: 15 },
  { label: 'Web + print', ids: ['web-wide', 'youtube', 'print'], tolerance: 10 },
];
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
function ratioLabel(ratio: number) {
  for (const [w, h] of [[1, 1], [4, 5], [9, 16], [16, 9], [2, 3], [3, 1]]) {
    if (Math.abs(ratio - w / h) < 0.001) return `${w}:${h}`;
  }
  return `${ratio.toFixed(3)}:1`;
}

export default function MultiFormatCampaignPlanner() {
  const [selected, setSelected] = useState<string[]>(presets[0].ids);
  const [custom, setCustom] = useState<CampaignFormat[]>([]);
  const [tolerance, setTolerance] = useState(15);
  const [name, setName] = useState('Custom destination');
  const [width, setWidth] = useState('1600');
  const [height, setHeight] = useState('900');
  const [masterWidth, setMasterWidth] = useState('16');
  const [masterHeight, setMasterHeight] = useState('9');
  const [compareMaster, setCompareMaster] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [nextId, setNextId] = useState(1);
  const targets = useMemo(() => [...campaignFormats.filter(f => selected.includes(f.id)), ...custom], [selected, custom]);
  const groups = useMemo(() => planCampaign(targets, tolerance / 100), [targets, tolerance]);
  const rasterLimited = groups.some(group => group.rasterLimited);
  const candidateMasterRatio = Number(masterWidth) / Number(masterHeight);
  const validMaster = [masterWidth, masterHeight].every(v => v.trim() && Number.isFinite(Number(v)) && Number(v) >= 0.001 && Number(v) <= 10000) && Number.isFinite(candidateMasterRatio) && candidateMasterRatio > 0;
  const masterRatio = validMaster ? candidateMasterRatio : 1;
  const masterFailures = validMaster ? targets.filter(f => cropLoss(masterRatio, f.width / f.height) > tolerance / 100 + 1e-10).length : 0;
  const reset = () => { setSelected(presets[0].ids); setCustom([]); setTolerance(15); setName('Custom destination'); setWidth('1600'); setHeight('900'); setMasterWidth('16'); setMasterHeight('9'); setCompareMaster(false); setError(''); setCopied(''); setNextId(1); };
  const addCustom = () => {
    if (!name.trim()) { setError('Give the destination a name.'); return; }
    if (![width, height].every(v => v.trim() && Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 10000)) { setError('Use whole-pixel dimensions from 1 to 10,000.'); return; }
    if (custom.length >= 16) { setError('Use up to 16 custom destinations per plan.'); return; }
    setCustom([...custom, { id: `custom-${nextId}`, name: name.trim(), width: Number(width), height: Number(height), note: 'Custom working canvas.' }]);
    setNextId(nextId + 1); setError(''); setCopied('');
  };
  const planText = groups.map((g, i) => `Master ${i + 1}: ${ratioLabel(g.ratio)} · ${g.width} × ${g.height} px\n${g.formats.map(f => `  ${f.name}: ${f.width} × ${f.height} px, ${percent(cropLoss(g.ratio, f.width / f.height))} area cropped`).join('\n')}`).join('\n\n');
  const copyPlan = async () => {
    try { await navigator.clipboard.writeText(`Campaign production plan\n${targets.length} outputs · ${groups.length} masters · up to ${tolerance}% centered-crop area loss\n\n${planText}\n\nCheck focal points, text, interface overlays and destination requirements separately. Canvas dimensions exclude bleed.`); setCopied('Production plan copied.'); }
    catch { setCopied('Clipboard unavailable. Select and copy the production plan below.'); }
  };
  return <div style={{ display: 'grid', gap: '1.25rem', color: 'var(--k-text)' }}>
    <PresetBar presets={presets.map(p => ({ label: p.label, values: p }))} activeLabel={presets.find(p => !custom.length && tolerance === p.tolerance && p.ids.length === selected.length && p.ids.every(id => selected.includes(id)))?.label} onSelect={p => { setSelected(p.ids); setCustom([]); setTolerance(p.tolerance); setError(''); setCopied(''); }} />
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><button type="button" style={button} onClick={reset}>Reset</button><button type="button" style={button} onClick={() => { setSelected([]); setCustom([]); setCopied(''); }}>Clear destinations</button></div>
    <fieldset style={{ ...box, margin: 0 }}><legend style={{ fontWeight: 800 }}>Choose your destinations</legend><div style={grid}>
      {campaignFormats.map(f => <label key={f.id} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={selected.includes(f.id)} style={{ accentColor: orange, marginTop: '.3rem' }} onChange={e => { setSelected(e.target.checked ? [...selected, f.id] : selected.filter(id => id !== f.id)); setCopied(''); }} />
        <span><strong>{f.name}</strong><br /><small style={{ color: 'var(--k-text-muted)' }}>{f.width} × {f.height} · {ratioLabel(f.width / f.height)}</small></span>
      </label>)}
    </div></fieldset>
    <details style={box}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Add a custom destination</summary><div style={{ ...grid, marginTop: '1rem' }}>
      <InputField label="Destination name" type="text" value={name} onChange={v => setName(v.slice(0, 70))} />
      <InputField label="Width (px)" min="1" step="1" value={width} onChange={setWidth} />
      <InputField label="Height (px)" min="1" step="1" value={height} onChange={setHeight} />
    </div><button type="button" style={{ ...button, marginTop: '.75rem' }} onClick={addCustom}>Add destination</button>{error && <p role="alert">{error}</p>}</details>
    {custom.length > 0 && <ul style={{ ...box, listStyle: 'none', margin: 0 }}>{custom.map(f => <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap', padding: '.5rem 0', overflowWrap: 'anywhere' }}><span>{f.name} · {f.width} × {f.height}</span><button type="button" aria-label={`Remove ${f.name}`} style={button} onClick={() => { setCustom(custom.filter(item => item.id !== f.id)); setCopied(''); }}>Remove</button></li>)}</ul>}
    <RangeControl label="Acceptable centered-crop area loss" min={0} max={40} value={tolerance} onChange={v => { setTolerance(v); setCopied(''); }} formatValue={v => `${v}%`} />
    <p style={{ margin: 0, color: 'var(--k-text-muted)', fontSize: '.85rem' }}>This is a geometric planning limit you choose. A 15% crop can still remove a face or headline; shared proportions do not guarantee a shared composition.</p>
    {!targets.length ? <p role="status" style={box}>Choose at least one destination to see a production plan.</p> : <>
      <div style={grid}><Metric label="Requested outputs" value={String(targets.length)} /><Metric label="Suggested masters" value={String(groups.length)} color={orange} /><Metric label="Layouts potentially reused" value={String(targets.length - groups.length)} sublabel="Every output still needs a final check" /></div>
      <section aria-label="Master composition map" style={{ display: 'grid', gap: '1rem' }}>
        {groups.map((g, i) => <article key={g.formats[0].id} style={box}>
          <h3 style={{ margin: '0 0 .3rem' }}>Master {i + 1} · {ratioLabel(g.ratio)}</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '.85rem', color: 'var(--k-text-muted)' }}>{g.formats.length === 1 ? 'Separate treatment at this crop limit.' : `${g.formats.length} compatible canvases at your crop limit.`} Suggested raster canvas: {g.width.toLocaleString('en-US')} × {g.height.toLocaleString('en-US')} px.</p>
          <div style={grid}>{g.formats.map(f => {
            const r = f.width / f.height, loss = cropLoss(g.ratio, r);
            const frameW = g.ratio > r ? r / g.ratio * 100 : 100;
            const frameH = g.ratio < r ? g.ratio / r * 100 : 100;
            return <div key={f.id} style={{ minWidth: 0 }}>
              <div aria-label={`${f.name}: ${percent(loss)} of master area cropped`} role="img" style={{ height: 150, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--k-bg)', borderRadius: '.5rem', padding: '.5rem' }}>
                <div style={{ width: Math.min(180, 130 * g.ratio), height: Math.min(130, 180 / g.ratio), position: 'relative', background: '#F7933C22', border: '1px dashed var(--k-text-muted)' }}>
                  <div style={{ position: 'absolute', width: `${frameW}%`, height: `${frameH}%`, left: `${(100 - frameW) / 2}%`, top: `${(100 - frameH) / 2}%`, border: `2px solid ${orange}`, boxSizing: 'border-box', background: '#F7933C44' }} />
                </div>
              </div>
              <strong style={{ display: 'block', marginTop: '.5rem', overflowWrap: 'anywhere' }}>{f.name}</strong><small>{ratioLabel(r)} · {percent(loss)} crop pressure</small>
            </div>;
          })}</div>
          <p style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', marginBottom: 0 }}>Dashed frame: master. Orange frame: retained destination area. Maximum loss in this group: {percent(g.maxLoss)}.</p>
        </article>)}
      </section>
      <Insight what={`Design ${groups.length} master composition${groups.length === 1 ? '' : 's'} for ${targets.length} destination${targets.length === 1 ? '' : 's'}.`} why={`Destinations share a master only when every centered crop of the actual suggested pixel canvas stays within your ${tolerance}% area-loss limit. ${rasterLimited ? 'Some ideal ratios exceeded the bounded integer-canvas search, so those destinations have separate exact canvases.' : 'Reducing the limit can create more groups; increasing it trades composition safety for reuse.'}`} tip="Create the masters, place key content inside every destination frame, then make destination-specific typography and safe-area adjustments. Review each final output at its real viewing size." />
      <AdvancedDisclosure summary="Compare one existing master ratio"><div style={{ gridColumn: '1 / -1' }}><label><input type="checkbox" checked={compareMaster} onChange={e => setCompareMaster(e.target.checked)} style={{ accentColor: orange }} /> Compare a single master against every destination</label></div>
        {compareMaster && <><InputField label="Master ratio width" value={masterWidth} min="0.001" step="any" onChange={setMasterWidth} /><InputField label="Master ratio height" value={masterHeight} min="0.001" step="any" onChange={setMasterHeight} />
          <div style={{ gridColumn: '1 / -1' }}>{!validMaster ? <p role="alert">Enter ratio values from 0.001 to 10,000.</p> : <><p>{masterFailures} of {targets.length} outputs exceed your crop limit with a {ratioLabel(masterRatio)} master.</p><ul>{targets.map(f => <li key={f.id}>{f.name}: {percent(cropLoss(masterRatio, f.width / f.height))} area loss{cropLoss(masterRatio, f.width / f.height) > tolerance / 100 + 1e-10 ? ' — separate composition recommended' : ' — within chosen limit'}</li>)}</ul></>}</div>
        </>}
      </AdvancedDisclosure>
      <details style={box}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Production checklist & copyable plan</summary><ol><li>Design one master per group at the suggested ratio.</li><li>Check focal points and copy in all destination crop frames.</li><li>Adapt type size, branding, overlays, and calls to action.</li><li>Export each destination; check dimensions, file size and print bleed separately.</li></ol><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '.8rem' }}>{planText}</pre><button type="button" style={button} onClick={copyPlan}>Copy production plan</button><p role="status">{copied}</p></details>
    </>}
    <details style={box}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Assumptions & format notes</summary><p>Crop loss = 1 − min(master ratio ÷ target ratio, target ratio ÷ master ratio). Groups minimize the number of compatible ideal ratios; the suggested integer canvas is then verified against the same crop limit. A bounded raster search can separate an exceptionally precise group, which is called out in the result. Zero tolerance uses exact integer multiples of the destination ratio. Suggested canvas dimensions cover each target’s pixels after cropping; they do not assess image quality, bleed, or platform compression.</p><p>Preset notes reviewed {CAMPAIGN_FORMATS_REVIEWED}. These are planning canvases, not guaranteed upload specifications. Always confirm the final placement.</p><ul>{campaignFormats.map(f => <li key={f.id} style={{ marginBottom: '.65rem' }}><strong>{f.name}:</strong> {f.note} {f.source && <a href={f.source} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--k-text)', textDecoration: 'underline' }}>Official specifications</a>}</li>)}</ul></details>
  </div>;
}
