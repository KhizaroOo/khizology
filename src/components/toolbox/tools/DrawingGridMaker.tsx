import { useEffect, useRef, useState } from 'react';
import InputField from '../shared/InputField';
import RangeControl from '../shared/RangeControl';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';

const MAX_DIMENSION = 4000;

export default function DrawingGridMaker() {
  const [width, setWidth] = useState('1200');
  const [height, setHeight] = useState('900');
  const [cellSize, setCellSize] = useState(60);
  const [lineColor, setLineColor] = useState('#F7933C');
  const [opacity, setOpacity] = useState(60);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const w = Math.min(Math.max(parseInt(width, 10) || 0, 100), MAX_DIMENSION);
  const h = Math.min(Math.max(parseInt(height, 10) || 0, 100), MAX_DIMENSION);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'transparent';

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
  }, [w, h, cellSize, lineColor, opacity]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drawing-grid-${w}x${h}-${cellSize}px.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Canvas width" value={width} onChange={setWidth} min="100" suffix="px" />
        <InputField label="Canvas height" value={height} onChange={setHeight} min="100" suffix="px" />
        <div>
          <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.375rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Line color
          </label>
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
          <canvas ref={canvasRef} style={{ width: '100%', maxWidth: '480px', height: 'auto', display: 'block' }} />
        </div>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Grid" value={`${cols} × ${rows}`} sublabel="cells" />
        <Metric label="Output size" value={`${w} × ${h}`} sublabel="pixels" />
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
