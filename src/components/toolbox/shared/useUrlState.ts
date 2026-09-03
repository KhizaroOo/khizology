import { useEffect, useRef, useState } from 'react';

/**
 * Mirrors a plain state object into the URL query string (via replaceState, no navigation)
 * so a tool's configuration can be shared by copying the URL. Only primitives survive the
 * round trip — never pass JWTs, file contents, or other sensitive/large values through this.
 */
export function useUrlState<T extends Record<string, string | number | boolean>>(
  defaults: T
): [T, (next: Partial<T>) => void] {
  const initial = useRef<T>(defaults);
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    const params = new URLSearchParams(window.location.search);
    const merged = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const raw = params.get(key);
      if (raw === null) continue;
      const defaultVal = defaults[key];
      if (typeof defaultVal === 'number') {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) (merged as any)[key] = n;
      } else if (typeof defaultVal === 'boolean') {
        (merged as any)[key] = raw === '1' || raw === 'true';
      } else {
        (merged as any)[key] = raw;
      }
    }
    return merged;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    for (const key of Object.keys(state)) {
      const value = state[key];
      if (value === initial.current[key]) {
        params.delete(key);
      } else {
        params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      }
    }
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [state]);

  const update = (next: Partial<T>) => setState((s) => ({ ...s, ...next }));
  return [state, update];
}
