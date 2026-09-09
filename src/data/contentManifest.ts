import { tools } from './tools';
import { artworks } from './artworks';

export interface ContentManifestItem {
  contentType: 'tool' | 'artwork'; monster: 'toolooo' | 'artooo'; slug: string; title: string;
  hook: string; shortDescription: string; url: string; heroAsset: string; videoAsset?: string; tags: string[];
  socialStatus: 'draft' | 'ready' | 'published';
}

export const contentManifest: ContentManifestItem[] = [
  ...tools.filter(tool => tool.status === 'active').map(tool => ({ contentType: 'tool' as const, monster: 'toolooo' as const, slug: tool.slug, title: tool.name, hook: tool.shortDescription, shortDescription: tool.shortDescription, url: `/toolbox/${tool.slug}`, heroAsset: '/images/Monsters/toolooo.png', tags: tool.tags, socialStatus: 'draft' as const })),
  ...artworks.map(artwork => ({ contentType: 'artwork' as const, monster: 'artooo' as const, slug: artwork.slug, title: artwork.title, hook: `Original artwork by khizooo: ${artwork.title}.`, shortDescription: artwork.tags.join(', '), url: '/artworks', heroAsset: `/images/artworks/${artwork.filename}`, tags: artwork.tags, socialStatus: 'draft' as const })),
];
