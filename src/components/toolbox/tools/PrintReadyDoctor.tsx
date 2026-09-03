import { useMemo, useState } from 'react';
import Warning from '../shared/Warning';
import Metric from '../shared/Metric';
import Insight from '../shared/Insight';
import PresetBar from '../shared/PresetBar';
import AdvancedDisclosure from '../shared/AdvancedDisclosure';
import VisualizationContainer from '../shared/VisualizationContainer';
import InputField from '../shared/InputField';
import { loadImageFromFile, type LoadedImage } from '../shared/loadImage';
import { safeDiv, safeNumber, clamp, formatNumber } from '../shared/mathHelpers';
import { useLocalPref } from '../shared/useLocalPref';

type Unit = 'in' | 'mm' | 'cm' | 'px';
type Orientation = 'portrait' | 'landscape';
type ViewingKey = 'hand' | 'wall' | 'room';

const UNIT_PER_INCH: Record<Unit, number> = { in: 1, mm: 25.4, cm: 2.54, px: 96 };
const UNIT_LABEL: Record<Unit, string> = { in: 'in', mm: 'mm', cm: 'cm', px: 'px' };
const UNITS: Unit[] = ['in', 'mm', 'cm', 'px'];

function inToUnit(valueIn: number, unit: Unit): number {
  return valueIn * UNIT_PER_INCH[unit];
}
function unitToIn(value: number, unit: Unit): number {
  return safeDiv(value, UNIT_PER_INCH[unit], 0);
}
function unitDecimals(unit: Unit): number {
  if (unit === 'px' || unit === 'mm') return 0;
  if (unit === 'cm') return 1;
  return 2;
}

interface SizePreset {
  label: string;
  shortIn: number; // shorter side, inches
  longIn: number; // longer side, inches
}

const BUSINESS_CARD_LABEL = 'Business card (3.5×2")';
const CUSTOM_LABEL = 'Custom';

const SIZE_PRESETS: SizePreset[] = [
  { label: 'A5', shortIn: 148 / 25.4, longIn: 210 / 25.4 },
  { label: 'A4', shortIn: 210 / 25.4, longIn: 297 / 25.4 },
  { label: 'A3', shortIn: 297 / 25.4, longIn: 420 / 25.4 },
  { label: 'A2', shortIn: 420 / 25.4, longIn: 594 / 25.4 },
  { label: 'A1', shortIn: 594 / 25.4, longIn: 841 / 25.4 },
  { label: 'Art print (16×20")', shortIn: 16, longIn: 20 },
  { label: 'Poster (18×24")', shortIn: 18, longIn: 24 },
  { label: BUSINESS_CARD_LABEL, shortIn: 2, longIn: 3.5 },
];

// null values entry marks the "Custom" pill for PresetBar
const PRESET_ENTRIES: { label: string; values: SizePreset | null }[] = [
  ...SIZE_PRESETS.map((p) => ({ label: p.label, values: p })),
  { label: CUSTOM_LABEL, values: null },
];

const VIEWING_DISTANCES: { key: ViewingKey; label: string; multiplier: number }[] = [
  { key: 'hand', label: 'Held in hand', multiplier: 1 },
  { key: 'wall', label: 'Wall art, viewed up close', multiplier: 0.66 },
  { key: 'room', label: 'Poster, across a room', multiplier: 0.33 },
];

const BASE_THRESHOLDS = { excellent: 300, good: 200, acceptable: 150 };
const SAFE_AREA_IN = 0.25;
const PRINT_FRIENDLY_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function rate(ppi: number, multiplier: number): { label: string; color: string } {
  const excellent = BASE_THRESHOLDS.excellent * multiplier;
  const good = BASE_THRESHOLDS.good * multiplier;
  const acceptable = BASE_THRESHOLDS.acceptable * multiplier;
  if (ppi >= excellent) return { label: 'Excellent', color: '#22c55e' };
  if (ppi >= good) return { label: 'Good', color: '#6CA6FF' };
  if (ppi >= acceptable) return { label: 'Acceptable', color: '#F7933C' };
  return { label: 'Poor', color: '#ef4444' };
}

interface SizeRow {
  key: string;
  label: string;
  wIn: number;
  hIn: number;
  ppi: number;
  isActive: boolean;
}

