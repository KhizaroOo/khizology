import type { Artwork } from '../data/artworks';

/** Shared ranking for the gallery and canonical artwork data. No new routes. */
export function rankRelatedArtworks(artwork: Artwork, items: Artwork[], limit = 3): Artwork[] {
  const tags = new Set(artwork.tags);
  const explicit = new Set(artwork.relatedArtwork || []);
  return items.filter(candidate => candidate.id !== artwork.id)
    .map(candidate => ({ candidate, score: (explicit.has(candidate.slug) ? 20 : 0) + candidate.tags.filter(tag => tags.has(tag)).length }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, limit).map(item => item.candidate);
}
