import { useEffect, useRef, useState } from 'react';
import RangeControl from '../shared/RangeControl';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import VisualizationContainer from '../shared/VisualizationContainer';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';
import { downloadCanvasPNG } from '../shared/exportHelpers';
import { clamp, safeDiv } from '../shared/mathHelpers';

const MAX_EDGE = 1200;
const HIST_BINS = 32;

function fitDimensions(width: number, height: number): { w: number; h: number } {
  if (width <= MAX_EDGE && height <= MAX_EDGE) return { w: width, h: height };
  if (width >= height) {
    const scale = MAX_EDGE / width;
    return { w: MAX_EDGE, h: Math.round(height * scale) };
  }
  const scale = MAX_EDGE / height;
  return { w: Math.round(width * scale), h: MAX_EDGE };
}

function clampByte(v: number): number {
  return Math.round(clamp(v, 0, 255));
}

/**
 * Separable box blur — a horizontal pass followed by a vertical pass gives the exact same
 * result as a full NxN average for a uniform (box) kernel, at a fraction of the work.
 */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const temp = new Float32Array(src.length);
  const out = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = x + dx;
        if (sx < 0 || sx >= w) continue;
        const idx = (y * w + sx) * 4;
        rSum += src[idx];
        gSum += src[idx + 1];
        bSum += src[idx + 2];
        aSum += src[idx + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      temp[idx] = rSum / count;
      temp[idx + 1] = gSum / count;
      temp[idx + 2] = bSum / count;
      temp[idx + 3] = aSum / count;
    }
  }

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = y + dy;
        if (sy < 0 || sy >= h) continue;
        const idx = (sy * w + x) * 4;
        rSum += temp[idx];
        gSum += temp[idx + 1];
        bSum += temp[idx + 2];
        aSum += temp[idx + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      out[idx] = rSum / count;
      out[idx + 1] = gSum / count;
      out[idx + 2] = bSum / count;
      out[idx + 3] = aSum / count;
    }
  }

  return out;
}

interface TonalBreakdown {
  shadows: number;
  midtones: number;
  highlights: number;
}

