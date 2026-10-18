import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import './phase4b.css';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';
import { downloadCanvasPNG } from '../shared/exportHelpers';
import { safeNumber, clamp } from '../shared/mathHelpers';

const MAX_DIMENSION = 2000;
const ACCENT = '#93B96A';
const VP_HIT_RADIUS = 12;

type Mode = '1-point' | '2-point' | '3-point';
interface VP {
  x: number;
  y: number;
}
type VpEntry = VP & { moved: boolean };

const MODE_LABELS: Record<Mode, string> = { '1-point': '1-Point', '2-point': '2-Point', '3-point': '3-Point' };
const MODE_VP_COUNT: Record<Mode, number> = { '1-point': 1, '2-point': 2, '3-point': 3 };

function drawRadiatingLines(ctx: CanvasRenderingContext2D, vp: VP, count: number, width: number, height: number) {
  const reach = Math.max(width, height) * 1.5;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(vp.x, vp.y);
    ctx.lineTo(vp.x + Math.cos(angle) * reach, vp.y + Math.sin(angle) * reach);
    ctx.stroke();
  }
}

function drawVpMarker(ctx: CanvasRenderingContext2D, vp: VP) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(vp.x, vp.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The original fixed-position formulas — used to seed VPs on mode change and to reposition any VP the user hasn't dragged. */
function computeDefaultVps(mode: Mode, w: number, h: number, horizonY: number): VP[] {
  if (mode === '1-point') {
    return [{ x: w / 2, y: horizonY }];
  }
  const vp1: VP = { x: w * 0.1, y: horizonY };
  const vp2: VP = { x: w * 0.9, y: horizonY };
  if (mode === '3-point') {
    return [vp1, vp2, { x: w / 2, y: h * 1.4 }];
  }
  return [vp1, vp2];
}

/** Horizon line + radiating construction lines + VP markers — the reusable grid render, shared by the live preview and the "grid only" export. */
function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, mode: Mode, vps: VP[], lineCount: number, horizonPct: number) {
  const horizonY = h * (horizonPct / 100);

  ctx.strokeStyle = ACCENT;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 0.5);
  ctx.lineTo(w, horizonY + 0.5);
  ctx.stroke();

  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;

  if (mode === '1-point') {
    drawRadiatingLines(ctx, vps[0], lineCount, w, h);
  } else {
    const perVp = Math.max(2, Math.round(lineCount / 2));
    drawRadiatingLines(ctx, vps[0], perVp, w, h);
    drawRadiatingLines(ctx, vps[1], perVp, w, h);
    if (mode === '3-point' && vps[2]) {
      drawRadiatingLines(ctx, vps[2], perVp, w, h);
    }
  }

  ctx.globalAlpha = 1;
  vps.forEach((vp) => drawVpMarker(ctx, vp));
}

function fitToCap(width: number, height: number, cap: number): { w: number; h: number } {
  if (width <= 0 || height <= 0) return { w: cap, h: cap };
  if (width <= cap && height <= cap) return { w: Math.round(width), h: Math.round(height) };
  if (width >= height) {
    const scale = cap / width;
    return { w: cap, h: Math.max(1, Math.round(height * scale)) };
  }
  const scale = cap / height;
  return { w: Math.max(1, Math.round(width * scale)), h: cap };
}

/** Read a pointer event's position in canvas-pixel space (not CSS/display space), plus the CSS→canvas scale for hit-radius math. */
function getPointerCanvasPos(e: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): { x: number; y: number; scale: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y, scale: (scaleX + scaleY) / 2 };
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.8rem',
  fontWeight: 700,
  color: 'var(--k-text-muted)',
  marginBottom: '.375rem',
  fontFamily: "'Poppins', sans-serif",
  textTransform: 'uppercase',
  letterSpacing: '.06em',
};

