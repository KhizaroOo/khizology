import type { CampaignFormat } from '../../../data/campaignFormats';

export const cropLoss = (masterRatio: number, targetRatio: number) => 1 - Math.min(masterRatio / targetRatio, targetRatio / masterRatio);
export interface CampaignGroup {
  ratio: number;
  formats: CampaignFormat[];
  maxLoss: number;
  width: number;
  height: number;
  rasterLimited?: boolean;
}

const MAX_CANVAS_SIDE = 10_000_000;
const CROP_EPSILON = 1e-12;
const gcd = (a: bigint, b: bigint): bigint => b === 0n ? a : gcd(b, a % b);
const ceilDivide = (a: bigint, b: bigint) => (a + b - 1n) / b;

/** Preserve the chosen decimal tolerance when constructing an exact interval endpoint. */
function retainedFraction(loss: number): { numerator: bigint; denominator: bigint } {
  const [mantissa, exponentText = '0'] = String(loss).split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const scale = fraction.length - Number(exponentText);
  const numerator = BigInt(whole + fraction) * (scale < 0 ? 10n ** BigInt(-scale) : 1n);
  const denominator = scale > 0 ? 10n ** BigInt(scale) : 1n;
  const retained = denominator - numerator;
  const common = gcd(retained, denominator);
  return { numerator: retained / common, denominator: denominator / common };
}

function integerCanvas(formats: CampaignFormat[], low: number, high: number, ideal: number, maxLoss: number): { width: number; height: number } | null {
  const minWidth = Math.max(...formats.map(format => format.width));
  const minHeight = Math.max(...formats.map(format => format.height));
  const fits = (width: number, height: number) => Number.isSafeInteger(width) && Number.isSafeInteger(height)
    && width >= minWidth && height >= minHeight && width <= MAX_CANVAS_SIDE && height <= MAX_CANVAS_SIDE
    && formats.every(format => cropLoss(width / height, format.width / format.height) <= maxLoss + CROP_EPSILON);
  const scaleFraction = (numerator: bigint, denominator: bigint) => {
    const common = gcd(numerator, denominator);
    const w = numerator / common;
    const h = denominator / common;
    const scale = [1n, ceilDivide(BigInt(minWidth), w), ceilDivide(BigInt(minHeight), h)].reduce((a, b) => a > b ? a : b);
    if (w * scale > BigInt(MAX_CANVAS_SIDE) || h * scale > BigInt(MAX_CANVAS_SIDE)) return null;
    const width = Number(w * scale);
    const height = Number(h * scale);
    return fits(width, height) ? { width, height } : null;
  };

  // At zero loss all ratios in a feasible group are identical. Integer multiples
  // of a reduced destination ratio avoid the drift caused by independent rounding.
  if (maxLoss === 0) return scaleFraction(BigInt(formats[0].width), BigInt(formats[0].height));

  const firstHeight = Math.max(minHeight, Math.ceil(minWidth / ideal));
  const atHeight = (height: number) => {
    if (!Number.isSafeInteger(height) || height > MAX_CANVAS_SIDE) return null;
    const minimum = Math.max(minWidth, Math.ceil(low * height - CROP_EPSILON));
    const maximum = Math.min(MAX_CANVAS_SIDE, Math.floor(high * height + CROP_EPSILON));
    if (minimum > maximum) return null;
    const width = Math.max(minimum, Math.min(maximum, Math.round(height * ideal)));
    return fits(width, height) ? { width, height } : null;
  };
  // Small canvases may need a few extra pixels; normal production sizes generally
  // fit immediately. The bounded follow-up avoids unbounded denominator searches.
  for (let step = 0; step < 256; step += 1) {
    const canvas = atHeight(firstHeight + step);
    if (canvas) return canvas;
  }
  for (let multiplier = 2; multiplier <= 65536; multiplier *= 2) {
    const canvas = atHeight(firstHeight * multiplier);
    if (canvas) return canvas;
  }

  // The upper intersection endpoint is the smallest destination ratio divided
  // by the retained fraction. Whole-percent UI tolerances have small exact
  // rational representations, including a group that only meets at its boundary.
  const smallest = formats.reduce((a, b) => a.width / a.height < b.width / b.height ? a : b);
  const retained = retainedFraction(maxLoss);
  return scaleFraction(BigInt(smallest.width) * retained.denominator, BigInt(smallest.height) * retained.numerator);
}

/** Greedy intersection of ratio intervals: fewest groups under this geometric crop bound. */
export function planCampaign(formats: CampaignFormat[], maxLoss: number): CampaignGroup[] {
  if (!Number.isFinite(maxLoss) || maxLoss < 0 || maxLoss > 0.4) return [];
  const valid = formats.filter(f => Number.isInteger(f.width) && Number.isInteger(f.height) && f.width >= 1 && f.height >= 1 && f.width <= 10000 && f.height <= 10000);
  const sorted = [...valid].sort((a, b) => a.width / a.height - b.width / b.height);
  const batches: { low: number; high: number; formats: CampaignFormat[] }[] = [];
  for (const format of sorted) {
    const ratio = format.width / format.height;
    const low = ratio * (1 - maxLoss);
    const high = ratio / (1 - maxLoss);
    const last = batches[batches.length - 1];
    if (last && low <= last.high + 1e-10) {
      last.low = Math.max(last.low, low);
      last.high = Math.min(last.high, high);
      last.formats.push(format);
    } else batches.push({ low, high, formats: [format] });
  }
  return batches.flatMap(batch => {
    const ratios = batch.formats.map(f => f.width / f.height);
    const ideal = Math.sqrt(Math.min(...ratios) * Math.max(...ratios));
    const canvas = integerCanvas(batch.formats, batch.low, batch.high, Math.max(batch.low, Math.min(batch.high, ideal)), maxLoss);
    if (canvas) {
      const ratio = canvas.width / canvas.height;
      return [{ ratio, formats: batch.formats, maxLoss: Math.max(...ratios.map(r => cropLoss(ratio, r))), ...canvas }];
    }
    // Extremely narrow intervals from non-UI precision can exceed the bounded
    // raster solver. Separate exact canvases remain valid, and the UI discloses
    // that the theoretical minimum was not retained in this fallback.
    return batch.formats.map(format => ({ ratio: format.width / format.height, formats: [format], maxLoss: 0, width: format.width, height: format.height, rasterLimited: true }));
  });
}
