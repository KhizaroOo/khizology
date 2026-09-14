import { trackShareAction } from '../../utils/analytics';

interface Props { monster: 'toolooo' | 'artooo' | 'infooo'; contentType: 'tool' | 'artwork' | 'infooo_world'; slug: string; title: string; }
export interface ResultShareAdapter { summary: string; }

export default function ShareResultFoundation({ monster, contentType, slug, title, result }: Props & { result?: ResultShareAdapter }) {
  const publicUrl = typeof window === 'undefined' ? '' : window.location.href.split(/[?#]/)[0];
  const shareText = result ? `${title}\n${result.summary}\n${publicUrl}` : publicUrl;
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); trackShareAction({ monster, content_type: contentType, slug, action: result ? 'copy_result' : 'copy_link' }); } catch { /* Clipboard can be unavailable; the visible URL remains shareable. */ }
  };
  const share = async () => {
    if (!navigator.share) return copy();
    try { await navigator.share({ title, text: result?.summary, url: publicUrl }); trackShareAction({ monster, content_type: contentType, slug, action: result ? 'share_result' : 'web_share' }); } catch { /* A dismissed system dialog is not an error state. */ }
  };
  return <div className="share-foundation" aria-label={`Share ${title}`}>
    <span>{result ? 'Share result' : 'Share this page'}</span><button type="button" onClick={share}>Share</button><button type="button" onClick={copy}>{result ? 'Copy result' : 'Copy link'}</button>
    <style>{`.share-foundation{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;margin:1rem 0;color:var(--k-text-muted);font:600 .78rem Poppins,sans-serif}.share-foundation button{min-height:36px;padding:.4rem .7rem;border:1px solid var(--k-border);border-radius:.5rem;background:var(--k-bg-card);color:var(--k-text);font:inherit;cursor:pointer}.share-foundation button:focus-visible{outline:3px solid var(--k-accent);outline-offset:2px}@media (prefers-reduced-motion:reduce){.share-foundation *{transition:none!important}}`}</style>
  </div>;
}