const primaryButtonStyle: React.CSSProperties = {
  background: ACCENT,
  color: '#172b19',
  border: 'none',
  padding: '.6rem 1.5rem',
  borderRadius: '.5rem',
  fontWeight: 700,
  fontSize: '.875rem',
  fontFamily: "'Poppins', sans-serif",
  cursor: 'pointer',
};

export default function PerspectiveGridMaker() {
  const [width, setWidth] = useState('1200');
  const [height, setHeight] = useState('900');
  const [mode, setMode] = useState<Mode>('2-point');
  const [horizonPct, setHorizonPct] = useState(50);
  const [lineCount, setLineCount] = useState(32);
  const [vps, setVps] = useState<VpEntry[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fitted = img ? fitToCap(img.width, img.height, MAX_DIMENSION) : null;
  const w = fitted ? fitted.w : clamp(safeNumber(width, 100), 100, MAX_DIMENSION);
  const h = fitted ? fitted.h : clamp(safeNumber(height, 100), 100, MAX_DIMENSION);

  // Seed VPs from the fixed-position formulas whenever the mode changes (VP count differs) or on
  // first render; otherwise only reposition VPs the user hasn't manually dragged, so a drag survives
  // horizon/size changes until Reset.
  useEffect(() => {
    const horizonY = h * (horizonPct / 100);
    const defaults = computeDefaultVps(mode, w, h, horizonY);
    setVps((prev) => {
      if (prev.length !== defaults.length) {
        return defaults.map((vp) => ({ ...vp, moved: false }));
      }
      return prev.map((vp, i) => (vp.moved ? vp : { ...defaults[i], moved: false }));
    });
  }, [mode, w, h, horizonPct]);

  // Live redraw: image underlay (if any) first, then the grid on top. Guarded so a transitional
  // render (mode just switched, VP count not yet reseeded) never indexes into a mismatched array.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    if (img) {
      ctx.drawImage(img.image, 0, 0, w, h);
    }

    if (vps.length === MODE_VP_COUNT[mode]) {
      drawGrid(ctx, w, h, mode, vps, lineCount, horizonPct);
    }
  }, [w, h, mode, horizonPct, lineCount, vps, img]);

  const handleFile = async (file: File) => {
    try {
      const loaded = await loadImageFromFile(file);
      setImg(loaded);
      setImgError(null);
    } catch (e) {
      setImgError((e as Error).message);
    }
  };

  const clearImage = () => {
    setImg(null);
    setImgError(null);
  };

  const resetVps = () => {
    const horizonY = h * (horizonPct / 100);
    const defaults = computeDefaultVps(mode, w, h, horizonY);
    setVps(defaults.map((vp) => ({ ...vp, moved: false })));
    setDraggingIndex(null);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPointerCanvasPos(e, canvas);
    if (!pos) return;
    const hitRadius = VP_HIT_RADIUS * Math.max(pos.scale, 0.01);
    let bestIndex = -1;
    let bestDist = Infinity;
    vps.forEach((vp, i) => {
      const dist = Math.hypot(vp.x - pos.x, vp.y - pos.y);
      if (dist <= hitRadius && dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    });
    if (bestIndex === -1) return;
    canvas.setPointerCapture(e.pointerId);
    setDraggingIndex(bestIndex);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPointerCanvasPos(e, canvas);
    if (!pos) return;
    // Allow dragging well off-canvas (a real off-frame VP is normal in wide-angle perspective)
    // but bound it so a stray event can never push a coordinate toward Infinity/NaN territory.
    const clampedX = clamp(pos.x, -w, w * 2);
    const clampedY = clamp(pos.y, -h, h * 2);
    const index = draggingIndex;
    setVps((prev) => prev.map((vp, i) => (i === index ? { x: clampedX, y: clampedY, moved: true } : vp)));
  };

  const endDrag = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setDraggingIndex(null);
  };

  const downloadBlank = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasPNG(canvas, `perspective-grid-${mode}`);
  };

  const downloadComposite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasPNG(canvas, `perspective-grid-${mode}-with-image`);
  };

  const downloadGridOnly = () => {
    if (vps.length !== MODE_VP_COUNT[mode]) return;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    drawGrid(ctx, w, h, mode, vps, lineCount, horizonPct);
    downloadCanvasPNG(off, `perspective-grid-${mode}`);
  };

  const hasManualVp = vps.some((vp) => vp.moved);

  function positionVp(index: number, axis: 'x' | 'y', percent: number) {
    const size = axis === 'x' ? w : h;
    setVps(current => current.map((vp, i) => i === index ? { ...vp, [axis]: clamp(percent / 100 * size, -size, size * 2), moved: true } : vp));
  }
  const modeLesson = mode === '1-point' ? 'One point: edges recede toward one place, like looking down a hallway.' : mode === '2-point' ? 'Two points: each side of a corner recedes toward its own point.' : 'Three points: vertical edges also converge, as when looking up or down a tall building.';
  return (
    <div className="perspective-grid" style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: 'clamp(.875rem, 3vw, 1.5rem)' }}>
      <p className="tool-purpose">Choose a perspective, then use the grid to guide the edges in your drawing.</p>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.375rem' }}>
          <span id="perspective-mode-label" style={{ ...labelStyle, marginBottom: 0 }}>Perspective mode</span>
          {hasManualVp && <button
            onClick={resetVps}
            disabled={!hasManualVp}
            title={hasManualVp ? 'Recompute all vanishing points from the mode + horizon' : 'Move a point by dragging or using its position controls to enable'}
            style={{
              background: 'transparent',
              color: hasManualVp ? 'var(--k-text)' : 'var(--k-text-muted)',
              border: '1px solid var(--k-border)',
              padding: '.35rem .75rem',
              borderRadius: '.5rem',
              fontSize: '.7rem',
              fontWeight: 700,
              cursor: hasManualVp ? 'pointer' : 'default',
              opacity: hasManualVp ? 1 : 0.5,
              fontFamily: "'Poppins', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            Reset vanishing points
          </button>}
        </div>
        <div className="perspective-modes" role="group" aria-labelledby="perspective-mode-label">
          {(['1-point', '2-point', '3-point'] as Mode[]).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setDraggingIndex(null);
              }}
              style={{
                background: mode === m ? ACCENT : 'transparent',
                color: mode === m ? '#172b19' : 'var(--k-text-muted)',
                border: '1px solid ' + (mode === m ? ACCENT : 'var(--k-border)'),
                padding: '.5rem 1rem',
                borderRadius: '.5rem',
                fontSize: '.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <p className="tool-note">{modeLesson} A vanishing point is where parallel edges appear to meet.</p>
      <RangeControl label="Horizon position (eye level)" value={horizonPct} onChange={setHorizonPct} min={10} max={90} formatValue={v => `${v}%`} accent={ACCENT}/>

      <VisualizationContainer minHeight={180}>
        <div
          style={{
            width: '100%',
            background: img ? 'var(--k-bg)' : '#fff',
            borderRadius: '.5rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${MODE_LABELS[mode]} perspective grid with the horizon at ${horizonPct}% of canvas height${img ? ', drawn over your uploaded image' : ''}. Move points by dragging their dots or using the labeled position controls below.`}
            aria-describedby="perspective-coordinates"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              width: '100%',
              maxWidth: '480px',
              height: 'auto',
              display: 'block',
              touchAction: 'none',
              cursor: draggingIndex !== null ? 'grabbing' : 'grab',
            }}
          />
        </div>
      </VisualizationContainer>

      <p id="perspective-coordinates" className="tool-note">{vps.map((vp, i) => `Point ${i + 1}: horizontal ${Math.round(vp.x / w * 1000) / 10}%, vertical ${Math.round(vp.y / h * 1000) / 10}%`).join(' · ')}. Positions are measured from the top-left; values outside 0–100% are off the canvas.</p>
      <Insight what={`${MODE_LABELS[mode]} grid · ${MODE_VP_COUNT[mode]} vanishing point${mode === '1-point' ? '' : 's'}`} why={modeLesson} tip="Align your drawing edges with the rays from the matching point. Drag a dot or open Move vanishing points to reposition it; download the PNG as a drawing guide."/>
      <AdvancedDisclosure summary="Move vanishing points (keyboard or pointer)">
        {vps.map((vp, index) => <fieldset key={index} className="vp-position"><legend>Point {index + 1}</legend>{(['x', 'y'] as const).map(axis => <RangeControl key={axis} label={`Point ${index + 1} ${axis === 'x' ? 'horizontal' : 'vertical'}`} value={Math.round(vp[axis] / (axis === 'x' ? w : h) * 1000) / 10} onChange={value => positionVp(index, axis, value)} min={-100} max={200} step={.1} formatValue={value => `${value}%`} accent={ACCENT}/>)}</fieldset>)}
      </AdvancedDisclosure>
      <AdvancedDisclosure summary="Advanced: image, canvas size and line density">
      <div style={{ marginBottom: '1.25rem' }}>
        <label htmlFor="perspective-reference" style={labelStyle}>Reference image (optional)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <input
            id="perspective-reference"
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            style={{ width: '100%', minWidth: 0, fontSize: '.85rem', color: 'var(--k-text)', fontFamily: "'Mulish', sans-serif" }}
          />
          {img && (
            <button
              onClick={clearImage}
              style={{
                background: 'transparent',
                color: 'var(--k-text-muted)',
                border: '1px solid var(--k-border)',
                padding: '.4rem .9rem',
                borderRadius: '.5rem',
                fontSize: '.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Remove image
            </button>
          )}
        </div>
        <p style={{ fontSize: '.75rem', color: 'var(--k-text-muted)', marginTop: '.5rem', marginBottom: 0, lineHeight: 1.5, fontFamily: "'Mulish', sans-serif" }}>
          {img
            ? `Canvas sized to match "${img.fileName}" (fit within ${MAX_DIMENSION}px). Processed entirely on your device — nothing is ever uploaded.`
            : 'Trace the grid over a photo or sketch, or leave this blank for a plain grid. Processed entirely on your device — nothing is ever uploaded.'}
        </p>
        {imgError && (
          <div style={{ marginTop: '.75rem' }}>
            <Warning level="danger" title="Couldn't read this file">{imgError}</Warning>
          </div>
        )}
      </div>

      {!img && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <InputField label="Canvas width" value={width} onChange={setWidth} min="100" suffix="px" />
          <InputField label="Canvas height" value={height} onChange={setHeight} min="100" suffix="px" />
        </div>
      )}

        <RangeControl label="Line density" value={lineCount} onChange={setLineCount} min={8} max={40} accent={ACCENT}/>
      </AdvancedDisclosure>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Mode" value={MODE_LABELS[mode]} />
        <Metric label="Vanishing points" value={String(MODE_VP_COUNT[mode])} />
        <Metric label="Output size" value={`${w} × ${h}`} sublabel="pixels" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {mode === '3-point' && vps[2]?.y > h ? (
          <Warning level="info" title="The third VP sits below the frame on purpose">
            The third point is outside the canvas, so you see the lines heading toward it rather than its dot.
            Use Point 3's vertical position control to move it, including back inside the frame.
          </Warning>
        ) : (
          <Warning level="info" title="Trace, don't calculate">
            Every marked dot is a real vanishing point — line up any edge in your drawing with the rays radiating
            from one of them and it'll read as correct perspective, no math required.
          </Warning>
        )}
      </div>

      {img ? (
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
          <button onClick={downloadGridOnly} style={primaryButtonStyle}>
            Download grid only
          </button>
          <button onClick={downloadComposite} style={primaryButtonStyle}>
            Download image + grid
          </button>
        </div>
      ) : (
        <button onClick={downloadBlank} style={{ ...primaryButtonStyle, marginTop: '1.25rem' }}>
          Download perspective grid PNG
        </button>
      )}
    </div>
  );
}