function labelStyle(): React.CSSProperties {
  return {
    display: 'block',
    fontSize: '.8rem',
    fontWeight: 700,
    color: 'var(--k-text-muted)',
    marginBottom: '.5rem',
    fontFamily: "'Poppins', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '.06em',
  };
}

function pillGroup<K extends string>(
  options: { key: K; label: string }[],
  active: K,
  onSelect: (key: K) => void,
  accent: string
) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
      {options.map((o) => {
        const isActive = o.key === active;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect(o.key)}
            style={{
              padding: '.4rem .75rem',
              borderRadius: '.5rem',
              border: `1.5px solid ${isActive ? accent : 'var(--k-border)'}`,
              background: isActive ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'var(--k-bg)',
              color: isActive ? accent : 'var(--k-text-muted)',
              fontSize: '.78rem',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PrintReadyDoctor() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [presetLabel, setPresetLabel] = useState<string>('A4');
  const [customWIn, setCustomWIn] = useState(8.5);
  const [customHIn, setCustomHIn] = useState(11);
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [unit, setUnit] = useLocalPref<Unit>('printReadyDoctor.unit', 'in');
  const [viewingKey, setViewingKey] = useState<ViewingKey>('hand');
  const [bleedIn, setBleedIn] = useState(0);

  const handleFile = async (file: File) => {
    try {
      const loaded = await loadImageFromFile(file);
      if (!loaded.width || !loaded.height) {
        setError("This file loaded but reports 0×0 pixels — it may be corrupted or an unsupported image variant.");
        setImg(null);
        return;
      }
      setImg(loaded);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setImg(null);
    }
  };

  const activePreset = presetLabel === CUSTOM_LABEL ? null : SIZE_PRESETS.find((p) => p.label === presetLabel) ?? null;

  const target = useMemo(() => {
    if (activePreset) {
      const wIn = orientation === 'landscape' ? activePreset.longIn : activePreset.shortIn;
      const hIn = orientation === 'landscape' ? activePreset.shortIn : activePreset.longIn;
      return { wIn, hIn };
    }
    return { wIn: Math.max(customWIn, 0.05), hIn: Math.max(customHIn, 0.05) };
  }, [activePreset, orientation, customWIn, customHIn]);

  const viewingMultiplier = VIEWING_DISTANCES.find((v) => v.key === viewingKey)?.multiplier ?? 1;

  const targetPpi = img ? Math.min(safeDiv(img.width, target.wIn, 0), safeDiv(img.height, target.hIn, 0)) : 0;
  const targetRating = rate(targetPpi, viewingMultiplier);

  const sizeRows = useMemo<SizeRow[]>(() => {
    if (!img) return [];
    const rows: SizeRow[] = SIZE_PRESETS.map((p) => {
      const wIn = orientation === 'landscape' ? p.longIn : p.shortIn;
      const hIn = orientation === 'landscape' ? p.shortIn : p.longIn;
      return {
        key: p.label,
        label: p.label,
        wIn,
        hIn,
        ppi: Math.min(safeDiv(img.width, wIn, 0), safeDiv(img.height, hIn, 0)),
        isActive: activePreset?.label === p.label,
      };
    });
    if (!activePreset) {
      rows.push({ key: 'custom', label: 'Custom (your size)', wIn: target.wIn, hIn: target.hIn, ppi: targetPpi, isActive: true });
    }
    return rows.sort((a, b) => a.wIn * a.hIn - b.wIn * b.hIn);
  }, [img, orientation, activePreset, target, targetPpi]);

  const maxBarScale = Math.max(BASE_THRESHOLDS.excellent * viewingMultiplier * 1.2, ...sizeRows.map((r) => r.ppi), 1);

  const bestAt300 = img
    ? { wIn: safeDiv(img.width, 300, 0), hIn: safeDiv(img.height, 300, 0) }
    : { wIn: 0, hIn: 0 };

  const cropCheck = useMemo(() => {
    if (!img || target.wIn <= 0 || target.hIn <= 0 || img.width <= 0 || img.height <= 0) return null;
    const imgRatio = safeDiv(img.width, img.height, 0);
    const targetRatio = safeDiv(target.wIn, target.hIn, 0);
    if (imgRatio <= 0 || targetRatio <= 0) return null;
    if (imgRatio > targetRatio) {
      const keepWidth = img.height * targetRatio;
      const percent = clamp(safeDiv(img.width - keepWidth, img.width, 0) * 100, 0, 100);
      return { percent, axis: 'width' as const };
    }
    if (imgRatio < targetRatio) {
      const keepHeight = safeDiv(img.width, targetRatio, img.height);
      const percent = clamp(safeDiv(img.height - keepHeight, img.height, 0) * 100, 0, 100);
      return { percent, axis: 'height' as const };
    }
    return { percent: 0, axis: 'width' as const };
  }, [img, target]);

  const formatOk = img ? PRINT_FRIENDLY_TYPES.includes(img.mimeType) : true;

  // top-line verdict: the largest preset size that still clears "Good", and what happens beyond it
  const insight = useMemo(() => {
    if (!img || sizeRows.length === 0) return null;
    const goodOrBetter = sizeRows.filter((r) => r.ppi >= BASE_THRESHOLDS.good * viewingMultiplier);
    const readyUpTo = goodOrBetter.length ? goodOrBetter[goodOrBetter.length - 1] : null;
    const nextDrop = readyUpTo ? sizeRows.find((r) => r.wIn * r.hIn > readyUpTo.wIn * readyUpTo.hIn) : sizeRows[0];
    if (readyUpTo) {
      return {
        what: (
          <>This image is print-ready (Good or better) up to <strong>{readyUpTo.label}</strong> at {formatNumber(readyUpTo.ppi, 0)} PPI.</>
        ),
        why: nextDrop
          ? <>At {nextDrop.label} it drops to {formatNumber(nextDrop.ppi, 0)} PPI — rated {rate(nextDrop.ppi, viewingMultiplier).label.toLowerCase()}.</>
          : <>Every larger size in the table stays at Good or better too.</>,
        tip: nextDrop ? <>Use a higher-resolution source file for anything larger than {readyUpTo.label}.</> : <>You have plenty of resolution to spare at every size checked here.</>,
      };
    }
    const smallest = sizeRows[0];
    return {
      what: <>This image doesn't reach "Good" print quality at any size in this table — even {smallest.label} comes in at {formatNumber(smallest.ppi, 0)} PPI ({rate(smallest.ppi, viewingMultiplier).label}).</>,
      why: <>The source file is {img.width}×{img.height}px, which spreads thin once it's stretched across a physical print.</>,
      tip: <>Pick a smaller print size, choose "Poster, across a room" viewing distance if that matches how it'll be seen, or source a higher-resolution file.</>,
    };
  }, [img, sizeRows, viewingMultiplier]);

  const fullW = Math.max(target.wIn + 2 * bleedIn, 0.1);
  const fullH = Math.max(target.hIn + 2 * bleedIn, 0.1);
  const previewScale = 240 / Math.max(fullW, fullH);
  const safeW = Math.max(target.wIn - 2 * SAFE_AREA_IN, 0);
  const safeH = Math.max(target.hIn - 2 * SAFE_AREA_IN, 0);

  return (
    <div style={{ background: 'var(--k-bg-card)', border: '1px solid var(--k-border)', borderRadius: '1rem', padding: '1.5rem' }}>
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--k-text)', marginTop: 0, marginBottom: '1rem' }}>
        Upload your image
      </h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ fontSize: '.85rem', color: 'var(--k-text)', marginBottom: '1.25rem' }}
      />

      {error && <Warning level="danger" title="Couldn't read this file">{error}</Warning>}

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle()}>Target print size</label>
        <PresetBar<SizePreset | null>
          presets={PRESET_ENTRIES}
          activeLabel={presetLabel}
          onSelect={(_values, label) => {
            setPresetLabel(label);
            setOrientation(label === BUSINESS_CARD_LABEL ? 'landscape' : 'portrait');
          }}
        />
        {!activePreset && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '.75rem', maxWidth: '360px' }}>
            <InputField
              label={`Width (${UNIT_LABEL[unit]})`}
              value={formatNumber(inToUnit(customWIn, unit), unitDecimals(unit))}
              onChange={(v) => setCustomWIn(Math.max(unitToIn(safeNumber(v, 0), unit), 0.05))}
              step="0.1"
              min="0"
            />
            <InputField
              label={`Height (${UNIT_LABEL[unit]})`}
              value={formatNumber(inToUnit(customHIn, unit), unitDecimals(unit))}
              onChange={(v) => setCustomHIn(Math.max(unitToIn(safeNumber(v, 0), unit), 0.05))}
              step="0.1"
              min="0"
            />
          </div>
        )}
      </div>

      {img && (
        <>
          {insight && <div style={{ marginBottom: '1.5rem' }}><Insight what={insight.what} why={insight.why} tip={insight.tip} /></div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
            <Metric label="Image size" value={`${img.width} × ${img.height}px`} />
            <Metric
              label={`PPI at ${activePreset ? activePreset.label : 'custom size'}`}
              value={formatNumber(targetPpi, 0)}
              color={targetRating.color}
              sublabel={targetRating.label}
            />
            <Metric
              label="Best size at 300 PPI"
              value={`${formatNumber(inToUnit(bestAt300.wIn, unit), unitDecimals(unit))} × ${formatNumber(inToUnit(bestAt300.hIn, unit), unitDecimals(unit))} ${UNIT_LABEL[unit]}`}
              sublabel="Estimate — distance, printer & paper matter too"
            />
            <Metric label="Format" value={img.mimeType.split('/')[1]?.toUpperCase() ?? 'unknown'} color={formatOk ? '#22c55e' : '#F7933C'} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle()}>Print-size quality table</label>
            <VisualizationContainer minHeight={0}>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem', fontFamily: "'Mulish', sans-serif", minWidth: '420px' }}>
                  <thead>
                    <tr>
                      {['Size', `Dimensions (${UNIT_LABEL[unit]})`, 'Effective PPI', 'Rating'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '.5rem .6rem',
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: 700,
                            fontSize: '.68rem',
                            textTransform: 'uppercase',
                            letterSpacing: '.05em',
                            color: 'var(--k-text-muted)',
                            borderBottom: '1.5px solid var(--k-border)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((row) => {
                      const r = rate(row.ppi, viewingMultiplier);
                      return (
                        <tr key={row.key} style={{ background: row.isActive ? 'color-mix(in srgb, #F7933C 12%, transparent)' : 'transparent' }}>
                          <td style={{ padding: '.5rem .6rem', fontWeight: row.isActive ? 800 : 600, color: 'var(--k-text)', borderBottom: '1px solid var(--k-border)', whiteSpace: 'nowrap' }}>
                            {row.label}{row.isActive ? ' ←' : ''}
                          </td>
                          <td style={{ padding: '.5rem .6rem', color: 'var(--k-text-muted)', borderBottom: '1px solid var(--k-border)', whiteSpace: 'nowrap' }}>
                            {formatNumber(inToUnit(row.wIn, unit), unitDecimals(unit))} × {formatNumber(inToUnit(row.hIn, unit), unitDecimals(unit))}
                          </td>
                          <td style={{ padding: '.5rem .6rem', borderBottom: '1px solid var(--k-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: '120px' }}>
                              <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--k-bg)', overflow: 'hidden' }}>
                                <div style={{ width: `${clamp(safeDiv(row.ppi, maxBarScale, 0) * 100, 0, 100)}%`, height: '100%', background: r.color, borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: 'var(--k-text)', minWidth: '32px', textAlign: 'right' }}>
                                {formatNumber(row.ppi, 0)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '.5rem .6rem', borderBottom: '1px solid var(--k-border)', color: r.color, fontWeight: 700, fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' }}>
                            {r.label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </VisualizationContainer>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle()}>Bleed &amp; safe-area preview</label>
            <VisualizationContainer minHeight={280}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', width: '100%' }}>
                <svg
                  viewBox={`0 0 ${fullW * previewScale} ${fullH * previewScale}`}
                  style={{ width: '100%', maxWidth: `${fullW * previewScale}px`, height: 'auto' }}
                  role="img"
                  aria-label={`Trim, bleed and safe-area preview for a ${formatNumber(inToUnit(target.wIn, unit), unitDecimals(unit))} by ${formatNumber(inToUnit(target.hIn, unit), unitDecimals(unit))} ${UNIT_LABEL[unit]} print`}
                >
                  <rect x={0} y={0} width={fullW * previewScale} height={fullH * previewScale} fill="var(--k-bg-card)" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" />
                  <rect x={bleedIn * previewScale} y={bleedIn * previewScale} width={target.wIn * previewScale} height={target.hIn * previewScale} fill="none" stroke="var(--k-text)" strokeWidth={2} />
                  <rect
                    x={(bleedIn + SAFE_AREA_IN) * previewScale}
                    y={(bleedIn + SAFE_AREA_IN) * previewScale}
                    width={safeW * previewScale}
                    height={safeH * previewScale}
                    fill="none"
                    stroke="#6CA6FF"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                  />
                </svg>
                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '.75rem', color: 'var(--k-text-muted)', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span><span style={{ display: 'inline-block', width: '12px', borderTop: '2px dashed #ef4444', marginRight: '.375rem', verticalAlign: 'middle' }} />Bleed edge</span>
                  <span><span style={{ display: 'inline-block', width: '12px', borderTop: '2px solid var(--k-text)', marginRight: '.375rem', verticalAlign: 'middle' }} />Trim line</span>
                  <span><span style={{ display: 'inline-block', width: '12px', borderTop: '2px dashed #6CA6FF', marginRight: '.375rem', verticalAlign: 'middle' }} />Safe area (0.25{UNIT_LABEL.in})</span>
                </div>
              </div>
            </VisualizationContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
            {cropCheck && cropCheck.percent > 2 && (
              <Warning
                level={cropCheck.percent > 15 ? 'danger' : 'warn'}
                title={`Aspect ratio mismatch — roughly ${formatNumber(cropCheck.percent, 0)}% would need cropping`}
              >
                Your image is {formatNumber(safeDiv(img.width, img.height, 0), 2)}:1, but {activePreset ? activePreset.label : 'your custom size'} at this orientation is {formatNumber(safeDiv(target.wIn, target.hIn, 0), 2)}:1.
                To fill the frame without stretching, expect roughly {formatNumber(cropCheck.percent, 0)}% trimmed off the {cropCheck.axis === 'width' ? 'left/right' : 'top/bottom'}.
              </Warning>
            )}

            {!formatOk && (
              <Warning level="warn" title="Uncommon format for print">
                Many print shops expect JPEG, PNG, or PDF. Convert this file before sending it to print.
              </Warning>
            )}

            <Warning level="info" title="Margins &amp; safe area (general guidance)">
              This tool can't detect your actual margins from the file — as a rule of thumb, keep important content at least 0.25"–0.5" from every edge, and add bleed if the design runs to the paper's edge (see the preview above).
            </Warning>
          </div>
        </>
      )}

      <AdvancedDisclosure summary="Units, orientation, viewing distance &amp; bleed">
        <div>
          <label style={labelStyle()}>Unit</label>
          {pillGroup(
            UNITS.map((u) => ({ key: u, label: UNIT_LABEL[u] })),
            unit,
            setUnit,
            '#F7933C'
          )}
          <div style={{ fontSize: '.7rem', color: 'var(--k-text-muted)', marginTop: '.4rem' }}>px uses the 96px = 1in screen reference</div>
        </div>
        <div>
          <label style={labelStyle()}>Orientation (presets only)</label>
          {pillGroup(
            [{ key: 'portrait' as Orientation, label: 'Portrait' }, { key: 'landscape' as Orientation, label: 'Landscape' }],
            orientation,
            setOrientation,
            '#6CA6FF'
          )}
        </div>
        <div>
          <label style={labelStyle()}>Viewing distance (rule of thumb)</label>
          {pillGroup(
            VIEWING_DISTANCES.map((v) => ({ key: v.key, label: v.label })),
            viewingKey,
            setViewingKey,
            '#93B96A'
          )}
        </div>
        <InputField
          label={`Bleed (${UNIT_LABEL[unit]})`}
          value={formatNumber(inToUnit(bleedIn, unit), unitDecimals(unit))}
          onChange={(v) => setBleedIn(Math.max(unitToIn(safeNumber(v, 0), unit), 0))}
          step="0.05"
          min="0"
        />
      </AdvancedDisclosure>
    </div>
  );
}
