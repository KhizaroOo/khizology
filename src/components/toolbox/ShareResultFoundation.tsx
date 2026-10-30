import { useId, useLayoutEffect, useRef, useState } from 'react';
import { trackShareAction } from '../../utils/analytics';

interface Props { monster: 'toolooo' | 'artooo' | 'infooo'; contentType: 'tool' | 'artwork' | 'infooo_world'; slug: string; title: string; }
export interface ResultShareAdapter { summary: string; }

export default function ShareResultFoundation({ monster, contentType, slug, title, result }: Props & { result?: ResultShareAdapter }) {
  const canonical = typeof document === 'undefined' ? '' : document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || '';
  const publicUrl = canonical + (contentType === 'artwork' && /^[a-z0-9-]+$/.test(slug) ? `#art-${slug}` : '');
  const shareText = result ? `${title}\n${result.summary}\n${publicUrl}` : publicUrl;
  const payload = JSON.stringify([monster, contentType, slug, title, shareText]);
  const fieldId = useId();
  const feedbackId = `${fieldId}-feedback`;
  const operation = useRef(0);
  const [feedback, setFeedback] = useState<{ payload: string; id: number; message: string; manual?: boolean } | null>(null);
  // Invalidate pending work before a changed payload paints, and when this control unmounts.
  useLayoutEffect(() => {
    operation.current++;
    setFeedback(null);
    return () => { operation.current++; };
  }, [payload]);
  const begin = (message: string) => {
    const id = ++operation.current;
    setFeedback({ payload, id, message });
    return id;
  };
  const report = (id: number, message: string, manual = false) => {
    if (id === operation.current) setFeedback({ payload, id, message, manual });
  };
  const copy = async (prefix = '') => {
    const id = begin(`Copying ${result ? 'result' : 'link'}…`);
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(shareText);
      if (id !== operation.current) return;
      report(id, `${prefix}${result ? 'Result copied' : 'Link copied'}.`);
      trackShareAction({ monster, content_type: contentType, slug, action: result ? 'copy_result' : 'copy_link' });
    } catch {
      report(id, `${prefix}Couldn’t copy automatically. Select and copy below.`, true);
    }
  };
  const share = async () => {
    if (!navigator.share) return copy('Sharing isn’t supported here. ');
    const id = begin('Opening share options…');
    try {
      await navigator.share({ title, text: result?.summary, url: publicUrl });
      if (id !== operation.current) return;
      // Some platforms resolve as soon as the OS takes over, before a recipient is chosen.
      report(id, 'Share options opened.');
      trackShareAction({ monster, content_type: contentType, slug, action: result ? 'share_result' : 'web_share' });
    } catch (error) {
      const cancelled = error && typeof error === 'object' && 'name' in error && error.name === 'AbortError';
      report(id, cancelled ? 'Share cancelled.' : 'Couldn’t open sharing. Use the copy button or select and copy below.', !cancelled);
    }
  };
  const current = feedback?.payload === payload ? feedback : null;
  return <div className="share-foundation" role="group" aria-label={`Share ${title}`}>
    <span>{result ? 'Share result' : 'Share this page'}</span><button className="k-button k-button--secondary" type="button" aria-describedby={feedbackId} onClick={share}>Share</button><button className="k-button k-button--secondary" type="button" aria-describedby={feedbackId} onClick={() => copy()}>{result ? 'Copy result' : 'Copy link'}</button>
    <p id={feedbackId} className={current ? 'share-feedback' : 'sr-only'} role="status" aria-live="polite" aria-atomic="true"><span key={current?.id}>{current?.message}</span></p>
    {current?.manual && <div className="share-manual"><label htmlFor={fieldId}>{result ? 'Result to copy' : 'Link to copy'}</label><textarea id={fieldId} readOnly rows={result ? 4 : 2} value={shareText} onFocus={event => event.currentTarget.select()} /></div>}
    <style>{`.share-foundation{display:flex;align-items:center;flex-wrap:wrap;gap:var(--k-action-gap);padding-bottom:var(--k-button-depth);margin:1rem 0;color:var(--k-text-muted);font:600 .78rem Poppins,sans-serif}.share-foundation>span{flex-basis:100%}.share-feedback,.share-manual{flex-basis:100%;min-width:0;margin:0;color:var(--k-text)}.share-feedback:empty{display:none}.share-manual{display:grid;gap:.4rem}.share-manual textarea{width:100%;max-width:100%;padding:.65rem;font:400 .8rem/1.6 monospace;resize:vertical;overflow-wrap:anywhere}.share-foundation button:focus-visible{outline:3px solid var(--k-accent);outline-offset:2px}@media (prefers-reduced-motion:reduce){.share-foundation *{transition:none!important}}`}</style>
  </div>;
}
