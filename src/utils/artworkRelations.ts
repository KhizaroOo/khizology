import type { Artwork } from '../data/artworks';

/** Explicit links and intentional collections outrank similarity; rare tags carry more weight. */
export function rankRelatedArtworks(artwork: Artwork, items: Artwork[], limit = 3): Artwork[] {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  const tags = new Set(artwork.tags);
  const explicit = new Set(artwork.relatedArtwork || []);
  const frequency = new Map<string, number>();
  for (const item of unique) for (const tag of new Set(item.tags)) frequency.set(tag, (frequency.get(tag) || 0) + 1);
  return unique.filter(candidate => candidate.id !== artwork.id && candidate.slug !== artwork.slug)
    .map(candidate => ({
      candidate,
      explicit: Number(explicit.has(candidate.slug)),
      collection: Number(Boolean(artwork.collection && candidate.collection === artwork.collection)),
      score: [...new Set(candidate.tags)].filter(tag => tags.has(tag)).reduce((score, tag) => score + 1 / Math.sqrt(frequency.get(tag)!), 0),
    }))
    .filter(item => item.explicit || item.collection || item.score > 0)
    .sort((a, b) => b.explicit - a.explicit || b.collection - a.collection || b.score - a.score || (a.candidate.slug < b.candidate.slug ? -1 : a.candidate.slug > b.candidate.slug ? 1 : 0))
    .slice(0, Math.max(0, limit)).map(item => item.candidate);
}

/** Describe only relationships represented by canonical data, not inferred artist intent. */
export function artworkRelationshipReason(artwork: Artwork, candidate: Artwork): string {
  if (artwork.relatedArtwork?.includes(candidate.slug)) {
    const series = (filename: string) => filename.match(/^(tree-house|flower|raw-beauty|jack-and-sally)[ -]\d+\.jpg$/i)?.[1].toLowerCase();
    return series(artwork.filename) && series(artwork.filename) === series(candidate.filename) ? 'Same numbered series' : 'Selected related artwork';
  }
  if (artwork.collection && artwork.collection === candidate.collection) return `Collection: ${artwork.collection}`;
  return `Shared: ${artwork.tags.filter(tag => candidate.tags.includes(tag)).slice(0, 3).join(' · ')}`;
}
