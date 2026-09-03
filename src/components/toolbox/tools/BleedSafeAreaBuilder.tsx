import { useEffect, useRef, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
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
  const [trimW, setTrimW] = useState('8.5');
  const [trimH, setTrimH] = useState('11');
  const [bleed, setBleed] = useState('0.125');
  const [safeMargin, setSafeMargin] = useState('0.25');
  const [dpi, setDpi] = useState('300');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const clearPreset = () => setActivePreset(null);

  const tw = parseFloat(trimW) || 1;
  const th = parseFloat(trimH) || 1;
  const b = parseFloat(bleed) || 0;
  const safe = parseFloat(safeMargin) || 0;
  const d = Math.min(Math.max(parseInt(dpi, 10) || 72, 72), 600);

  const outW = Math.round((tw + 2 * b) * d);
  const outH = Math.round((th + 2 * b) * d);

  // Physical full-bleed dimensions in inches, used by the vector (SVG) export --
  // unlike the PNG raster export above, this doesn't depend on DPI at all.
  const fullW = tw + 2 * b;
  const fullH = th + 2 * b;
  const svgStrokeW = clamp(Math.min(fullW, fullH) * 0.0015, 0.008, 0.05);
  const safeRectW = Math.max(0, tw - 2 * safe);
  const safeRectH = Math.max(0, th - 2 * safe);

  const isPortrait = th >= tw;
  const setOrientation = (wantPortrait: boolean) => {
    if (wantPortrait === isPortrait) return;
    setTrimW(trimH);
    setTrimH(trimW);
    clearPreset();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, outW, outH);

    // bleed boundary (outer edge)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(1, d / 150);
    ctx.setLineDash([d * 0.05, d * 0.03]);
    ctx.strokeRect(1, 1, outW - 2, outH - 2);

    // trim line
    const trimX = b * d;
    const trimY = b * d;
    ctx.strokeStyle = '#000';
    ctx.setLineDash([]);
    ctx.strokeRect(trimX, trimY, tw * d, th * d);

    // safe area
    ctx.strokeStyle = '#6CA6FF';
    ctx.setLineDash([d * 0.04, d * 0.03]);
    const safeX = (b + safe) * d;
    const safeY = (b + safe) * d;
    ctx.strokeRect(safeX, safeY, (tw - 2 * safe) * d, (th - 2 * safe) * d);
    ctx.setLineDash([]);
  }, [outW, outH, tw, th, b, safe, d]);

  const downloadPngGuide = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasPNG(canvas, `bleed-guide-${trimW}x${trimH}in-${dpi}dpi`);
  };

  const downloadSvgGuide = () => {
    const svg = svgRef.current;
    if (!svg) return;
    downloadSVG(svg, `bleed-guide-${trimW}x${trimH}in`);
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
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
              onClick={() => setOrientation(v)}
              style={{
                background: isPortrait === v ? '#93B96A' : 'transparent',
                color: isPortrait === v ? '#fff' : 'var(--k-text-muted)',
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
        <InputField label="Trim width" value={trimW} onChange={(v) => { setTrimW(v); clearPreset(); }} step="0.25" min="1" suffix="in" />
        <InputField label="Trim height" value={trimH} onChange={(v) => { setTrimH(v); clearPreset(); }} step="0.25" min="1" suffix="in" />
        <InputField label="Bleed" value={bleed} onChange={(v) => { setBleed(v); clearPreset(); }} step="0.0625" min="0" suffix="in" />
        <InputField label="Safe margin" value={safeMargin} onChange={(v) => { setSafeMargin(v); clearPreset(); }} step="0.0625" min="0" suffix="in" />
        <InputField label="Output DPI" value={dpi} onChange={setDpi} step="50" min="72" />
      </div>

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
          <canvas ref={canvasRef} style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block' }} />
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
            stroke="#6CA6FF"
            strokeWidth={svgStrokeW}
            strokeDasharray={`${svgStrokeW * 5} ${svgStrokeW * 4}`}
          />
        </svg>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--k-text-muted)', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '2px dashed #ef4444', marginRight: '.375rem', verticalAlign: 'middle' }} />Bleed edge</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '2px solid #000', marginRight: '.375rem', verticalAlign: 'middle' }} />Trim line</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '1px', borderTop: '2px dashed #6CA6FF', marginRight: '.375rem', verticalAlign: 'middle' }} />Safe area</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Finished trim size" value={`${tw}" × ${th}"`} />
        <Metric label="Full bleed canvas" value={`${(tw + 2 * b).toFixed(3)}" × ${(th + 2 * b).toFixed(3)}"`} />
        <Metric label="Output pixels" value={`${outW} × ${outH}`} sublabel={`at ${d} DPI`} />
      </div>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
        <button
          onClick={downloadSvgGuide}
          style={{ background: '#93B96A', color: '#fff', border: 'none', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
        >
          Download SVG guide
        </button>
        <button
          onClick={downloadPngGuide}
          style={{ background: 'transparent', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
        >
          Download PNG guide (raster, at the DPI above)
        </button>
      </div>
    </div>
  );
}
