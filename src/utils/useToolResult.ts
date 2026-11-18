import { useEffect, useRef } from 'react';
import { trackToolResult } from './analytics';

/** Auto-calculated tools report a settled change, never their initial render or raw values. */
export default function useToolResult(revision: string, valid = true) {
  const previous = useRef(revision);
  useEffect(() => {
    if (previous.current === revision) return;
    previous.current = revision;
    if (!valid) return;
    const timer = setTimeout(() => trackToolResult(), 800);
    return () => clearTimeout(timer);
  }, [revision, valid]);
}
