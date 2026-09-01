import { useEffect, useRef, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import VisualizationContainer from '../shared/VisualizationContainer';

export default function BleedSafeAreaBuilder() {
  const [trimW, setTrimW] = useState('8.5');
  const [trimH, setTrimH] = useState('11');
  const [bleed, setBleed] = useState('0.125');
  const [safeMargin, setSafeMargin] = useState('0.25');
  const [dpi, setDpi] = useState('300');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tw = parseFloat(trimW) || 1;
  const th = parseFloat(trimH) || 1;
  const b = parseFloat(bleed) || 0;
  const safe = parseFloat(safeMargin) || 0;
  const d = Math.min(Math.max(parseInt(dpi, 10) || 72, 72), 600);

  const outW = Math.round((tw + 2 * b) * d);
  const outH = Math.round((th + 2 * b) * d);

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

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bleed-guide-${trimW}x${trimH}in-${dpi}dpi.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <InputField label="Trim width" value={trimW} onChange={setTrimW} step="0.25" min="1" suffix="in" />
        <InputField label="Trim height" value={trimH} onChange={setTrimH} step="0.25" min="1" suffix="in" />
        <InputField label="Bleed" value={bleed} onChange={setBleed} step="0.0625" min="0" suffix="in" />
        <InputField label="Safe margin" value={safeMargin} onChange={setSafeMargin} step="0.0625" min="0" suffix="in" />
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

      <button
        onClick={download}
        style={{ background: '#93B96A', color: '#fff', border: 'none', padding: '.6rem 1.5rem', borderRadius: '.5rem', fontWeight: 700, fontSize: '.875rem', fontFamily: "'Poppins', sans-serif", cursor: 'pointer', marginTop: '1.25rem' }}
      >
        Download guide PNG
      </button>
    </div>
  );
}
