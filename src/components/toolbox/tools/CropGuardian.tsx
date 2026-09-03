import { useMemo, useState, type MouseEvent } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import RangeControl from '../shared/RangeControl';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';
import { downloadCanvasPNG } from '../shared/exportHelpers';
import { clamp, safeDiv, formatNumber } from '../shared/mathHelpers';

interface RatioDef {
  key: string;
  label: string;
  ratio: number;
  defaultOn: boolean;
}

const RATIOS: RatioDef[] = [
  { key: 'square', label: 'Square (1:1)', ratio: 1, defaultOn: true },
  { key: 'landscape', label: 'Landscape (16:9)', ratio: 16 / 9, defaultOn: true },
  { key: 'portrait', label: 'Portrait (4:5)', ratio: 4 / 5, defaultOn: true },
  { key: 'story', label: 'Story (9:16)', ratio: 9 / 16, defaultOn: true },
  { key: 'banner', label: 'Wide banner (3:1)', ratio: 3, defaultOn: false },
  { key: 'pin', label: 'Pin (2:3)', ratio: 2 / 3, defaultOn: false },
];

const MAX_LONG_EDGE = 2000;
const FOCAL_PREVIEW_MAX = 420;
const ACCENT = '#F7933C';

interface Focal {
  fx: number;
  fy: number;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Focal-aware crop: finds the largest crop of `targetRatio` that fits inside the image
 * (optionally shrunk by `zoomPercent`, 100 = no zoom), then positions it so its center
 * lands as close as possible to the focal point while staying fully inside the image
 * bounds. With focal = {0.5, 0.5} and zoomPercent = 100 this reduces exactly to the old
 * always-centered crop.
 */
function focalCropRect(imgW: number, imgH: number, targetRatio: number, focal: Focal, zoomPercent: number): CropRect {
  const srcRatio = safeDiv(imgW, imgH, 1);
  let baseW: number;
  let baseH: number;
  if (srcRatio > targetRatio) {
    // image is wider than target — full height, crop left/right
    baseH = imgH;
    baseW = imgH * targetRatio;
  } else {
    // image is taller than target (or equal) — full width, crop top/bottom
    baseW = imgW;
    baseH = imgW / targetRatio;
  }

  const z = clamp(zoomPercent, 100, 200) / 100;
  const w = clamp(baseW / z, 1, imgW);
  const h = clamp(baseH / z, 1, imgH);

  const cx = clamp(focal.fx, 0, 1) * imgW;
  const cy = clamp(focal.fy, 0, 1) * imgH;

  const x = clamp(cx - w / 2, 0, Math.max(0, imgW - w));
  const y = clamp(cy - h / 2, 0, Math.max(0, imgH - h));

  return { x, y, w, h };
}

function outputSize(cropW: number, cropH: number): { w: number; h: number } {
  const longEdge = Math.max(cropW, cropH);
  if (longEdge <= 0) return { w: 1, h: 1 };
  if (longEdge <= MAX_LONG_EDGE) return { w: Math.max(1, Math.round(cropW)), h: Math.max(1, Math.round(cropH)) };
  const scale = MAX_LONG_EDGE / longEdge;
  return { w: Math.max(1, Math.round(cropW * scale)), h: Math.max(1, Math.round(cropH * scale)) };
}

/** Scale (w,h) down (or up) so both dimensions fit within `max`, preserving aspect ratio. */
function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: max, h: max };
  const scale = Math.min(max / w, max / h);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function drawCrop(canvas: HTMLCanvasElement, img: HTMLImageElement, crop: CropRect, outW: number, outH: number) {
  if (outW <= 0 || outH <= 0) return;
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
}

function drawFocalPreview(canvas: HTMLCanvasElement, img: HTMLImageElement, w: number, h: number, focal: Focal) {
  if (w <= 0 || h <= 0) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const px = clamp(focal.fx, 0, 1) * w;
  const py = clamp(focal.fy, 0, 1) * h;
  const r = Math.max(9, Math.min(w, h) * 0.035);

  const drawMark = (color: string, lineWidth: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.moveTo(px - r - 8, py);
    ctx.lineTo(px + r + 8, py);
    ctx.moveTo(px, py - r - 8);
    ctx.lineTo(px, py + r + 8);
    ctx.stroke();
  };
  // dark outline first so the marker stays visible on light image areas
  drawMark('rgba(0,0,0,.65)', 4);
  drawMark(ACCENT, 2);
}

