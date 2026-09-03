import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';
import { downloadCanvasPNG } from '../shared/exportHelpers';
import { clamp } from '../shared/mathHelpers';

const MAX_DIMENSION = 4000;

type FocusMode = 'off' | 'cell' | 'row' | 'column';
interface SelectedCell {
  col: number;
  row: number;
}

const LABEL_STYLE: CSSProperties = {
  display: 'block',
  fontSize: '.8rem',
  fontWeight: 700,
  color: 'var(--k-text-muted)',
  marginBottom: '.375rem',
  fontFamily: "'Poppins', sans-serif",
  textTransform: 'uppercase',
  letterSpacing: '.06em',
};

const CHECKBOX_ROW_LABEL: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '.5rem',
  fontSize: '.9rem',
  color: 'var(--k-text)',
  cursor: 'pointer',
  userSelect: 'none',
};

const CHECKBOX_STYLE: CSSProperties = { width: '16px', height: '16px', accentColor: '#93B96A', cursor: 'pointer' };

/** Scale width/height down (preserving aspect) so the longer edge never exceeds max. */
function fitToMax(width: number, height: number, max: number): { w: number; h: number } {
  if (width <= max && height <= max) return { w: Math.round(width), h: Math.round(height) };
  if (width >= height) {
    const scale = max / width;
    return { w: max, h: Math.round(height * scale) };
  }
  const scale = max / height;
  return { w: Math.round(width * scale), h: max };
}

/** Desaturate (luminance) and/or adjust contrast on whatever is currently drawn to the canvas. */
function applyImageAdjustments(ctx: CanvasRenderingContext2D, w: number, h: number, grayscale: boolean, contrast: number) {
  if (!grayscale && contrast === 0) return;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i];
    let g = px[i + 1];
    let b = px[i + 2];
    if (grayscale) {
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      r = luminance;
      g = luminance;
      b = luminance;
    }
    if (contrast !== 0) {
      r = clamp(factor * (r - 128) + 128, 0, 255);
      g = clamp(factor * (g - 128) + 128, 0, 255);
      b = clamp(factor * (b - 128) + 128, 0, 255);
    }
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    // alpha (px[i + 3]) left unchanged
  }
  ctx.putImageData(data, 0, 0);
}

/** Dim every grid cell outside the focused cell/row/column — drawn last, on top of image + grid. */
function drawFocusOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cellSize: number,
  cols: number,
  rows: number,
  focusMode: FocusMode,
  selected: SelectedCell | null
) {
  if (focusMode === 'off' || !selected) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inFocus =
        focusMode === 'cell' ? c === selected.col && r === selected.row : focusMode === 'row' ? r === selected.row : c === selected.col;
      if (inFocus) continue;
      const x = c * cellSize;
      const y = r * cellSize;
      const cw = Math.min(cellSize, w - x);
      const ch = Math.min(cellSize, h - y);
      if (cw <= 0 || ch <= 0) continue;
      ctx.fillRect(x, y, cw, ch);
    }
  }
}

