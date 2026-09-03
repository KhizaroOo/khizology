import { useMemo, useRef, useState } from 'react';
import InputField from '../shared/InputField';
import Metric from '../shared/Metric';
import Warning from '../shared/Warning';
import VisualizationContainer from '../shared/VisualizationContainer';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import { downloadSVG } from '../shared/exportHelpers';

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
  const [margin, setMargin] = useState('0');
  const [bleed, setBleed] = useState('0');

  const svgRef = useRef<SVGSVGElement>(null);

  const sW = parseFloat(sheetW) || 0;
  const sH = parseFloat(sheetH) || 0;
  const pW = parseFloat(pieceW) || 0;
  const pH = parseFloat(pieceH) || 0;
  const gap = Math.max(0, parseFloat(spacing) || 0);
  const marginVal = Math.max(0, parseFloat(margin) || 0);
  const bleedVal = Math.max(0, parseFloat(bleed) || 0);

  // Margin is dead space around the whole sheet -- pack into the sheet minus 2x margin on each axis.
  const effSheetW = Math.max(0, sW - 2 * marginVal);
  const effSheetH = Math.max(0, sH - 2 * marginVal);

  const result = useMemo(() => {
    // Bleed adds overhead to each piece's packing footprint (trimmed away later) without
    // changing the piece's own reported width x height, similar in spirit to spacing.
    const pieceWWithBleed = pW + 2 * bleedVal;
    const pieceHWithBleed = pH + 2 * bleedVal;

    const normal = nest(effSheetW, effSheetH, pieceWWithBleed, pieceHWithBleed, gap);
    const rotated = nest(effSheetW, effSheetH, pieceHWithBleed, pieceWWithBleed, gap);

    const isRotated = rotated.count > normal.count;
    const best = isRotated
      ? { cols: rotated.cols, rows: rotated.rows, count: rotated.count, pieceW: pH, pieceH: pW }
      : { cols: normal.cols, rows: normal.rows, count: normal.count, pieceW: pW, pieceH: pH };

    const footprintW = best.pieceW + 2 * bleedVal;
    const footprintH = best.pieceH + 2 * bleedVal;

    const sheetArea = sW * sH;
    // "Used" area includes each piece's own bleed footprint -- that's sheet stock nothing else can use.
    const usedArea = best.count * footprintW * footprintH;
    const wastedArea = Math.max(0, sheetArea - usedArea);
    const wastePct = sheetArea > 0 ? (wastedArea / sheetArea) * 100 : 0;
    const extraFromRotation = isRotated ? best.count - normal.count : 0;

    return { normal, rotated, best, footprintW, footprintH, isRotated, sheetArea, usedArea, wastedArea, wastePct, extraFromRotation };
  }, [sW, sH, pW, pH, gap, marginVal, bleedVal, effSheetW, effSheetH]);

  const layout = useMemo(() => {
    const scale = sW > 0 ? 340 / sW : 1;
    return { scale, svgW: sW * scale, svgH: sH * scale };
  }, [sW, sH]);

  const hasPieces = result.best.count > 0 && sW > 0 && sH > 0;

  const handleExport = () => {
    if (svgRef.current) downloadSVG(svgRef.current, 'paper-nesting-layout.svg');
  };

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <InputField label="Sheet width" value={sheetW} onChange={setSheetW} step="0.25" min="0" suffix="in" />
        <InputField label="Sheet height" value={sheetH} onChange={setSheetH} step="0.25" min="0" suffix="in" />
        <InputField label="Piece width" value={pieceW} onChange={setPieceW} step="0.25" min="0" suffix="in" />
        <InputField label="Piece height" value={pieceH} onChange={setPieceH} step="0.25" min="0" suffix="in" />
        <InputField label="Spacing between pieces" value={spacing} onChange={setSpacing} step="0.0625" min="0" suffix="in" />
      </div>

      <AdvancedDisclosure summary="Margin &amp; bleed">
        <InputField label="Sheet margin" value={margin} onChange={setMargin} step="0.125" min="0" suffix="in" />
        <InputField label="Bleed per piece" value={bleed} onChange={setBleed} step="0.0625" min="0" suffix="in" />
      </AdvancedDisclosure>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
        <h3
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: '.9rem',
            color: 'var(--k-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            margin: 0,
          }}
        >
          Nesting layout
        </h3>
        <button
          onClick={handleExport}
          disabled={!hasPieces}
          style={{
            background: hasPieces ? '#6CA6FF' : 'var(--k-bg-elevated)',
            color: hasPieces ? '#fff' : 'var(--k-text-muted)',
            border: 'none',
            padding: '.5rem 1.125rem',
            borderRadius: '.5rem',
            fontWeight: 700,
            fontSize: '.78rem',
            fontFamily: "'Poppins', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            cursor: hasPieces ? 'pointer' : 'not-allowed',
          }}
        >
          Export SVG
        </button>
      </div>

      <VisualizationContainer minHeight={280}>
        {hasPieces ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${layout.svgW} ${layout.svgH}`}
            style={{ width: '100%', maxWidth: `${layout.svgW}px`, height: 'auto', background: 'var(--k-bg-card)' }}
            role="img"
            aria-label={`Nesting layout: ${result.best.count} pieces (${result.best.cols} by ${result.best.rows} grid) on a ${sW} by ${sH} inch sheet, ${result.isRotated ? 'rotated 90 degrees' : 'normal orientation'}${marginVal > 0 ? `, ${marginVal} inch margin` : ''}${bleedVal > 0 ? `, ${bleedVal} inch bleed per piece` : ''}`}
          >
            <rect x={0} y={0} width={layout.svgW} height={layout.svgH} fill="none" stroke="var(--k-border)" strokeDasharray="6 4" strokeWidth={2} />
            {marginVal > 0 && (
              <rect
                x={marginVal * layout.scale}
                y={marginVal * layout.scale}
                width={Math.max(0, sW - 2 * marginVal) * layout.scale}
                height={Math.max(0, sH - 2 * marginVal) * layout.scale}
                fill="none"
                stroke="var(--k-text-muted)"
                strokeDasharray="4 3"
                strokeWidth={1.25}
              />
            )}
            {Array.from({ length: result.best.rows }).map((_, r) =>
              Array.from({ length: result.best.cols }).map((_, c) => {
                const cellX = marginVal + c * (result.footprintW + gap);
                const cellY = marginVal + r * (result.footprintH + gap);
                const pieceX = (cellX + bleedVal) * layout.scale;
                const pieceY = (cellY + bleedVal) * layout.scale;
                const w = result.best.pieceW * layout.scale;
                const h = result.best.pieceH * layout.scale;
                return (
                  <g key={`${r}-${c}`}>
                    {bleedVal > 0 && (
                      <rect
                        x={cellX * layout.scale}
                        y={cellY * layout.scale}
                        width={result.footprintW * layout.scale}
                        height={result.footprintH * layout.scale}
                        fill="none"
                        stroke="#6CA6FF"
                        strokeOpacity={0.35}
                        strokeDasharray="3 2"
                        strokeWidth={1}
                      />
                    )}
                    <rect
                      x={pieceX}
                      y={pieceY}
                      width={w}
                      height={h}
                      rx={2}
                      fill="#6CA6FF"
                      fillOpacity={0.35}
                      stroke="#6CA6FF"
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })
            )}
          </svg>
        ) : (
          <div style={{ color: 'var(--k-text-muted)', fontSize: '.85rem', textAlign: 'center' }}>
            No pieces fit — check that piece dimensions (plus margin and bleed) aren't larger than the sheet.
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
