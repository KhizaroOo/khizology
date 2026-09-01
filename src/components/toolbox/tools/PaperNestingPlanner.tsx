import { useMemo, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';

interface NestResult {
  cols: number;
  rows: number;
  count: number;
}

function nest(sheetW: number, sheetH: number, pieceW: number, pieceH: number, spacing: number): NestResult {
  if (pieceW <= 0 || pieceH <= 0) return { cols: 0, rows: 0, count: 0 };
  const cols = Math.max(0, Math.floor((sheetW + spacing) / (pieceW + spacing)));
  const rows = Math.max(0, Math.floor((sheetH + spacing) / (pieceH + spacing)));
  return { cols, rows, count: cols * rows };
}

export default function PaperNestingPlanner() {
  const [sheetW, setSheetW] = useState('17');
  const [sheetH, setSheetH] = useState('11');
  const [pieceW, setPieceW] = useState('4');
  const [pieceH, setPieceH] = useState('6');
  const [spacing, setSpacing] = useState('0.25');

  const sW = parseFloat(sheetW) || 0;
  const sH = parseFloat(sheetH) || 0;
  const pW = parseFloat(pieceW) || 0;
  const pH = parseFloat(pieceH) || 0;
  const gap = Math.max(0, parseFloat(spacing) || 0);

  const result = useMemo(() => {
    const normal = nest(sW, sH, pW, pH, gap);
    const rotated = nest(sW, sH, pH, pW, gap);

    const isRotated = rotated.count > normal.count;
    const best = isRotated
      ? { cols: rotated.cols, rows: rotated.rows, count: rotated.count, pieceW: pH, pieceH: pW }
      : { cols: normal.cols, rows: normal.rows, count: normal.count, pieceW: pW, pieceH: pH };

    const sheetArea = sW * sH;
    const usedArea = best.count * pW * pH;
    const wastedArea = Math.max(0, sheetArea - usedArea);
    const wastePct = sheetArea > 0 ? (wastedArea / sheetArea) * 100 : 0;
    const extraFromRotation = isRotated ? best.count - normal.count : 0;

    return { normal, rotated, best, isRotated, sheetArea, usedArea, wastedArea, wastePct, extraFromRotation };
  }, [sW, sH, pW, pH, gap]);

  const layout = useMemo(() => {
    const scale = sW > 0 ? 340 / sW : 1;
    return { scale, svgW: sW * scale, svgH: sH * scale };
  }, [sW, sH]);

  const hasPieces = result.best.count > 0 && sW > 0 && sH > 0;

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <InputField label="Sheet width" value={sheetW} onChange={setSheetW} step="0.25" min="0" suffix="in" />
        <InputField label="Sheet height" value={sheetH} onChange={setSheetH} step="0.25" min="0" suffix="in" />
        <InputField label="Piece width" value={pieceW} onChange={setPieceW} step="0.25" min="0" suffix="in" />
        <InputField label="Piece height" value={pieceH} onChange={setPieceH} step="0.25" min="0" suffix="in" />
        <InputField label="Spacing between pieces" value={spacing} onChange={setSpacing} step="0.0625" min="0" suffix="in" />
      </div>

      <VisualizationContainer minHeight={280}>
        {hasPieces ? (
          <svg
            viewBox={`0 0 ${layout.svgW} ${layout.svgH}`}
            style={{ width: '100%', maxWidth: `${layout.svgW}px`, height: 'auto', background: 'var(--k-bg-card)' }}
            role="img"
            aria-label={`Nesting layout: ${result.best.count} pieces (${result.best.cols} by ${result.best.rows} grid) on a ${sW} by ${sH} inch sheet, ${result.isRotated ? 'rotated 90 degrees' : 'normal orientation'}`}
          >
            <rect x={0} y={0} width={layout.svgW} height={layout.svgH} fill="none" stroke="var(--k-border)" strokeDasharray="6 4" strokeWidth={2} />
            {Array.from({ length: result.best.rows }).map((_, r) =>
              Array.from({ length: result.best.cols }).map((_, c) => {
                const x = c * (result.best.pieceW + gap) * layout.scale;
                const y = r * (result.best.pieceH + gap) * layout.scale;
                const w = result.best.pieceW * layout.scale;
                const h = result.best.pieceH * layout.scale;
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={2}
                    fill="#6CA6FF"
                    fillOpacity={0.35}
                    stroke="#6CA6FF"
                    strokeWidth={1.5}
                  />
                );
              })
            )}
          </svg>
        ) : (
          <div style={{ color: 'var(--k-text-muted)', fontSize: '.85rem', textAlign: 'center' }}>
            No pieces fit — check that piece dimensions aren't larger than the sheet.
          </div>
        )}
      </VisualizationContainer>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginTop: '1.5rem' }}>
        <Metric label="Pieces per sheet" value={String(result.best.count)} color="#6CA6FF" sublabel={`${result.best.cols} × ${result.best.rows} grid`} />
        <Metric label="Orientation" value={result.isRotated ? 'Rotated 90°' : 'Normal'} />
        <Metric label="Wasted area" value={`${result.wastePct.toFixed(0)}%`} sublabel={`${result.wastedArea.toFixed(1)} in² of ${result.sheetArea.toFixed(1)} in²`} />
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {result.isRotated ? (
          <Warning level="info" title={`Rotating each piece 90° fits ${result.extraFromRotation} more per sheet than the unrotated layout.`}>
            The normal orientation only manages {result.normal.count} pieces ({result.normal.cols} × {result.normal.rows}) — turning every piece sideways
            squeezes in {result.best.count} instead.
          </Warning>
        ) : (
          <Warning level={result.wastePct <= 25 ? 'good' : 'info'} title={`This grid layout wastes about ${result.wastePct.toFixed(0)}% of the sheet.`}>
            That's a simple row-and-column grid, not a true nesting or bin-packing optimizer — irregular offsets, mixed rotations, or angled arrangements
            could still squeeze out more pieces in the real world.
          </Warning>
        )}
      </div>
    </div>
  );
}
