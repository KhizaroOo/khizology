import { useMemo, useRef, useState } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';
import Warning from '../shared/Warning';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import { downloadSVG } from '../shared/exportHelpers';
import { safeNumber, safeDiv, clamp } from '../shared/mathHelpers';

type Mode = 'plan' | 'have';

interface NoteSize {
  w: string;
  h: string;
}

const NOTE_PRESETS: { label: string; values: NoteSize }[] = [
  { label: '3" × 3"', values: { w: '3', h: '3' } },
  { label: '2" × 2"', values: { w: '2', h: '2' } },
  { label: '4" × 6"', values: { w: '4', h: '6' } },
];

/** Max whole notes (of `size`, with `gapVal` between them) that fit in `avail` linear space. */
function fitCount(avail: number, size: number, gapVal: number): number {
  if (size <= 0) return 0;
  const raw = safeDiv(avail + gapVal, size + gapVal, 0);
  return Math.max(0, Math.floor(raw));
}

export default function StickyNoteFramePlanner() {
  const [mode, setMode] = useState<Mode>('plan');

  const [noteW, setNoteW] = useState('3');
  const [noteH, setNoteH] = useState('3');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(3);
  const [gap, setGap] = useState('0.5');
  const [margin, setMargin] = useState('1');

  const [frameWIn, setFrameWIn] = useState('24');
  const [frameHIn, setFrameHIn] = useState('18');

  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleNoteWChange = (v: string) => {
    setNoteW(v);
    setActivePreset(null);
  };
  const handleNoteHChange = (v: string) => {
    setNoteH(v);
    setActivePreset(null);
  };

  const nw = safeNumber(noteW, 0);
  const nh = safeNumber(noteH, 0);
  const g = safeNumber(gap, 0);
  const m = safeNumber(margin, 0);

  // "I'm planning a frame" -- cols x rows drive the frame size (existing behavior, unchanged).
  const planFrameW = cols * nw + (cols - 1) * g + 2 * m;
  const planFrameH = rows * nh + (rows - 1) * g + 2 * m;
  const planTotalNotes = cols * rows;

  // "I have a frame" -- a given frame size drives the max cols x rows that fit.
  const haveFrameW = safeNumber(frameWIn, 0);
  const haveFrameH = safeNumber(frameHIn, 0);
  const haveAvailW = haveFrameW - 2 * m;
  const haveAvailH = haveFrameH - 2 * m;
  const haveCols = fitCount(haveAvailW, nw, g);
  const haveRows = fitCount(haveAvailH, nh, g);
  const haveTotalNotes = haveCols * haveRows;
  const haveFits = haveFrameW > 0 && haveFrameH > 0 && haveCols >= 1 && haveRows >= 1;

  const activeFrameW = mode === 'have' ? haveFrameW : planFrameW;
  const activeFrameH = mode === 'have' ? haveFrameH : planFrameH;
  const activeCols = mode === 'have' ? haveCols : cols;
  const activeRows = mode === 'have' ? haveRows : rows;
  const canRender = mode === 'plan' || haveFits;

  const layout = useMemo(() => {
    const vFrameW = clamp(activeFrameW, 0, 1e6);
    const vFrameH = clamp(activeFrameH, 0, 1e6);
    const scale = safeDiv(340, Math.max(vFrameW, 1), 340);
    return { vFrameW, vFrameH, scale, svgW: vFrameW * scale, svgH: vFrameH * scale };
  }, [activeFrameW, activeFrameH]);

  const rNw = clamp(nw, 0, 1e6);
  const rNh = clamp(nh, 0, 1e6);
  const rG = clamp(g, 0, 1e6);
  const rM = clamp(m, 0, 1e6);

  const haveFrameArea = haveFrameW * haveFrameH;
  const haveCoverageArea = nw * nh * haveTotalNotes;
  const haveLeftover = Math.max(0, haveFrameArea - haveCoverageArea);
  const haveLeftoverPct = clamp(safeDiv(haveLeftover, haveFrameArea, 0) * 100, 0, 100);

  const haveTip = useMemo(() => {
    if (!haveFits) return undefined;
    const extraForCol = (haveCols + 1) * nw + haveCols * g + 2 * m - haveFrameW;
    const extraForRow = (haveRows + 1) * nh + haveRows * g + 2 * m - haveFrameH;
    const candidates: { dim: 'width' | 'height'; extra: number; newCols: number; newRows: number }[] = [];
    if (Number.isFinite(extraForCol) && extraForCol > 0) {
      candidates.push({ dim: 'width', extra: extraForCol, newCols: haveCols + 1, newRows: haveRows });
    }
    if (Number.isFinite(extraForRow) && extraForRow > 0) {
      candidates.push({ dim: 'height', extra: extraForRow, newCols: haveCols, newRows: haveRows + 1 });
    }
    candidates.sort((a, b) => a.extra - b.extra);
    const best = candidates[0];
    if (!best) return undefined;
    return `Add about ${best.extra.toFixed(2)}" of frame ${best.dim} to fit one more ${best.dim === 'width' ? 'column' : 'row'} (${best.newCols} × ${best.newRows} = ${best.newCols * best.newRows} notes).`;
  }, [haveFits, haveCols, haveRows, nw, nh, g, m, haveFrameW, haveFrameH]);

  const handleExport = () => {
    if (svgRef.current) downloadSVG(svgRef.current, 'sticky-note-layout.svg');
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.5rem' }}>
        {([
          { v: 'plan' as Mode, l: "I'm planning a frame" },
          { v: 'have' as Mode, l: 'I have a frame' },
        ]).map(({ v, l }) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            style={{
              flex: '1 1 200px',
              background: mode === v ? '#6CA6FF' : 'transparent',
              color: mode === v ? '#fff' : 'var(--k-text-muted)',
              border: '1.5px solid ' + (mode === v ? '#6CA6FF' : 'var(--k-border)'),
              padding: '.65rem 1rem',
              borderRadius: '.625rem',
              fontSize: '.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <PresetBar
        presets={NOTE_PRESETS}
        activeLabel={activePreset}
        onSelect={(values, label) => {
          setNoteW(values.w);
          setNoteH(values.h);
          setActivePreset(label);
        }}
        accent="#6CA6FF"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <InputField label="Note width" value={noteW} onChange={handleNoteWChange} step="0.25" min="0.5" suffix="in" />
        <InputField label="Note height" value={noteH} onChange={handleNoteHChange} step="0.25" min="0.5" suffix="in" />
        <InputField label="Gap between notes" value={gap} onChange={setGap} step="0.125" min="0" suffix="in" />
        <InputField label="Frame margin" value={margin} onChange={setMargin} step="0.25" min="0" suffix="in" />
      </div>

      {mode === 'plan' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <RangeControl label="Columns" value={cols} onChange={setCols} min={1} max={12} accent="#6CA6FF" />
          <RangeControl label="Rows" value={rows} onChange={setRows} min={1} max={12} accent="#6CA6FF" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <InputField label="Frame width" value={frameWIn} onChange={setFrameWIn} step="0.5" min="0" suffix="in" />
          <InputField label="Frame height" value={frameHIn} onChange={setFrameHIn} step="0.5" min="0" suffix="in" />
        </div>
      )}

      {!canRender ? (
        <Warning level="warn" title="No notes fit at this frame size">
          The frame is too small for even one note once the margin is accounted for. Try a smaller note size, a smaller gap or margin, or a bigger frame.
        </Warning>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.5rem' }}>
            <button
              type="button"
              onClick={handleExport}
              style={{
                background: 'transparent',
                color: 'var(--k-text-muted)',
                border: '1.5px solid var(--k-border)',
                padding: '.4rem .875rem',
                borderRadius: '.5rem',
                fontSize: '.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}
            >
              ⬇ Export SVG
            </button>
          </div>

          <VisualizationContainer minHeight={280}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${layout.svgW} ${layout.svgH}`}
              style={{ width: '100%', maxWidth: `${layout.svgW}px`, height: 'auto', background: 'var(--k-bg-card)' }}
              role="img"
              aria-label={`Layout preview: ${activeCols} by ${activeRows} grid of sticky notes inside a frame`}
            >
              <rect x={0} y={0} width={layout.svgW} height={layout.svgH} fill="none" stroke="var(--k-border)" strokeDasharray="6 4" strokeWidth={2} />
              {Array.from({ length: activeRows }).map((_, r) =>
                Array.from({ length: activeCols }).map((_, c) => {
                  const x = (rM + c * (rNw + rG)) * layout.scale;
                  const y = (rM + r * (rNh + rG)) * layout.scale;
                  const w = rNw * layout.scale;
                  const h = rNh * layout.scale;
                  return <rect key={`${r}-${c}`} x={x} y={y} width={w} height={h} rx={2} fill="#F5CF5C" stroke="#e0b93a" strokeWidth={1} />;
                })
              )}
            </svg>
          </VisualizationContainer>

          {mode === 'plan' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
              <Metric label="Frame size needed" value={`${planFrameW.toFixed(2)}" × ${planFrameH.toFixed(2)}"`} color="#6CA6FF" />
              <Metric label="Total notes" value={String(planTotalNotes)} />
              <Metric label="Coverage area" value={`${(nw * nh * planTotalNotes).toFixed(1)} in²`} sublabel={`of ${(planFrameW * planFrameH).toFixed(1)} in² frame`} />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
                <Metric label="Frame size" value={`${haveFrameW.toFixed(2)}" × ${haveFrameH.toFixed(2)}"`} color="#6CA6FF" />
                <Metric label="Notes that fit" value={String(haveTotalNotes)} sublabel={`${haveCols} × ${haveRows} grid`} />
                <Metric label="Coverage area" value={`${haveCoverageArea.toFixed(1)} in²`} sublabel={`of ${haveFrameArea.toFixed(1)} in² frame`} />
                <Metric label="Unused space" value={`${haveLeftover.toFixed(1)} in²`} sublabel={`${haveLeftoverPct.toFixed(0)}% of frame`} color="#F7933C" />
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <Insight
                  what={`Your frame fits ${haveTotalNotes} notes in a ${haveCols} × ${haveRows} grid.`}
                  why={`Fit accounts for the ${g.toFixed(2)}" gap between notes and the ${m.toFixed(2)}" margin around the frame edge, so the grid never crowds the border.`}
                  tip={haveTip}
                />
              </div>
            </>
          )}
        </>
      )}

      <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', lineHeight: 1.5, marginTop: '1.25rem' }}>
        This is a planning aid, not an exact optimizer -- real-world fit can vary slightly with wall texture, note adhesive, or how precisely the grid is aligned.
      </div>
    </div>
  );
}
