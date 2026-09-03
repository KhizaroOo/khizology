import { useEffect, useState } from 'react';

const PREFIX = 'khizology:toolooo:';

/** Remembers a small, non-sensitive per-viewer preference (units, basic/advanced, favorites) across visits. */
export function useLocalPref<T>(key: string, defaultValue: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private mode, quota) — preference just won't persist
    }
  }, [key, value]);

  return [value, setValue];
}
