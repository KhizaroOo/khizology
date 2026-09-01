import { useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

const FRAME_SIZES: [number, number][] = [
  [5, 7], [8, 10], [11, 14], [16, 20], [18, 24], [24, 36],
];

export default function FrameFitFinder() {
  const [artW, setArtW] = useState('8');
  const [artH, setArtH] = useState('10');
  const [matWidth, setMatWidth] = useState('2');
  const [frameIdx, setFrameIdx] = useState(1);

  const aw = parseFloat(artW) || 1;
  const ah = parseFloat(artH) || 1;
  const mat = parseFloat(matWidth) || 0;
  const [fw, fh] = FRAME_SIZES[frameIdx];
  const openingW = fw - 2 * mat;
  const openingH = fh - 2 * mat;

  const artRatio = aw / ah;
  const openingRatio = openingW / openingH;
  const fitScale = Math.min(openingW / aw, openingH / ah);
  const displayedW = aw * fitScale;
  const displayedH = ah * fitScale;
  const gapW = openingW - displayedW;
  const gapH = openingH - displayedH;

  const ratioDiff = Math.abs(artRatio - openingRatio) / openingRatio;

  const px = 300 / fw;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Artwork width" value={artW} onChange={setArtW} step="0.5" min="1" suffix="in" />
        <InputField label="Artwork height" value={artH} onChange={setArtH} step="0.5" min="1" suffix="in" />
        <InputField label="Mat width" value={matWidth} onChange={setMatWidth} step="0.25" min="0" suffix="in" />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: 'var(--k-text-muted)', marginBottom: '.5rem', fontFamily: "'Poppins', sans-serif", textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Candidate frame size
        </label>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {FRAME_SIZES.map(([w, h], i) => (
            <button
              key={`${w}x${h}`}
              onClick={() => setFrameIdx(i)}
              style={{
                background: frameIdx === i ? '#6CA6FF' : 'transparent',
                color: frameIdx === i ? '#fff' : 'var(--k-text-muted)',
                border: '1px solid ' + (frameIdx === i ? '#6CA6FF' : 'var(--k-border)'),
                padding: '.5rem 1rem', borderRadius: '.5rem', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
              }}
            >
              {w}×{h}"
            </button>
          ))}
        </div>
      </div>

      <VisualizationContainer minHeight={fh * px + 40}>
        <svg viewBox={`0 0 ${fw * px} ${fh * px}`} style={{ width: '100%', maxWidth: `${fw * px}px`, height: 'auto' }} role="img" aria-label={`Your artwork placed inside a ${fw} by ${fh} inch frame`}>
          <rect x={0} y={0} width={fw * px} height={fh * px} fill="#e8dcc8" stroke="#8b6f47" strokeWidth={4} />
          <rect x={mat * px} y={mat * px} width={openingW * px} height={openingH * px} fill="var(--k-bg-card)" stroke="var(--k-border)" strokeWidth={1} />
          <rect
            x={(mat + gapW / 2) * px}
            y={(mat + gapH / 2) * px}
            width={displayedW * px}
            height={displayedH * px}
            fill="#F5CF5C"
            stroke="#e0b93a"
            strokeWidth={2}
          />
        </svg>
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Mat opening needed" value={`${openingW.toFixed(1)}" × ${openingH.toFixed(1)}"`} />
        <Metric label="Artwork as displayed" value={`${displayedW.toFixed(1)}" × ${displayedH.toFixed(1)}"`} />
        <Metric label="Fit quality" value={ratioDiff < 0.03 ? 'Exact' : ratioDiff < 0.15 ? 'Close' : 'Loose'} color={ratioDiff < 0.03 ? '#22c55e' : ratioDiff < 0.15 ? '#F7933C' : '#ef4444'} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {ratioDiff < 0.03 ? (
          <Warning level="good" title={`Your artwork fits the ${fw}×${fh}" opening almost exactly`} />
        ) : (
          <Warning level="warn" title="Proportions don't quite match — expect visible matting on two sides">
            Your artwork is {artRatio > openingRatio ? 'wider' : 'taller'} relative to this opening than the frame is, so it'll be centered with extra {artRatio > openingRatio ? 'top/bottom' : 'left/right'} mat space rather than filling the whole opening. Try a different frame size, or crop the artwork to {(openingRatio).toFixed(2)}:1.
          </Warning>
        )}
      </div>
    </div>
  );
}
