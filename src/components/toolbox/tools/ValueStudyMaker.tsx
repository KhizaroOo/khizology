import { useEffect, useRef, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';

const MAX_EDGE = 1200;

function fitDimensions(width: number, height: number): { w: number; h: number } {
  if (width <= MAX_EDGE && height <= MAX_EDGE) return { w: width, h: height };
  if (width >= height) {
    const scale = MAX_EDGE / width;
    return { w: MAX_EDGE, h: Math.round(height * scale) };
  }
  const scale = MAX_EDGE / height;
  return { w: Math.round(width * scale), h: MAX_EDGE };
}

export default function ValueStudyMaker() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState(4);

  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const studyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = async (file: File) => {
    try {
      const loaded = await loadImageFromFile(file);
      setImg(loaded);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setImg(null);
    }
  };

  // Draw the original once per loaded image, untouched.
  useEffect(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !img) return;
    const { w, h } = fitDimensions(img.width, img.height);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img.image, 0, 0, w, h);
  }, [img]);

  // Draw + posterize the value study whenever the image or step count changes.
  useEffect(() => {
    const canvas = studyCanvasRef.current;
    if (!canvas || !img) return;
    const { w, h } = fitDimensions(img.width, img.height);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img.image, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const stepSize = 255 / (steps - 1);
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const quantized = Math.round(Math.round(luminance / stepSize) * stepSize);
      px[i] = quantized;
      px[i + 1] = quantized;
      px[i + 2] = quantized;
      // alpha (px[i + 3]) left unchanged
    }
    ctx.putImageData(data, 0, 0);
  }, [img, steps]);

  const download = () => {
    const canvas = studyCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'value-study.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '.5rem' }}>
        Upload a reference photo
      </h2>
      <p style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', marginTop: 0, marginBottom: '1rem', lineHeight: 1.5 }}>
        Squint at any photo long enough and it collapses into a handful of light/dark shapes — that's the value study.
        This tool does the squinting for you.
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ fontSize: '.85rem', color: 'var(--k-text)', marginBottom: '1.25rem' }}
      />

      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <Warning level="danger" title="Couldn't read this file">{error}</Warning>
        </div>
      )}

      {img && (
        <>
          <div style={{ marginBottom: '1.25rem', maxWidth: '360px' }}>
            <RangeControl
              label="Value steps"
              value={steps}
              onChange={setSteps}
              min={2}
              max={8}
              step={1}
              formatValue={(v) => `${v} tones`}
              accent="#F7933C"
            />
          </div>

          <VisualizationContainer minHeight={280}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'center', width: '100%' }}>
              <div style={{ flex: '1 1 260px', maxWidth: '480px' }}>
                <div
                  style={{
                    fontSize: '.75rem',
                    fontWeight: 700,
                    color: 'var(--k-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    fontFamily: "'Poppins', sans-serif",
                    marginBottom: '.5rem',
                    textAlign: 'center',
                  }}
                >
                  Original
                </div>
                <canvas
                  ref={originalCanvasRef}
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '.5rem', border: '1px solid var(--k-border)' }}
                />
              </div>
              <div style={{ flex: '1 1 260px', maxWidth: '480px' }}>
                <div
                  style={{
                    fontSize: '.75rem',
                    fontWeight: 700,
                    color: 'var(--k-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    fontFamily: "'Poppins', sans-serif",
                    marginBottom: '.5rem',
                    textAlign: 'center',
                  }}
                >
                  Value Study
                </div>
                <canvas
                  ref={studyCanvasRef}
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '.5rem', border: '1px solid var(--k-border)' }}
                />
              </div>
            </div>
          </VisualizationContainer>

          <button
            onClick={download}
            style={{
              background: '#93B96A',
              color: '#fff',
              border: 'none',
              padding: '.6rem 1.5rem',
              borderRadius: '.5rem',
              fontWeight: 700,
              fontSize: '.875rem',
              fontFamily: "'Poppins', sans-serif",
              cursor: 'pointer',
              marginTop: '1.25rem',
            }}
          >
            Download value study PNG
          </button>

          <div style={{ marginTop: '1.25rem' }}>
            <Warning level="info" title={`Posterized to ${steps} tone${steps === 1 ? '' : 's'} of gray`}>
              Fewer steps force bigger, simpler decisions about light and shadow — great for beginners. More steps keep
              subtler gradations, closer to a full grayscale study. Processed entirely on your device — nothing is uploaded.
            </Warning>
          </div>
        </>
      )}
    </div>
  );
}