export default function DrawingGridMaker() {
  const [width, setWidth] = useState('1200');
  const [height, setHeight] = useState('900');
  const [cellSize, setCellSize] = useState(60);
  const [lineColor, setLineColor] = useState('#F7933C');
  const [opacity, setOpacity] = useState(60);

  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grayscale, setGrayscale] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [contrast, setContrast] = useState(0);
  const [focusMode, setFocusMode] = useState<FocusMode>('off');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = async (file: File) => {
    try {
      const loaded = await loadImageFromFile(file);
      setImg(loaded);
      setError(null);
      // A new image can have a different grid shape — last selection no longer means the same spot.
      setSelectedCell(null);
      setFocusMode('off');
    } catch (e) {
      setError((e as Error).message);
      setImg(null);
    }
  };

  const removeImage = () => {
    setImg(null);
    setError(null);
    setGrayscale(false);
    setMirror(false);
    setContrast(0);
    setFocusMode('off');
    setSelectedCell(null);
  };

  const blankW = clamp(parseInt(width, 10) || 0, 100, MAX_DIMENSION);
  const blankH = clamp(parseInt(height, 10) || 0, 100, MAX_DIMENSION);
  const { w, h } = img ? fitToMax(img.width, img.height, MAX_DIMENSION) : { w: blankW, h: blankH };
  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    if (img) {
      ctx.save();
      if (mirror) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img.image, 0, 0, w, h);
      ctx.restore();
      applyImageAdjustments(ctx, w, h, grayscale, contrast);
    }

    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = opacity / 100;
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (img) {
      drawFocusOverlay(ctx, w, h, cellSize, cols, rows, focusMode, selectedCell);
    }
  }, [img, w, h, cellSize, lineColor, opacity, grayscale, mirror, contrast, focusMode, selectedCell]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const filename = img ? `drawing-grid-reference-${w}x${h}-${cellSize}px` : `drawing-grid-${w}x${h}-${cellSize}px`;
    downloadCanvasPNG(canvas, filename);
  };

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!img) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = clamp(Math.floor(x / cellSize), 0, cols - 1);
    const row = clamp(Math.floor(y / cellSize), 0, rows - 1);
    setSelectedCell({ col, row });
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={LABEL_STYLE}>Reference image (optional)</label>
        <p style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', marginTop: 0, marginBottom: '.5rem', lineHeight: 1.5 }}>
          Upload a photo to grid it directly for copying — or leave this empty for a blank proportion grid.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            style={{ fontSize: '.85rem', color: 'var(--k-text)' }}
          />
          {img && (
            <button
              type="button"
              onClick={removeImage}
              style={{
                background: 'transparent',
                color: 'var(--k-text-muted)',
                border: '1.5px solid var(--k-border)',
                padding: '.4rem .875rem',
                borderRadius: '.5rem',
                fontSize: '.78rem',
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                cursor: 'pointer',
              }}
            >
              Remove image
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Warning level="danger" title="Couldn't read this file">
            {error}
          </Warning>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {!img && (
          <>
            <InputField label="Canvas width" value={width} onChange={setWidth} min="100" suffix="px" />
            <InputField label="Canvas height" value={height} onChange={setHeight} min="100" suffix="px" />
          </>
        )}
        <div>
          <label style={LABEL_STYLE}>Line color</label>
          <input
            type="color"
            value={lineColor}
            onChange={(e) => setLineColor(e.target.value)}
            style={{ width: '100%', height: '38px', borderRadius: '.5rem', border: '1.5px solid var(--k-border)', cursor: 'pointer', padding: '.15rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Cell size" value={cellSize} onChange={setCellSize} min={10} max={300} step={5} formatValue={(v) => `${v} px`} accent="#93B96A" />
        <RangeControl label="Line opacity" value={opacity} onChange={setOpacity} min={5} max={100} step={5} formatValue={(v) => `${v}%`} accent="#93B96A" />
      </div>

      {img && (
        <AdvancedDisclosure summary="Reference image options">
          <div>
            <label style={CHECKBOX_ROW_LABEL}>
              <input type="checkbox" checked={grayscale} onChange={() => setGrayscale((g) => !g)} style={CHECKBOX_STYLE} />
              Grayscale
            </label>
          </div>
          <div>
            <label style={CHECKBOX_ROW_LABEL}>
              <input type="checkbox" checked={mirror} onChange={() => setMirror((m) => !m)} style={CHECKBOX_STYLE} />
              Mirror horizontally
            </label>
          </div>
          <RangeControl
            label="Contrast"
            value={contrast}
            onChange={setContrast}
            min={-50}
            max={50}
            step={1}
            formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
            accent="#93B96A"
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL_STYLE}>Focus (progressive reference)</label>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.375rem' }}>
              {(['cell', 'row', 'column'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFocusMode(mode)}
                  style={{
                    background: focusMode === mode ? '#93B96A' : 'transparent',
                    color: focusMode === mode ? '#fff' : 'var(--k-text-muted)',
                    border: `1.5px solid ${focusMode === mode ? '#93B96A' : 'var(--k-border)'}`,
                    padding: '.4rem .875rem',
                    borderRadius: '.5rem',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    fontFamily: "'Poppins', sans-serif",
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFocusMode('off');
                  setSelectedCell(null);
                }}
                style={{
                  background: 'transparent',
                  color: 'var(--k-text-muted)',
                  border: '1.5px solid var(--k-border)',
                  padding: '.4rem .875rem',
                  borderRadius: '.5rem',
                  fontSize: '.78rem',
                  fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif",
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
            {focusMode !== 'off' && (
              <div style={{ fontSize: '.78rem', color: 'var(--k-text-muted)', marginTop: '.5rem' }}>
                {selectedCell
                  ? `Focused on ${
                      focusMode === 'cell'
                        ? `cell (col ${selectedCell.col + 1}, row ${selectedCell.row + 1})`
                        : focusMode === 'row'
                        ? `row ${selectedCell.row + 1}`
                        : `column ${selectedCell.col + 1}`
                    }. Click another cell on the grid below to move it.`
                  : 'Click a cell on the grid below to focus it.'}
              </div>
            )}
          </div>
        </AdvancedDisclosure>
      )}

      <VisualizationContainer minHeight={280}>
        <div
          style={{
            width: '100%',
            backgroundImage:
              'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            borderRadius: '.5rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ width: '100%', maxWidth: '480px', height: 'auto', display: 'block', cursor: img ? 'crosshair' : 'default' }}
          />
        </div>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Grid" value={`${cols} × ${rows}`} sublabel="cells" />
        <Metric label="Output size" value={`${w} × ${h}`} sublabel="pixels" />
        {img && <Metric label="Source image" value={`${img.width} × ${img.height}`} sublabel={img.fileName} />}
      </div>

      <button
        onClick={download}
        style={{ background: '#93B96A', color: '#fff', border: 'none', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer', marginTop: '1.25rem' }}
      >
        Download PNG
      </button>
    </div>
  );
}
