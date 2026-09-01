import { useEffect, useRef, useState } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const MAX_DIMENSION = 2000;
const ACCENT = '#93B96A';

type Mode = '1-point' | '2-point' | '3-point';
interface VP {
  x: number;
  y: number;
}

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

export default function PerspectiveGridMaker() {
  const [width, setWidth] = useState('1200');
  const [height, setHeight] = useState('900');
  const [mode, setMode] = useState<Mode>('2-point');
  const [horizonPct, setHorizonPct] = useState(50);
  const [lineCount, setLineCount] = useState(16);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const w = Math.min(Math.max(parseInt(width, 10) || 100, 100), MAX_DIMENSION);
  const h = Math.min(Math.max(parseInt(height, 10) || 100, 100), MAX_DIMENSION);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    const horizonY = h * (horizonPct / 100);

    // Horizon line — bolder, it's the reference every VP sits on
    ctx.strokeStyle = ACCENT;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 0.5);
    ctx.lineTo(w, horizonY + 0.5);
    ctx.stroke();

    // Radiating construction lines
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;

    let vps: VP[] = [];

    if (mode === '1-point') {
      const vp: VP = { x: w / 2, y: horizonY };
      drawRadiatingLines(ctx, vp, lineCount, w, h);
      vps = [vp];
    } else {
      const vp1: VP = { x: w * 0.1, y: horizonY };
      const vp2: VP = { x: w * 0.9, y: horizonY };
      const perVp = Math.max(2, Math.round(lineCount / 2));
      drawRadiatingLines(ctx, vp1, perVp, w, h);
      drawRadiatingLines(ctx, vp2, perVp, w, h);
      vps = [vp1, vp2];

      if (mode === '3-point') {
        const vp3: VP = { x: w / 2, y: h * 1.4 };
        drawRadiatingLines(ctx, vp3, perVp, w, h);
        vps.push(vp3);
      }
    }

    // Mark every VP actually used
    vps.forEach((vp) => drawVpMarker(ctx, vp));
  }, [w, h, mode, horizonPct, lineCount]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `perspective-grid-${mode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Canvas width" value={width} onChange={setWidth} min="100" suffix="px" />
        <InputField label="Canvas height" value={height} onChange={setHeight} min="100" suffix="px" />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '.8rem',
            fontWeight: 700,
            color: 'var(--k-text-muted)',
            marginBottom: '.375rem',
            fontFamily: "'Poppins', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Perspective mode
        </label>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {(['1-point', '2-point', '3-point'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? ACCENT : 'transparent',
                color: mode === m ? '#fff' : 'var(--k-text-muted)',
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <RangeControl label="Horizon position" value={horizonPct} onChange={setHorizonPct} min={10} max={90} formatValue={(v) => `${v}%`} accent={ACCENT} />
        <RangeControl label="Lines per vanishing point" value={lineCount} onChange={setLineCount} min={8} max={40} accent={ACCENT} />
      </div>

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
            role="img"
            aria-label={`${MODE_LABELS[mode]} perspective grid with the horizon at ${horizonPct}% of canvas height`}
            style={{ width: '100%', maxWidth: '480px', height: 'auto', display: 'block' }}
          />
        </div>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Mode" value={MODE_LABELS[mode]} />
        <Metric label="Vanishing points" value={String(MODE_VP_COUNT[mode])} />
        <Metric label="Output size" value={`${w} × ${h}`} sublabel="pixels" />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {mode === '3-point' ? (
          <Warning level="info" title="The third VP sits below the frame on purpose">
            That's the worm's-eye setup: verticals converge downward toward a point beneath the canvas, so its dot
            won't be visible in the image itself — only the lines heading toward it are. Trace subjects so their
            vertical edges point down at that off-canvas spot.
          </Warning>
        ) : (
          <Warning level="info" title="Trace, don't calculate">
            Every marked dot is a real vanishing point — line up any edge in your drawing with the rays radiating
            from one of them and it'll read as correct perspective, no math required.
          </Warning>
        )}
      </div>

      <button
        onClick={download}
        style={{ background: ACCENT, color: '#fff', border: 'none', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer', marginTop: '1.25rem' }}
      >
        Download perspective grid PNG
      </button>
    </div>
  );
}
