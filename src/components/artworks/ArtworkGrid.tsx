import { preview, previewSrcset } from "../../utils/imagePreview";
import { rankRelatedArtworks } from '../../utils/artworkRelations';
import { trackArtworkView } from '../../utils/analytics';
import ShareResultFoundation from '../toolbox/ShareResultFoundation';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Artwork {
  id: string;
  slug: string;
  title: string;
  filename: string;
  tags: string[];
  width: number;
  height: number;
  description?: string;
  story?: string; year?: number; medium?: string; whatIWasThinking?: string; collection?: string; relatedArtwork?: string[]; behindTheSketch?: string;
}

interface Props {
  artworks: Artwork[];
  base: string;
  emptyStateText: string;
  subjects: { tag: string; label: string }[];
}

function ArtworkModal({
  artwork,
  base,
  onClose,
  related,
  onSelect,
}: {
  artwork: Artwork;
  base: string;
  onClose: () => void;
  related: Artwork[];
  onSelect: (artwork: Artwork) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const modal = closeButtonRef.current?.closest('.aw-modal-box');
      const focusable = modal?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const desc = artwork.description ||
    `An original artwork by khizooo — ${artwork.tags.slice(0, 3).join(', ')}.`;

  return (
    <div
      className="aw-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={artwork.title}
    >
      <div className="aw-modal-box" onClick={e => e.stopPropagation()}>
        <button ref={closeButtonRef} className="aw-modal-close" onClick={onClose} aria-label="Close artwork dialog">✕</button>
        <div className="aw-modal-img-wrap">
          <img
            src={`${base}/images/artworks/${artwork.filename}`}
            alt={artwork.title}
            width={artwork.width}
            height={artwork.height}
            decoding="async"
            className="aw-modal-img"
          />
        </div>
        <div className="aw-modal-info">
          <h2 className="aw-modal-title">{artwork.title}</h2>
          <p className="aw-modal-desc">{desc}</p>
          <div className="aw-modal-tags">
            {artwork.tags.map(t => (
              <span key={t} className="aw-tag">{t}</span>
            ))}
          </div>
          {(artwork.year || artwork.medium || artwork.collection) && <p className="aw-modal-meta">{[artwork.year, artwork.medium, artwork.collection].filter(Boolean).join(' · ')}</p>}
          {artwork.story && <p className="aw-modal-desc">{artwork.story}</p>}
          {artwork.whatIWasThinking && <p className="aw-modal-desc"><strong>What I was thinking:</strong> {artwork.whatIWasThinking}</p>}
          {artwork.behindTheSketch && <p className="aw-modal-desc"><strong>Behind the sketch:</strong> {artwork.behindTheSketch}</p>}
          <ShareResultFoundation monster="artooo" contentType="artwork" slug={artwork.slug} title={artwork.title} />
          {related.length > 0 && <section className="aw-related"><h3>Related artworks</h3><div>{related.map(item => <button key={item.id} type="button" onClick={() => onSelect(item)} data-related-content data-related-monster="artooo" data-related-content-type="artwork" data-related-slug={item.slug} data-related-source={artwork.slug}>{item.title}</button>)}</div></section>}
        </div>
      </div>
    </div>
  );
}

export default function ArtworkGrid({ artworks, base, emptyStateText, subjects }: Props) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [selected, setSelected] = useState<Artwork | null>(null);
  const selectionRef = useRef(selected);
  selectionRef.current = selected;

  const allTags = Array.from(new Set(artworks.flatMap(a => a.tags))).sort();

  const filtered = artworks.filter(a => {
    const matchQ = !query || a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));
    const matchT = !activeTag || a.tags.includes(activeTag);
    return matchQ && matchT;
  });

  const handleClose = useCallback(() => {
    setSelected(null);
    if (window.location.hash.startsWith('#art-')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  const selectArtwork = useCallback((artwork: Artwork) => {
    // Related work may be outside the current filter; make its context visible.
    if (!filtered.includes(artwork)) { setQuery(''); setActiveTag(''); }
    setSelected(artwork);
    window.history.pushState(null, '', `#art-${artwork.slug}`);
    trackArtworkView(artwork.slug);
  }, [filtered]);
  useEffect(() => {
    const followHash = () => {
      const artwork = artworks.find(item => `#art-${item.slug}` === window.location.hash);
      setSelected(artwork || null);
      if (artwork) {
        setQuery(''); setActiveTag('');
        if (!selectionRef.current) document.getElementById(`art-${artwork.slug}`)?.focus({ preventScroll: true });
        trackArtworkView(artwork.slug);
      }
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, [artworks]);
  const changeQuery = (value: string) => { setQuery(value); handleClose(); };
  const changeTag = (value: string) => { setActiveTag(value); handleClose(); };
  const availableSubjects = subjects.filter(subject => allTags.includes(subject.tag));
  const secondaryTags = allTags.filter(tag => !availableSubjects.some(subject => subject.tag === tag));
  const related = selected ? rankRelatedArtworks(selected, artworks) : [];

  return (
    <>
      <div className="aw-controls">
        <div className="aw-search-wrap">
          <span className="aw-search-icon">🔍</span>
          <input
            type="search"
            className="aw-search"
            placeholder="Search artworks, tags…"
            value={query}
            onChange={e => changeQuery(e.target.value)}
            aria-label="Search artworks"
          />
          {query && (
            <button className="aw-search-clear" onClick={() => changeQuery('')} aria-label="Clear artwork search">✕</button>
          )}
        </div>
        <div className="aw-subjects" role="group" aria-label="Artwork subjects">
          <button type="button" aria-pressed={!activeTag} className={`aw-tag-btn k-button k-button--secondary${!activeTag ? ' active' : ''}`} onClick={() => changeTag('')}>All</button>
          {availableSubjects.map(subject => <button type="button" key={subject.tag} data-artwork-tag={subject.tag} aria-pressed={activeTag === subject.tag} className={`aw-tag-btn k-button k-button--secondary${activeTag === subject.tag ? ' active' : ''}`} onClick={() => changeTag(activeTag === subject.tag ? '' : subject.tag)}>{subject.label}</button>)}
        </div>
        <details className="aw-more-tags">
          <summary>More tags{activeTag && secondaryTags.includes(activeTag) ? ` · ${activeTag}` : ''}</summary>
          <div className="aw-tags-scroll" role="group" aria-label="More artwork tags">
            {secondaryTags.map(tag => <button type="button" key={tag} data-artwork-tag={tag} aria-pressed={activeTag === tag} className={`aw-tag-btn k-button k-button--secondary${activeTag === tag ? ' active' : ''}`} onClick={() => changeTag(activeTag === tag ? '' : tag)}>{tag}</button>)}
          </div>
        </details>
      </div>

      <p className="aw-count" role="status" aria-live="polite" aria-atomic="true">{filtered.length} artwork{filtered.length !== 1 ? 's' : ''}{activeTag ? ` · ${activeTag}` : ''}</p>

      {filtered.length === 0 ? (
        <div className="aw-empty">
          <span className="aw-empty-icon">🎨</span>
          <h3>No artworks found</h3>
          <p>{emptyStateText}</p>
          <button className="aw-empty-reset k-button k-button--secondary" onClick={() => { changeQuery(''); changeTag(''); }}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className="aw-masonry">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              className="aw-card"
              id={`art-${a.slug}`}
              data-artwork-id={a.id}
              data-artwork-slug={a.slug}
              data-artwork-original={`${base}/images/artworks/${a.filename}`}
              onClick={() => selectArtwork(a)}
              aria-label={`View ${a.title}`}
              style={{ '--aw-delay': `${(i % 12) * 0.04}s` } as React.CSSProperties}
            >
              <img
                src={preview(`/images/artworks/${a.filename}`)}
                srcSet={previewSrcset(`/images/artworks/${a.filename}`)}
                sizes="(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 320px"
                alt={a.title}
                width={a.width}
                height={a.height}
                loading="lazy"
                decoding="async"
                className="aw-card-img"
              />
              <div className="aw-card-overlay">
                <span className="aw-card-title">{a.title}</span>
                <div className="aw-card-tags">
                  {a.tags.map(t => (
                    <span key={t} className="aw-tag sm">{t}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ArtworkModal artwork={selected} base={base} onClose={handleClose} related={related} onSelect={selectArtwork} />
      )}

      <style>{`
        .aw-controls { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
        .aw-search-wrap {
          position: relative; display: flex; align-items: center;
          background: var(--k-field-bg); border: 1.5px solid var(--k-field-border);
          border-radius: 0.75rem; padding: 0 1rem; transition: border-color .2s;
        }
        .aw-search-wrap:hover, .aw-search-wrap:focus-within { border-color: var(--k-field-hover); }
        .aw-search-icon { font-size: 1rem; opacity: .5; flex-shrink: 0; }
        .aw-search {
          flex: 1; min-width: 0; width: 100%; background: transparent; border: none; outline: none;
          padding: .75rem .625rem; font-size: .9rem; color: var(--k-text);
          font-family: inherit;
        }
        .aw-search-clear {
          background: none; border: none; cursor: pointer; color: var(--k-text-muted);
          font-size: .8rem; min-width:44px; min-height:44px;
        }
        .aw-tags-scroll {
          display: flex; gap: .6rem; flex-wrap: wrap; padding-bottom:6px;
        }
        .aw-subjects { display:flex; flex-wrap:wrap; gap:.6rem; padding-bottom:4px; }
        .aw-tag-btn { white-space:nowrap; min-height:44px; }
        .aw-tag-btn[aria-pressed="true"]::before { content:'✓'; }
        .aw-more-tags summary { cursor:pointer; min-height:44px; padding:.6rem 0; font-weight:700; color:var(--k-text); }
        .aw-more-tags summary:focus-visible { outline:3px solid var(--k-text); outline-offset:3px; }
        .aw-search-wrap:focus-within { outline:3px solid var(--k-text); outline-offset:3px; }
        .aw-count {
          font-size: .78rem; color: var(--k-text-muted); margin-bottom: 1.25rem;
        }
        .aw-masonry {
          columns: 2; column-gap: .75rem;
          /* 3 cols at md, 4 at lg */
        }
        @media (min-width: 640px) { .aw-masonry { columns: 3; } }
        @media (min-width: 1024px) { .aw-masonry { columns: 4; } }

        .aw-card {
          scroll-margin-top:7rem; break-inside: avoid; display: block; width: 100%; padding: 0;
          border: none; background: none; cursor: pointer; margin-bottom: .75rem;
          border-radius: .75rem; overflow: hidden; position: relative;
          transition: transform .2s; animation: fadeIn .35s ease both;
          animation-delay: var(--aw-delay, 0s);
        }
        .aw-card:hover { transform: translateY(-3px); }
        .aw-card-img { width: 100%; display: block; border-radius: .75rem; }
        .aw-card-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%);
          padding: 2rem .75rem .625rem;
          border-radius: 0 0 .75rem .75rem;
          opacity: 0; transition: opacity .2s;
          display: flex; flex-direction: column; gap: .25rem;
        }
        .aw-card:hover .aw-card-overlay { opacity: 1; }
        .aw-card:focus-visible .aw-card-overlay { opacity: 1; }
        .aw-card-title {
          font-size: .78rem; font-weight: 700; color: #fff;
          font-family: 'Poppins', sans-serif;
        }
        .aw-card-tags { display: flex; gap: .25rem; flex-wrap: wrap; }
        .aw-tag {
          background: rgba(245,207,92,.2); color: var(--m-artooo-text);
          border: 1px solid rgba(245,207,92,.4);
          font-size: .65rem; font-weight: 600; padding: .1rem .4rem;
          border-radius: 999px; font-family: 'Poppins', sans-serif;
          text-transform: uppercase; letter-spacing: .04em;
        }
        .aw-tag.sm { font-size: .6rem; }
        .aw-empty {
          text-align: center; padding: 4rem 2rem;
          display: flex; flex-direction: column; align-items: center; gap: .75rem;
        }
        .aw-empty-icon { font-size: 3rem; }
        .aw-empty h3 {
          font-family: 'Poppins', sans-serif; font-size: 1.25rem;
          font-weight: 800; color: var(--k-text);
        }
        .aw-empty p { color: var(--k-text-muted); font-size: .9rem; }
        .aw-empty-reset {
          padding: .5rem 1.25rem; background: #F5CF5C; color: #2A3439;
          border: none; border-radius: .5rem; font-weight: 700; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-size: .875rem;
        }
        /* Modal */
        .aw-modal-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,.8); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; animation: fadeIn .2s ease;
        }
        .aw-modal-box {
          background: var(--k-bg-card); border: 1px solid var(--k-border);
          border-radius: 1.25rem; max-width: 720px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          display: grid; grid-template-columns: 1fr; position: relative;
          animation: slideUp .25s ease;
        }
        @media (min-width: 640px) {
          .aw-modal-box { grid-template-columns: 1fr 1fr; }
        }
        .aw-modal-close {
          position: absolute; top: .75rem; right: .75rem;
          background: var(--k-bg); border: 1px solid var(--k-border);
          border-radius: 999px; width: 2rem; height: 2rem;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--k-text-muted); font-size: .8rem;
          z-index: 1; transition: background .15s;
        }
        .aw-modal-close:hover { background: var(--k-border); }
        .aw-modal-img-wrap { overflow: hidden; border-radius: 1.25rem 1.25rem 0 0; }
        @media (min-width: 640px) {
          .aw-modal-img-wrap { border-radius: 1.25rem 0 0 1.25rem; }
        }
        .aw-modal-img { width: 100%; height: 100%; object-fit: cover; min-height: 260px; }
        .aw-modal-info {
          padding: 1.5rem; display: flex; flex-direction: column; gap: .75rem;
          justify-content: center;
        }
        .aw-modal-title {
          font-family: 'Poppins', sans-serif; font-size: 1.25rem;
          font-weight: 800; color: var(--k-text); margin: 0;
        }
        .aw-modal-desc { font-size: .875rem; color: var(--k-text-muted); line-height: 1.6; margin: 0; }
        .aw-modal-tags { display: flex; flex-wrap: wrap; gap: .375rem; }
        .aw-modal-tags .aw-tag { font-size: .7rem; }
        .aw-modal-meta { font-size: .78rem; color: var(--k-text-muted); margin: 0; }
        .aw-related { border-top: 1px solid var(--k-border); padding-top: .875rem; }
        .aw-related h3 { margin: 0 0 .5rem; font: 700 .75rem 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: .06em; color: var(--k-text); }
        .aw-related div { display: flex; flex-wrap: wrap; gap: .375rem; }
        .aw-related button { border: 1px solid var(--k-border); border-radius: .5rem; background: var(--k-bg); color: var(--k-text); cursor: pointer; font: 600 .72rem inherit; padding: .4rem .55rem; }
        .aw-related button:focus-visible { outline: 3px solid #F5CF5C; outline-offset: 2px; }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  );
}
