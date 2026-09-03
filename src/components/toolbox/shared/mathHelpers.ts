/** Parse a string input to a finite number, or fall back — keeps NaN/Infinity out of the UI. */
export function safeNumber(value: string | number, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Safe division — returns fallback instead of Infinity/NaN when the denominator is ~0. */
export function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < 1e-9) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}
