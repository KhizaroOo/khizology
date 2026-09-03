import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import { safeNumber, clamp, safeDiv } from '../shared/mathHelpers';

const FRAME_SIZES: [number, number][] = [
  [5, 7], [8, 10], [11, 14], [16, 20], [18, 24], [24, 36],
];

type FitLabel = 'Exact' | 'Close' | 'Loose';
type CropDim = 'width' | 'height' | 'none';

interface FrameEval {
  idx: number;
  fw: number;
  fh: number;
  openingW: number;
  openingH: number;
  valid: boolean;
  artRatio: number;
  openingRatio: number;
  ratioDiff: number;
  fitLabel: FitLabel;
  fitColor: string;
  displayedW: number;
  displayedH: number;
  gapW: number;
  gapH: number;
  cropDimension: CropDim;
  /** Crop % that WOULD apply if crop were allowed — used for messaging even while the toggle is off. */
  rawCropPercent: number;
  /** Crop % actually in effect right now (0 whenever "Crop allowed" is off). */
  cropPercent: number;
  coverScale: number;
  fullW: number;
  fullH: number;
}

/** Evaluates how one candidate frame size fits the artwork, with or without cropping allowed. */
function evaluateFrame(fw: number, fh: number, aw: number, ah: number, mat: number, cropAllowed: boolean, idx: number): FrameEval {
  const openingWRaw = fw - 2 * mat;
  const openingHRaw = fh - 2 * mat;
  const valid = openingWRaw > 0.01 && openingHRaw > 0.01;
  const openingW = clamp(openingWRaw, 0.05, fw);
  const openingH = clamp(openingHRaw, 0.05, fh);

  const artRatio = safeDiv(aw, ah, 1);
  const openingRatio = safeDiv(openingW, openingH, 1);
  const ratioDiff = safeDiv(Math.abs(artRatio - openingRatio), openingRatio, 0);

  const fitLabel: FitLabel = ratioDiff < 0.03 ? 'Exact' : ratioDiff < 0.15 ? 'Close' : 'Loose';
  const fitColor = fitLabel === 'Exact' ? '#22c55e' : fitLabel === 'Close' ? '#F7933C' : '#ef4444';

  // Contain-fit (no crop): whole artwork visible, centered, mat gap on two sides where proportions mismatch.
  const containScale = Math.min(safeDiv(openingW, aw, 1), safeDiv(openingH, ah, 1));
  const displayedW = aw * containScale;
  const displayedH = ah * containScale;
  const gapW = Math.max(0, openingW - displayedW);
  const gapH = Math.max(0, openingH - displayedH);

  // Which dimension would need trimming to fill the opening edge-to-edge, and by how much.
  let cropDimension: CropDim = 'none';
  let rawCropPercent = 0;
  if (artRatio > openingRatio) {
    cropDimension = 'width';
    rawCropPercent = clamp((1 - safeDiv(openingRatio, artRatio, 1)) * 100, 0, 100);
  } else if (artRatio < openingRatio) {
    cropDimension = 'height';
    rawCropPercent = clamp((1 - safeDiv(artRatio, openingRatio, 1)) * 100, 0, 100);
  }

  // Cover-fit (crop mode): scale so the artwork fully covers the opening, then trim the overflow.
  const coverScale = Math.max(safeDiv(openingW, aw, 1), safeDiv(openingH, ah, 1));
  const fullW = aw * coverScale;
  const fullH = ah * coverScale;

  const cropPercent = cropAllowed ? rawCropPercent : 0;

  return {
    idx, fw, fh, openingW, openingH, valid, artRatio, openingRatio, ratioDiff, fitLabel, fitColor,
    displayedW, displayedH, gapW, gapH, cropDimension, rawCropPercent, cropPercent, coverScale, fullW, fullH,
  };
}