export default function ValueStudyMaker() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState(4);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [blur, setBlur] = useState(0);
  const [invert, setInvert] = useState(false);
  const [histogram, setHistogram] = useState<number[]>([]);
  const [tonal, setTonal] = useState<TonalBreakdown>({ shadows: 0, midtones: 0, highlights: 0 });

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

  // Draw + process the value study whenever the image or any adjustment changes:
  // blur -> brightness/contrast -> posterize -> (optional) invert.
  useEffect(() => {
    const canvas = studyCanvasRef.current;
    if (!canvas || !img) return;
    const { w, h } = fitDimensions(img.width, img.height);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img.image, 0, 0, w, h);

    const raw = ctx.getImageData(0, 0, w, h);
    const radius = Math.round(clamp(blur, 0, 5));
    const px: Uint8ClampedArray = radius > 0 ? boxBlur(raw.data, w, h, radius) : raw.data;

    const b = clamp(brightness, -100, 100);
    const c = clamp(contrast, -50, 50);
    const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));

    const pixelCount = w * h;
    const luminances = new Float32Array(pixelCount);
    const bins = new Array(HIST_BINS).fill(0);
    let shadowCount = 0;
    let midtoneCount = 0;
    let highlightCount = 0;

    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      let r = clampByte(px[i] + b);
      let g = clampByte(px[i + 1] + b);
      let bl = clampByte(px[i + 2] + b);
      r = clampByte(contrastFactor * (r - 128) + 128);
      g = clampByte(contrastFactor * (g - 128) + 128);
      bl = clampByte(contrastFactor * (bl - 128) + 128);

      const luminance = 0.299 * r + 0.587 * g + 0.114 * bl;
      luminances[p] = luminance;

      const bin = clamp(Math.floor((luminance / 256) * HIST_BINS), 0, HIST_BINS - 1);
      bins[bin] += 1;
      if (luminance <= 85) shadowCount++;
      else if (luminance <= 170) midtoneCount++;
      else highlightCount++;

      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = bl;
      // alpha (px[i + 3]) left unchanged
    }

    const stepSize = 255 / (steps - 1);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) {
      const luminance = luminances[p];
      let quantized = Math.round(Math.round(luminance / stepSize) * stepSize);
      if (invert) quantized = 255 - quantized;
      px[i] = quantized;
      px[i + 1] = quantized;
      px[i + 2] = quantized;
    }

    raw.data.set(px);
    ctx.putImageData(raw, 0, 0);

    setHistogram(bins);
    setTonal({
      shadows: safeDiv(shadowCount * 100, pixelCount, 0),
      midtones: safeDiv(midtoneCount * 100, pixelCount, 0),
      highlights: safeDiv(highlightCount * 100, pixelCount, 0),
    });
  }, [img, steps, brightness, contrast, blur, invert]);

  const download = () => {
    const canvas = studyCanvasRef.current;
    if (!canvas) return;
    downloadCanvasPNG(canvas, 'value-study.png');
  };

  const chartW = 320;
  const chartH = 100;
  const maxBin = histogram.length ? Math.max(1, ...histogram) : 1;

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

          <AdvancedDisclosure summary="Brightness, contrast, blur & invert">
            <RangeControl
              label="Brightness"
              value={brightness}
              onChange={setBrightness}
              min={-100}
              max={100}
              step={1}
              formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
              accent="#F7933C"
            />
            <RangeControl
              label="Contrast"
              value={contrast}
              onChange={setContrast}
              min={-50}
              max={50}
              step={1}
              formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
              accent="#F7933C"
            />
            <RangeControl
              label="Blur"
              value={blur}
              onChange={setBlur}
              min={0}
              max={5}
              step={1}
              formatValue={(v) => (v === 0 ? 'Off' : `${v}px`)}
              accent="#F7933C"
            />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  fontSize: '.8rem',
                  fontWeight: 700,
                  color: 'var(--k-text)',
                  fontFamily: "'Poppins', sans-serif",
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={invert}
                  onChange={(e) => setInvert(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#F7933C', cursor: 'pointer' }}
                />
                Invert (darks as lights)
              </label>
            </div>
          </AdvancedDisclosure>

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

          <div style={{ marginTop: '1.25rem' }}>
            <VisualizationContainer minHeight={160}>
              <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
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
                  Tonal distribution
                </div>
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  role="img"
                  aria-label="Histogram of pixel luminance from dark to light, after brightness, contrast and blur adjustments"
                >
                  {histogram.map((count, i) => {
                    const barSlot = chartW / HIST_BINS;
                    const barW = Math.max(barSlot - 1, 1);
                    const barH = (count / maxBin) * chartH;
                    return (
                      <rect
                        key={i}
                        x={i * barSlot}
                        y={chartH - barH}
                        width={barW}
                        height={barH}
                        fill="var(--k-accent)"
                      />
                    );
                  })}
                </svg>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '.35rem',
                    fontSize: '.7rem',
                    fontWeight: 700,
                    color: 'var(--k-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <span>Dark</span>
                  <span>Light</span>
                </div>
              </div>
            </VisualizationContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.25rem' }}>
            <Metric label="Shadows %" value={`${tonal.shadows.toFixed(0)}%`} sublabel="0–85 luminance" />
            <Metric label="Midtones %" value={`${tonal.midtones.toFixed(0)}%`} sublabel="86–170 luminance" />
            <Metric label="Highlights %" value={`${tonal.highlights.toFixed(0)}%`} sublabel="171–255 luminance" />
          </div>

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
              subtler gradations, closer to a full grayscale study. Brightness, contrast, blur and invert (under Advanced
              options) let you push the source before it's posterized. Everything, including the histogram below, is
              computed entirely on your device — nothing is ever uploaded.
            </Warning>
          </div>
        </>
      )}
    </div>
  );
}