export default function CropGuardian() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(RATIOS.map((r) => [r.key, r.defaultOn]))
  );
  const [focal, setFocal] = useState<Focal>({ fx: 0.5, fy: 0.5 });
  const [zoom, setZoom] = useState(100);
  const canvasRefs = useMemo(() => new Map<string, HTMLCanvasElement>(), []);

  const handleFile = async (file: File) => {
    try {
      setImg(await loadImageFromFile(file));
      setError(null);
      setFocal({ fx: 0.5, fy: 0.5 });
      setZoom(100);
    } catch (e) {
      setError((e as Error).message);
      setImg(null);
    }
  };

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFocalClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    setFocal({
      fx: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      fy: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    });
  };

  const focalPreviewSize = useMemo(() => (img ? fitWithin(img.width, img.height, FOCAL_PREVIEW_MAX) : null), [img]);

  const crops = useMemo(() => {
    if (!img) return [];
    const originalArea = img.width * img.height;
    return RATIOS.filter((r) => checked[r.key]).map((r) => {
      const rect = focalCropRect(img.width, img.height, r.ratio, focal, zoom);
      const out = outputSize(rect.w, rect.h);
      const lossPct = clamp(100 - safeDiv(rect.w * rect.h, originalArea, 1) * 100, 0, 100);
      return { ...r, rect, out, lossPct };
    });
  }, [img, checked, focal, zoom]);

  const isCentered = Math.abs(focal.fx - 0.5) < 0.001 && Math.abs(focal.fy - 0.5) < 0.001;

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
              style={{ width: '16px', height: '16px', accentColor: ACCENT, cursor: 'pointer' }}
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
            <Metric label="Crops selected" value={String(crops.length)} color={crops.length ? '#22c55e' : ACCENT} />
            <Metric
              label="Focal point"
              value={`${Math.round(focal.fx * 100)}%, ${Math.round(focal.fy * 100)}%`}
              color={isCentered ? undefined : ACCENT}
              sublabel={isCentered ? 'center (default)' : undefined}
            />
          </div>

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
            Focal lock
          </div>
          <p style={{ fontSize: '.82rem', color: 'var(--k-text-muted)', marginTop: 0, marginBottom: '.75rem', lineHeight: 1.5 }}>
            Click anywhere on the image below to mark what must stay in frame. Every crop below is
            recomputed to keep that point as centered as possible.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.5rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                border: '1px solid var(--k-border)',
                borderRadius: '.75rem',
                overflow: 'hidden',
                display: 'inline-flex',
                maxWidth: '100%',
              }}
            >
              {focalPreviewSize && (
                <canvas
                  ref={(el) => {
                    if (!el || !img) return;
                    drawFocalPreview(el, img.image, focalPreviewSize.w, focalPreviewSize.h, focal);
                  }}
                  onClick={handleFocalClick}
                  style={{ width: '100%', maxWidth: `${FOCAL_PREVIEW_MAX}px`, height: 'auto', display: 'block', cursor: 'crosshair' }}
                />
              )}
            </div>
            {!isCentered && (
              <button
                onClick={() => setFocal({ fx: 0.5, fy: 0.5 })}
                style={{
                  background: 'transparent',
                  color: 'var(--k-text-muted)',
                  border: '1px solid var(--k-border)',
                  padding: '.35rem .75rem',
                  borderRadius: '.5rem',
                  fontWeight: 700,
                  fontSize: '.75rem',
                  fontFamily: "'Poppins', sans-serif",
                  cursor: 'pointer',
                }}
              >
                Reset to center
              </button>
            )}
          </div>

          <div style={{ maxWidth: '360px', marginBottom: '1.5rem' }}>
            <RangeControl
              label="Zoom"
              value={zoom}
              onChange={setZoom}
              min={100}
              max={200}
              step={1}
              formatValue={(v) => `${Math.round(v)}%`}
              accent={ACCENT}
            />
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
                  <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)' }}>
                    {formatNumber(c.lossPct, 1)}% of original cropped out
                  </div>
                  <button
                    onClick={() => {
                      const canvas = canvasRefs.get(c.key);
                      if (canvas) downloadCanvasPNG(canvas, `crop-${slugify(c.label)}.png`);
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
              For each ratio, Crop Guardian finds the largest possible crop that matches it exactly — trimming the
              sides if your image is wider than the target, or the top/bottom if it's taller — no stretching, no
              distortion. That crop is then positioned so its center lands as close as possible to your focal point
              (the marker on the image above), while staying fully inside the photo. Zoom shrinks every crop around
              that same locked point, so whatever you marked stays in frame across every ratio.
            </Warning>
          </div>
        </>
      )}
    </div>
  );
}