export default function FrameFitFinder() {
  const [artW, setArtW] = useState('8');
  const [artH, setArtH] = useState('10');
  const [matWidth, setMatWidth] = useState('2');
  const [frameIdx, setFrameIdx] = useState(1);
  const [cropAllowed, setCropAllowed] = useState(false);

  const aw = clamp(safeNumber(artW, 8), 0.1, 999);
  const ah = clamp(safeNumber(artH, 10), 0.1, 999);
  const mat = clamp(safeNumber(matWidth, 0), 0, 999);

  const frames = useMemo(
    () => FRAME_SIZES.map(([fw, fh], i) => evaluateFrame(fw, fh, aw, ah, mat, cropAllowed, i)),
    [aw, ah, mat, cropAllowed]
  );

  const rankedFrames = useMemo(
    () =>
      [...frames].sort((a, b) => {
        if (a.valid !== b.valid) return a.valid ? -1 : 1;
        return a.ratioDiff - b.ratioDiff;
      }),
    [frames]
  );

  const selected = frames[frameIdx] ?? frames[0];
  const { fw, fh, openingW, openingH, displayedW, displayedH, gapW, gapH, artRatio, openingRatio, ratioDiff, fullW, fullH } = selected;

  const px = 300 / fw;
  // Center the opening (and everything inside it) within the frame — safe even when the mat is
  // degenerate, rather than trusting a raw mat*px offset that could push the opening off-canvas.
  const openingX = (fw * px - openingW * px) / 2;
  const openingY = (fh * px - openingH * px) / 2;
  const artX = openingX + (gapW * px) / 2;
  const artY = openingY + (gapH * px) / 2;
  const bleedX = openingX - ((fullW - openingW) * px) / 2;
  const bleedY = openingY - ((fullH - openingH) * px) / 2;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Artwork width" value={artW} onChange={setArtW} step="0.5" min="0.1" suffix="in" />
        <InputField label="Artwork height" value={artH} onChange={setArtH} step="0.5" min="0.1" suffix="in" />
        <InputField label="Mat width" value={matWidth} onChange={setMatWidth} step="0.25" min="0" suffix="in" />
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.5rem',
          fontSize: '.85rem',
          fontWeight: 700,
          color: 'var(--k-text)',
          cursor: 'pointer',
          fontFamily: "'Poppins', sans-serif",
          marginBottom: '1.5rem',
        }}
      >
        <input
          type="checkbox"
          checked={cropAllowed}
          onChange={(e) => setCropAllowed(e.target.checked)}
          style={{ width: '16px', height: '16px', accentColor: '#6CA6FF', cursor: 'pointer' }}
        />
        Crop allowed — fill the opening edge-to-edge instead of matting the gap
      </label>

      <div style={{ marginBottom: '.5rem' }}>
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
          Frame sizes — ranked by fit
        </label>
        <div style={{ fontSize: '.72rem', color: 'var(--k-text-muted)', marginBottom: '.6rem' }}>
          Planning estimates, not exact cut specs — actual mat-cutting tolerances vary by framer.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.5rem' }}>
        {rankedFrames.map((f, rank) => {
          const isSelected = frameIdx === f.idx;
          const cropText = !cropAllowed
            ? '0% — matted'
            : f.cropDimension === 'none'
            ? '0% — exact fit'
            : `${f.rawCropPercent.toFixed(0)}% crop (${f.cropDimension})`;
          return (
            <button
              key={`${f.fw}x${f.fh}`}
              onClick={() => setFrameIdx(f.idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                rowGap: '.25rem',
                columnGap: '.75rem',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                background: isSelected ? 'color-mix(in srgb, #6CA6FF 14%, var(--k-bg))' : 'var(--k-bg)',
                border: '1.5px solid ' + (isSelected ? '#6CA6FF' : 'var(--k-border)'),
                borderRadius: '.625rem',
                padding: '.625rem .875rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: '90px' }}>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--k-text)' }}>
                  {f.fw}×{f.fh}"
                </span>
                {rank === 0 && f.valid && (
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '.62rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      color: '#22c55e',
                      background: 'color-mix(in srgb, #22c55e 14%, transparent)',
                      padding: '.15rem .4rem',
                      borderRadius: '.3rem',
                    }}
                  >
                    Best fit
                  </span>
                )}
              </span>
              {f.valid ? (
                <>
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700,
                      fontSize: '.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      color: f.fitColor,
                      minWidth: '55px',
                    }}
                  >
                    {f.fitLabel}
                  </span>
                  <span style={{ fontSize: '.8rem', color: 'var(--k-text-muted)', fontFamily: "'Mulish', sans-serif" }}>{cropText}</span>
                </>
              ) : (
                <span style={{ fontSize: '.78rem', color: '#ef4444', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                  Mat too wide for this frame
                </span>
              )}
            </button>
          );
        })}
      </div>

      <VisualizationContainer minHeight={fh * px + 40}>
        <svg
          viewBox={`0 0 ${fw * px} ${fh * px}`}
          style={{ width: '100%', maxWidth: `${fw * px}px`, height: 'auto' }}
          role="img"
          aria-label={
            cropAllowed
              ? `Your artwork cropped to fill a ${fw} by ${fh} inch frame's opening, with a dashed outline showing what gets trimmed`
              : `Your artwork placed inside a ${fw} by ${fh} inch frame`
          }
        >
          <rect x={0} y={0} width={fw * px} height={fh * px} fill="#e8dcc8" stroke="#8b6f47" strokeWidth={4} />
          <rect x={openingX} y={openingY} width={openingW * px} height={openingH * px} fill="var(--k-bg-card)" stroke="var(--k-border)" strokeWidth={1} />

          {cropAllowed ? (
            <>
              <rect x={openingX} y={openingY} width={openingW * px} height={openingH * px} fill="#F5CF5C" />
              <rect
                x={bleedX}
                y={bleedY}
                width={fullW * px}
                height={fullH * px}
                fill="none"
                stroke="#e0b93a"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            </>
          ) : (
            <rect x={artX} y={artY} width={displayedW * px} height={displayedH * px} fill="#F5CF5C" stroke="#e0b93a" strokeWidth={2} />
          )}
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Mat opening needed" value={`${openingW.toFixed(1)}" × ${openingH.toFixed(1)}"`} />
        <Metric
          label="Artwork as displayed"
          value={cropAllowed ? `${openingW.toFixed(1)}" × ${openingH.toFixed(1)}"` : `${displayedW.toFixed(1)}" × ${displayedH.toFixed(1)}"`}
          sublabel={cropAllowed ? 'cropped to fill the opening' : undefined}
        />
        <Metric label="Fit quality" value={selected.fitLabel} color={selected.fitColor} />
        <Metric
          label="Crop needed"
          value={!cropAllowed ? '0% — matted' : selected.cropDimension === 'none' ? '0% — exact fit' : `${selected.rawCropPercent.toFixed(0)}%`}
          color={cropAllowed && selected.cropDimension !== 'none' ? '#F7933C' : '#22c55e'}
          sublabel={cropAllowed && selected.cropDimension !== 'none' ? `trimmed from ${selected.cropDimension}` : undefined}
        />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {!selected.valid ? (
          <Warning level="danger" title={`A ${mat}" mat leaves no usable opening in a ${fw}×${fh}" frame`}>
            Reduce the mat width or pick a larger frame from the list above — right now the mat alone is as wide as (or wider than) the frame.
          </Warning>
        ) : ratioDiff < 0.03 ? (
          <Warning level="good" title={`Your artwork fits the ${fw}×${fh}" opening almost exactly`}>
            {cropAllowed ? 'Crop allowed is on, but there\'s almost nothing to trim — proportions already line up.' : undefined}
          </Warning>
        ) : cropAllowed ? (
          <Warning
            level="warn"
            title={`Filling this opening edge-to-edge trims about ${selected.rawCropPercent.toFixed(0)}% off the ${selected.cropDimension}`}
          >
            Your artwork's proportions don't match this opening, so covering it completely means cutting into the{' '}
            {selected.cropDimension === 'width' ? 'left and right edges' : 'top and bottom edges'}. Turn off "Crop allowed" to keep the full
            image instead, matted with a gap on two sides.
          </Warning>
        ) : (
          <Warning level="warn" title="Proportions don't quite match — expect visible matting on two sides">
            Your artwork is {artRatio > openingRatio ? 'wider' : 'taller'} relative to this opening than the frame is, so it'll be centered with
            extra {artRatio > openingRatio ? 'top/bottom' : 'left/right'} mat space rather than filling the whole opening. Try a different frame
            size above, or turn on "Crop allowed" to fill it completely by trimming about {selected.rawCropPercent.toFixed(0)}% off the{' '}
            {selected.cropDimension}.
          </Warning>
        )}
      </div>
    </div>
  );
}
