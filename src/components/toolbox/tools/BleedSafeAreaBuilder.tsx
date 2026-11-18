import { useEffect, useRef, useState } from 'react';
import './bleed-safe-area.css';
import useToolResult from '../../../utils/useToolResult';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import VisualizationContainer from '../shared/VisualizationContainer';
import PresetBar from '../shared/PresetBar';
import { downloadSVG, downloadCanvasPNG } from '../shared/exportHelpers';
import { clamp } from '../shared/mathHelpers';

interface SizePreset {
  trimW: string;
  trimH: string;
  bleed: string;
  safeMargin: string;
}

const SIZE_PRESETS: { label: string; values: SizePreset }[] = [
  { label: 'Letter', values: { trimW: '8.5', trimH: '11', bleed: '0.125', safeMargin: '0.25' } },
  { label: 'A4', values: { trimW: '8.27', trimH: '11.69', bleed: '0.125', safeMargin: '0.25' } },
  { label: 'Business card', values: { trimW: '3.5', trimH: '2', bleed: '0.125', safeMargin: '0.125' } },
  { label: 'Poster', values: { trimW: '18', trimH: '24', bleed: '0.25', safeMargin: '0.5' } },
];

export default function BleedSafeAreaBuilder() {
  const [unit, setUnit] = useState<'in' | 'mm'>('in');
  const [exportError, setExportError] = useState('');
  const [trimW, setTrimW] = useState('8.5');
  const [trimH, setTrimH] = useState('11');
  const [bleed, setBleed] = useState('0.125');
  const [safeMargin, setSafeMargin] = useState('0.25');
  const [dpi, setDpi] = useState('300');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const clearPreset = () => setActivePreset(null);

  // Inch values remain canonical; changing display units never changes the physical guide.
  const tw = Number(trimW), th = Number(trimH), b = Number(bleed), safe = Number(safeMargin), d = Number(dpi);
  const fullW = tw + 2 * b, fullH = th + 2 * b;
  const safeRectW = tw - 2 * safe, safeRectH = th - 2 * safe;
  const valid = trimW !== '' && trimH !== '' && bleed !== '' && safeMargin !== '' &&
    [tw, th, b, safe, fullW, fullH, fullW * 25.4, fullH * 25.4, fullW * d, fullH * d].every(Number.isFinite) && tw > 0 && th > 0 && b >= 0 && safe >= 0 &&
    safeRectW > 0 && safeRectH > 0 && Number.isInteger(d) && d >= 72 && d <= 600;
  const outW = Math.round(fullW * d), outH = Math.round(fullH * d);
  const pngAvailable = valid && Number.isSafeInteger(outW) && Number.isSafeInteger(outH) && outW > 0 && outH > 0 && outW * outH <= 16_000_000;
  const svgStrokeW = clamp(Math.min(fullW, fullH) * 0.0015, 0.008, 0.05);
  const show = (value: string) => unit === 'in' || value === '' ? value : String(Number((Number(value) * 25.4).toFixed(6)));
  const fromDisplay = (value: string) => unit === 'in' || value === '' ? value : String(Number((Number(value) / 25.4).toFixed(10)));
  const dimension = (value: number) => `${Number((value * (unit === 'mm' ? 25.4 : 1)).toFixed(3))} ${unit}`;
  useToolResult([trimW, trimH, bleed, safeMargin, dpi].join('|'), valid);

  const isPortrait = th >= tw;
  const setOrientation = (wantPortrait: boolean) => {
    if (wantPortrait === isPortrait) return;
    setTrimW(trimH);
    setTrimH(trimW);
    clearPreset();
  };

  const paintGuide = (canvas: HTMLCanvasElement, width: number, height: number, preview = false) => {
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const sx = width / fullW, sy = height / fullH;
    ctx.clearRect(0, 0, width, height);
    if (preview) {
      ctx.fillStyle = '#fff1ef'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff'; ctx.fillRect(b * sx, b * sy, tw * sx, th * sy);
      ctx.fillStyle = '#eff6ff'; ctx.fillRect((b + safe) * sx, (b + safe) * sy, safeRectW * sx, safeRectH * sy);
    }
    ctx.lineWidth = Math.max(preview ? 3 : 1, Math.min(width, height) / 600);
    ctx.strokeStyle = '#ef4444'; ctx.setLineDash([8, 5]);
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.strokeStyle = '#000'; ctx.setLineDash([]);
    ctx.strokeRect(b * sx, b * sy, tw * sx, th * sy);
    ctx.strokeStyle = '#1d4ed8'; ctx.setLineDash([5, 4]);
    ctx.strokeRect((b + safe) * sx, (b + safe) * sy, safeRectW * sx, safeRectH * sy);
    ctx.setLineDash([]);
    return true;
  };
  useEffect(() => {
    if (!valid || !canvasRef.current) return;
    const scale = Math.min(900 / fullW, 900 / fullH);
    paintGuide(canvasRef.current, Math.max(1, Math.round(fullW * scale)), Math.max(1, Math.round(fullH * scale)), true);
  }, [fullW, fullH, tw, th, b, safe, valid]);

  const downloadPngGuide = () => {
    if (!pngAvailable) return;
    setExportError('');
    try {
      const canvas = document.createElement('canvas');
      if (!paintGuide(canvas, outW, outH)) throw new Error();
      downloadCanvasPNG(canvas, `bleed-guide-${trimW}x${trimH}in-${d}dpi`);
    } catch { setExportError('Could not prepare the PNG. Try the SVG guide or a lower DPI.'); }
  };

  const downloadSvgGuide = () => {
    const svg = svgRef.current;
    if (!valid || !svg) return;
    downloadSVG(svg, `bleed-guide-${trimW}x${trimH}in`);
  };

  return (
    <div className="bleed-workspace" style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: 'clamp(.875rem, 3vw, 1.5rem)' }}>
      <p><strong>Keep important content inside the cut.</strong> Set the finished size, preview the boundaries, then export a guide.</p>
      <p className="bleed-printer-note"><strong>Always confirm bleed and safe-area requirements with your printer or platform.</strong> Presets are examples, not universal specifications. This guide does not check your artwork or guarantee a print result.</p>
      <label className="bleed-units">Units<select value={unit} onChange={event => setUnit(event.target.value as 'in' | 'mm')}><option value="in">Inches</option><option value="mm">Millimetres</option></select></label>
      <PresetBar<SizePreset>
        presets={SIZE_PRESETS}
        activeLabel={activePreset}
        accent="#93B96A"
        onSelect={(values, label) => {
          setTrimW(values.trimW);
          setTrimH(values.trimH);
          setBleed(values.bleed);
          setSafeMargin(values.safeMargin);
          setActivePreset(label);
        }}
      />

      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--k-text-muted)',
            marginBottom: '.375rem',
            fontFamily: "'Poppins', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Orientation
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {[{ v: true, l: 'Portrait' }, { v: false, l: 'Landscape' }].map(({ v, l }) => (
            <button
              key={l}
              type="button"
              aria-pressed={isPortrait === v}
              onClick={() => setOrientation(v)}
              style={{
                background: isPortrait === v ? '#93B96A' : 'transparent',
                color: isPortrait === v ? '#17212b' : 'var(--k-text-muted)',
                border: '1px solid ' + (isPortrait === v ? '#93B96A' : 'var(--k-border)'),
                padding: '.5rem 1rem',
                borderRadius: '.5rem',
                fontSize: '.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <InputField label="Trim width" value={show(trimW)} onChange={(v) => { setTrimW(fromDisplay(v)); clearPreset(); }} step="any" min="0.001" suffix={unit} />
        <InputField label="Trim height" value={show(trimH)} onChange={(v) => { setTrimH(fromDisplay(v)); clearPreset(); }} step="any" min="0.001" suffix={unit} />
        <InputField label="Bleed" value={show(bleed)} onChange={(v) => { setBleed(fromDisplay(v)); clearPreset(); }} step="any" min="0" suffix={unit} />
        <InputField label="Safe margin" value={show(safeMargin)} onChange={(v) => { setSafeMargin(fromDisplay(v)); clearPreset(); }} step="any" min="0" suffix={unit} />
        <InputField label="Output DPI" value={dpi} onChange={setDpi} step="1" min="72" max="600" />
      </div>

      {!valid && <p role="alert">Enter positive trim sizes, nonnegative bleed, and a safe margin smaller than half the shortest trim side. DPI must be a whole number from 72 to 600.</p>}
      {valid && <>
      <VisualizationContainer minHeight={300}>
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
          <canvas ref={canvasRef} role="img" aria-label={`Print guide: ${tw} by ${th} inch trim, ${b} inch bleed outside trim, ${safe} inch safe margin inside trim.`} style={{ background: '#fff', width: '100%', maxWidth: '420px', height: 'auto', display: 'block' }} />
        </div>
      </VisualizationContainer>

      {/* Hidden vector twin of the canvas preview above, built at true physical size (1 SVG
          unit = 1 inch) so it can be serialized and downloaded as a real, scalable guide --
          never rendered visibly, purely an export source. */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${fullW} ${fullH}`}
          width={`${fullW}in`}
          height={`${fullH}in`}
        >
          <rect
            x={svgStrokeW / 2}
            y={svgStrokeW / 2}
            width={Math.max(0, fullW - svgStrokeW)}
            height={Math.max(0, fullH - svgStrokeW)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={svgStrokeW}
            strokeDasharray={`${svgStrokeW * 6} ${svgStrokeW * 4}`}
          />
          <rect x={b} y={b} width={tw} height={th} fill="none" stroke="#000000" strokeWidth={svgStrokeW} />
          <rect
            x={b + safe}
            y={b + safe}
            width={safeRectW}
            height={safeRectH}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={svgStrokeW}
            strokeDasharray={`${svgStrokeW * 5} ${svgStrokeW * 4}`}
          />
        </svg>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '2px dashed #ef4444', marginRight: '.375rem', verticalAlign: 'middle' }} />Bleed — extend backgrounds</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '2px solid var(--k-text)', marginRight: '.375rem', verticalAlign: 'middle' }} />Trim — finished cut</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '2px dashed #1d4ed8', marginRight: '.375rem', verticalAlign: 'middle' }} />Safe — keep important content inside</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Finished trim size" value={`${dimension(tw)} × ${dimension(th)}`} />
        <Metric label="Full bleed canvas" value={`${dimension(fullW)} × ${dimension(fullH)}`} />
        <Metric label="Safe content area" value={`${dimension(safeRectW)} × ${dimension(safeRectH)}`} />
        <Metric label="Output pixels" value={`${outW} × ${outH}`} sublabel={`at ${d} DPI`} />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Insight
          what={`Your guide has a ${dimension(tw)} × ${dimension(th)} finished trim, a ${dimension(b)} bleed edge, and a ${dimension(safe)} safe margin at ${d} DPI.`}
          why="The bleed edge gives artwork room beyond trim, while the safe area keeps important text and details away from normal cutting tolerance."
          tip="Keep background artwork through the bleed edge and place important content inside the blue safe area. Confirm the printer's own specification before sending the final file."
        />
      </div>

      </>}
      <p className="bleed-export-note">SVG keeps the physical document size and stays sharp at any zoom. PNG is a raster guide at your selected DPI. Neither contains your artwork or adds printer crop marks.</p>
      {valid && !pngAvailable && <p role="status">PNG requires at least one pixel per side and at most 16 million pixels to protect browser memory. Adjust the DPI or use the full-size SVG guide.</p>}
      {exportError && <p role="alert">{exportError}</p>}
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
        <button
          type="button" disabled={!valid} onClick={downloadSvgGuide}
          style={{ background: '#93B96A', color: '#17212b', border: 'none', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
        >
          Download SVG guide
        </button>
        <button
          type="button" disabled={!pngAvailable} onClick={downloadPngGuide}
          style={{ background: 'transparent', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
        >
          Download PNG guide (raster, at the DPI above)
        </button>
      </div>
    </div>
  );
}
