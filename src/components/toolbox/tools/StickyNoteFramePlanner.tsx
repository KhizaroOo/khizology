import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';

export default function StickyNoteFramePlanner() {
  const [noteW, setNoteW] = useState('3');
  const [noteH, setNoteH] = useState('3');
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(3);
  const [gap, setGap] = useState('0.5');
  const [margin, setMargin] = useState('1');

  const nw = parseFloat(noteW) || 0;
  const nh = parseFloat(noteH) || 0;
  const g = parseFloat(gap) || 0;
  const m = parseFloat(margin) || 0;

  const frameW = cols * nw + (cols - 1) * g + 2 * m;
  const frameH = rows * nh + (rows - 1) * g + 2 * m;
  const totalNotes = cols * rows;

  const layout = useMemo(() => {
    const scale = 340 / Math.max(frameW, 1);
    return { scale, svgW: frameW * scale, svgH: frameH * scale };
  }, [frameW, frameH]);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <InputField label="Note width" value={noteW} onChange={setNoteW} step="0.25" min="0.5" suffix="in" />
        <InputField label="Note height" value={noteH} onChange={setNoteH} step="0.25" min="0.5" suffix="in" />
        <InputField label="Gap between notes" value={gap} onChange={setGap} step="0.125" min="0" suffix="in" />
        <InputField label="Frame margin" value={margin} onChange={setMargin} step="0.25" min="0" suffix="in" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Columns" value={cols} onChange={setCols} min={1} max={12} accent="#6CA6FF" />
        <RangeControl label="Rows" value={rows} onChange={setRows} min={1} max={12} accent="#6CA6FF" />
      </div>

      <VisualizationContainer minHeight={280}>
        <svg
          viewBox={`0 0 ${layout.svgW} ${layout.svgH}`}
          style={{ width: '100%', maxWidth: `${layout.svgW}px`, height: 'auto', background: 'var(--k-bg-card)' }}
          role="img"
          aria-label={`Layout preview: ${cols} by ${rows} grid of sticky notes inside a frame`}
        >
          <rect x={0} y={0} width={layout.svgW} height={layout.svgH} fill="none" stroke="var(--k-border)" strokeDasharray="6 4" strokeWidth={2} />
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const x = (m + c * (nw + g)) * layout.scale;
              const y = (m + r * (nh + g)) * layout.scale;
              const w = nw * layout.scale;
              const h = nh * layout.scale;
              return <rect key={`${r}-${c}`} x={x} y={y} width={w} height={h} rx={2} fill="#F5CF5C" stroke="#e0b93a" strokeWidth={1} />;
            })
          )}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Frame size needed" value={`${frameW.toFixed(2)}" × ${frameH.toFixed(2)}"`} color="#6CA6FF" />
        <Metric label="Total notes" value={String(totalNotes)} />
        <Metric label="Coverage area" value={`${(nw * nh * totalNotes).toFixed(1)} in²`} sublabel={`of ${(frameW * frameH).toFixed(1)} in² frame`} />
      </div>
    </div>
  );
}
