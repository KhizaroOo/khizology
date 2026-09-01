import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';

interface RatioDef {
  key: string;
  label: string;
  ratio: number;
}

const RATIOS: RatioDef[] = [
  { key: 'square', label: 'Square (1:1)', ratio: 1 },
  { key: 'landscape', label: 'Landscape (16:9)', ratio: 16 / 9 },
  { key: 'portrait', label: 'Portrait (4:5)', ratio: 4 / 5 },
  { key: 'story', label: 'Story (9:16)', ratio: 9 / 16 },
];

const MAX_LONG_EDGE = 2000;

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function centeredCropRect(imgW: number, imgH: number, targetRatio: number): CropRect {
  const srcRatio = imgW / imgH;
  if (srcRatio > targetRatio) {
    // image is wider than target — crop left/right, keep full height
    const cropW = imgH * targetRatio;
    return { x: (imgW - cropW) / 2, y: 0, w: cropW, h: imgH };
  }
  // image is taller than target (or equal) — crop top/bottom, keep full width
  const cropH = imgW / targetRatio;
  return { x: 0, y: (imgH - cropH) / 2, w: imgW, h: cropH };
}

function outputSize(cropW: number, cropH: number): { w: number; h: number } {
  const longEdge = Math.max(cropW, cropH);
  if (longEdge <= MAX_LONG_EDGE) return { w: Math.round(cropW), h: Math.round(cropH) };
  const scale = MAX_LONG_EDGE / longEdge;
  return { w: Math.round(cropW * scale), h: Math.round(cropH * scale) };
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function drawCrop(canvas: HTMLCanvasElement, img: HTMLImageElement, crop: CropRect, outW: number, outH: number) {
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export default function CropGuardian() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({
    square: true,
    landscape: true,
    portrait: true,
    story: true,
  });
  const canvasRefs = useMemo(() => new Map<string, HTMLCanvasElement>(), []);

  const handleFile = async (file: File) => {
    try {
      setImg(await loadImageFromFile(file));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setImg(null);
    }
  };

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const crops = useMemo(() => {
    if (!img) return [];
    return RATIOS.filter((r) => checked[r.key]).map((r) => {
      const rect = centeredCropRect(img.width, img.height, r.ratio);
      const out = outputSize(rect.w, rect.h);
      return { ...r, rect, out };
    });
  }, [img, checked]);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '.4rem' }}>
        Crop Guardian
      </h2>
      <p style={{ fontSize: '.85rem', color: 'var(--k-text-muted)', marginTop: 0, marginBottom: '1.25rem' }}>
        Nothing is uploaded — all cropping happens on your device.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ fontSize: '.85rem', color: 'var(--k-text)', marginBottom: '1.25rem' }}
      />

      {error && <Warning level="danger" title="Couldn't read this file">{error}</Warning>}

      <div
        style={{
          fontSize: '.8rem',
          fontWeight: 700,
          color: 'var(--k-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          fontFamily: "'Poppins', sans-serif",
          marginBottom: '.6rem',
        }}
      >
        Target ratios
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem 1.5rem', marginBottom: '1.5rem' }}>
        {RATIOS.map((r) => (
          <label
            key={r.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              fontSize: '.9rem',
              color: 'var(--k-text)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={!!checked[r.key]}
              onChange={() => toggle(r.key)}
              style={{ width: '16px', height: '16px', accentColor: '#F7933C', cursor: 'pointer' }}
            />
            {r.label}
          </label>
        ))}
      </div>

      {img && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
            <Metric label="Source image" value={`${img.width} × ${img.height}px`} />
            <Metric label="File size" value={`${(img.fileSizeBytes / 1024).toFixed(0)} KB`} />
            <Metric label="Crops selected" value={String(crops.length)} color={crops.length ? '#22c55e' : '#F7933C'} />
          </div>

          {crops.length === 0 ? (
            <Warning level="warn" title="No ratios selected">Check at least one target ratio above to generate crops.</Warning>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {crops.map((c) => (
                <div
                  key={c.key}
                  style={{
                    background: 'var(--k-bg)',
                    border: '1px solid var(--k-border)',
                    borderRadius: '.75rem',
                    padding: '.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.6rem',
                  }}
                >
                  <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '.8rem', color: 'var(--k-text)' }}>
                    {c.label}
                  </div>
                  <div
                    style={{
                      background: 'var(--k-bg-elevated)',
                      borderRadius: '.5rem',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <canvas
                      ref={(el) => {
                        if (!el || !img) return;
                        canvasRefs.set(c.key, el);
                        drawCrop(el, img.image, c.rect, c.out.w, c.out.h);
                      }}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)' }}>
                    {c.out.w} × {c.out.h}px
                  </div>
                  <button
                    onClick={() => {
                      const canvas = canvasRefs.get(c.key);
                      if (canvas) downloadCanvas(canvas, `crop-${slugify(c.label)}.png`);
                    }}
                    style={{
                      background: '#93B96A',
                      color: '#fff',
                      border: 'none',
                      padding: '.5rem .75rem',
                      borderRadius: '.5rem',
                      fontWeight: 700,
                      fontSize: '.8rem',
                      fontFamily: "'Poppins', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.25rem' }}>
            <Warning level="info" title="How the crop is chosen">
              For each ratio, Crop Guardian finds the largest possible centered crop that matches it exactly — trimming the sides if your image is wider than the target, or the top/bottom if it's taller. No stretching, no distortion.
            </Warning>
          </div>
        </>
      )}
    </div>
  );
}
