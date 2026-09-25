import { tools } from './tools';
import { artworks } from './artworks';
import { infoooWorlds, type InfoooWorld } from './infooo';
import { publishedNotoooBooks } from './notooo';

export type ContentManifestType = 'tool' | 'artwork' | 'infooo_world' | 'notooo';
export type CompoundValueStatus = 'idea' | 'draft' | 'ready' | 'published' | 'skipped';

export interface ContentManifestItem {
  id: string; contentType: ContentManifestType; monster: 'toolooo' | 'artooo' | 'infooo' | 'notooo'; slug: string; title: string;
  hook: string; shortDescription: string; url: string; heroAsset: string; videoAsset?: string; tags: string[]; worldNumber?: number;
  socialStatus: 'draft' | 'ready' | 'published';
}

export interface CompoundValueReference {
  contentType: ContentManifestType;
  sourceId: string;
}

export interface CompoundValueSocialDraft {
  status: CompoundValueStatus;
  humanApproved: boolean;
  hook: string;
  copy: string;
}

export interface CompoundValueDemo {
  hook: string;
  action: string;
  reveal: string;
  takeaway: string;
}

export interface CompoundValuePack {
  id: string;
  source: CompoundValueReference;
  canonicalUrl: string;
  status: CompoundValueStatus;
  takeaway?: string;
  discoveryAngle?: string;
  socialDraft?: CompoundValueSocialDraft;
  visualIdea?: string;
  demo?: CompoundValueDemo;
  related?: CompoundValueReference[];
  notoooCandidate?: { status: Extract<CompoundValueStatus, 'idea' | 'draft' | 'skipped'>; title: string };
}

export const compoundValueStatuses: readonly CompoundValueStatus[] = ['idea', 'draft', 'ready', 'published', 'skipped'];

export function compoundValueReferenceKey(reference: CompoundValueReference): string {
  return `${reference.contentType}:${reference.sourceId}`;
}

export const contentManifest: ContentManifestItem[] = [
  ...tools.filter(tool => tool.status === 'active').map(tool => ({ id: tool.id, contentType: 'tool' as const, monster: 'toolooo' as const, slug: tool.slug, title: tool.name, hook: tool.shortDescription, shortDescription: tool.shortDescription, url: `/toolbox/${tool.slug}`, heroAsset: '/images/Monsters/toolooo.png', tags: tool.tags, socialStatus: 'draft' as const })),
  ...artworks.map(artwork => ({ id: artwork.id, contentType: 'artwork' as const, monster: 'artooo' as const, slug: artwork.slug, title: artwork.title, hook: `Original artwork by khizooo: ${artwork.title}.`, shortDescription: artwork.tags.join(', '), url: '/artworks', heroAsset: `/images/artworks/${artwork.filename}`, tags: artwork.tags, socialStatus: 'draft' as const })),
  ...infoooWorlds.filter(world => world.status === 'published' && world.visibility === 'public').map(world => createInfoooManifestItem(world, { hook: world.description, shortDescription: world.description, heroAsset: '/images/Monsters/infooo.png', tags: world.category ? [world.category] : [], socialStatus: 'draft' })),
  ...publishedNotoooBooks.map(book => ({ id: book.id, contentType: 'notooo' as const, monster: 'notooo' as const, slug: book.slug, title: book.title, hook: book.subtitle, shortDescription: book.shortDescription, url: `/notooo/${book.slug}`, heroAsset: '/images/Monsters/ff-04.png', tags: book.tags, socialStatus: 'draft' as const })),
];

// Review-only material is deliberately separate from the public manifest so a
// draft can have a complete value plan without becoming discoverable or indexable.
export const reviewContentManifest: ContentManifestItem[] = infoooWorlds
  .filter(world => world.status === 'ready' && world.visibility === 'private')
  .map(world => createInfoooManifestItem(world, {
    hook: world.description,
    shortDescription: world.description,
    heroAsset: '/images/Monsters/infooo.png',
    tags: world.category ? [world.category] : [],
    socialStatus: 'draft',
  }));

export function createInfoooManifestItem(world: InfoooWorld, details: Pick<ContentManifestItem, 'hook' | 'shortDescription' | 'heroAsset' | 'tags' | 'socialStatus'>): ContentManifestItem {
  return { id: world.id, contentType: 'infooo_world', monster: 'infooo', slug: world.slug, title: world.title, url: `/infooo/${world.slug}`, worldNumber: world.worldNumber, ...details };
}

// Internal planning only. Packs are deliberately not imported by public routes or sitemap generation.
// Every string below comes from canonical metadata or reviewed knowledge; never add visitor input here.
export const compoundValuePacks: CompoundValuePack[] = [
  {
    id: 'compound-tool-retry-storm-simulator',
    source: { contentType: 'tool', sourceId: 'retry-storm-simulator' },
    canonicalUrl: '/toolbox/retry-storm-simulator',
    status: 'draft',
    takeaway: 'Immediate retries can amplify a failure into more traffic.',
    discoveryAngle: 'Why immediate retries can make a recovering dependency work harder.',
    socialDraft: {
      status: 'draft',
      humanApproved: false,
      hook: 'Retries can turn one failure into more traffic.',
      copy: 'Immediate retries can amplify a failure into more traffic. Retry Storm Simulator makes backoff, jitter, and recovery pressure visible.',
    },
    visualIdea: 'Compare a synchronized immediate-retry wave with a backoff-and-jitter wave.',
    demo: {
      hook: 'Can retries attack your own API?',
      action: 'Compare immediate retries with backoff and jitter during a bounded outage.',
      reveal: 'Synchronized retry waves add pressure while a dependency recovers.',
      takeaway: 'Retries need coordination, not just repetition.',
    },
    related: [{ contentType: 'tool', sourceId: 'rate-limit-playground' }],
    notoooCandidate: { status: 'idea', title: 'Recovery logic can become traffic' },
  },
  {
    id: 'compound-artwork-skull-rose-fusion',
    source: { contentType: 'artwork', sourceId: 'artwork:a-skull-rose-fusion.jpg' },
    canonicalUrl: '/artworks',
    status: 'draft',
    socialDraft: {
      status: 'draft',
      humanApproved: false,
      hook: 'A Skull Rose Fusion — original artwork by khizooo.',
      copy: 'A Skull Rose Fusion. Original artwork by khizooo.',
    },
    visualIdea: 'A detail crop of A Skull Rose Fusion.',
  },
  {
    id: 'compound-infooo-human-atlas',
    source: { contentType: 'infooo_world', sourceId: 'world-001' },
    canonicalUrl: '/infooo/human-atlas',
    status: 'draft',
    takeaway: 'Connections make anatomy easier to explore than a list of organ names.',
    discoveryAngle: 'Why anatomy makes more sense when structures are connected.',
    socialDraft: {
      status: 'draft',
      humanApproved: false,
      hook: 'Isolate one system. Then see what it connects to.',
      copy: 'Human Atlas is for learning and exploration, not medical diagnosis or treatment.',
    },
    visualIdea: 'Isolate one anatomy system, then reveal its connected relationships.',
    demo: {
      hook: 'What changes when one structure is seen in context?',
      action: 'Search, isolate a system, and reveal its connections.',
      reveal: 'Relationships become easier to inspect one connection at a time.',
      takeaway: 'See it. Touch it. Understand it.',
    },
    notoooCandidate: { status: 'idea', title: 'Connected systems make anatomy easier to learn' },
  },
];

export const reviewCompoundValuePacks: CompoundValuePack[] = [
  {
    id: 'compound-infooo-rubiks-cube-motion-graph',
    source: { contentType: 'infooo_world', sourceId: 'world-002' },
    canonicalUrl: '/infooo/rubiks-cube-motion-graph',
    status: 'draft',
    takeaway: 'A face turn moves a structured set of physical pieces, not just colored squares.',
    discoveryAngle: 'What actually moves when you turn a Rubik’s Cube?',
    socialDraft: {
      status: 'draft',
      humanApproved: false,
      hook: 'Turn one face. Watch one physical corner travel through the system.',
      copy: 'Rubik’s Cube Motion Graph shows one face turn on a familiar cube and in an orbital view of its twenty moving pieces.',
    },
    visualIdea: 'A recognizable three-face cube and a quiet twenty-piece orbital graph move together on one stage.',
    demo: {
      hook: 'What moves when you turn a face?',
      action: 'Apply R, isolate one corner, then trace it through a sequence.',
      reveal: 'The same physical corner changes position while remaining a corner.',
      takeaway: 'Cube state is a structured permutation, not a set of independent colored squares.',
    },
    notoooCandidate: { status: 'idea', title: 'What actually moves when you turn a Rubik’s Cube?' },
  },
];

export function validateCompoundValuePacks(
  packs: readonly CompoundValuePack[],
  sources: readonly ContentManifestItem[],
): string[] {
  const sourceByReference = new Map(sources.map((item) => [compoundValueReferenceKey({ contentType: item.contentType, sourceId: item.id }), item]));
  const errors: string[] = [];
  const unsafeVisitorData = /\b(?:raw\s+(?:(?:user|API)\s+)?(?:input|payload)|uploaded\s+file|localStorage\s+(?:history|data)|analytics\s+identifier|JWT)\b/i;

  for (const pack of packs) {
    if (unsafeVisitorData.test(JSON.stringify(pack))) errors.push(`${pack.id}: compound packs cannot contain raw visitor data`);
    if (!compoundValueStatuses.includes(pack.status)) errors.push(`${pack.id}: invalid pack status`);
    const source = sourceByReference.get(compoundValueReferenceKey(pack.source));
    if (!source) {
      errors.push(`${pack.id}: invalid source ID ${compoundValueReferenceKey(pack.source)}`);
      continue;
    }
    if (source.url !== pack.canonicalUrl) errors.push(`${pack.id}: canonical URL must match its source`);
    for (const related of pack.related ?? []) {
      if (!sourceByReference.has(compoundValueReferenceKey(related))) errors.push(`${pack.id}: invalid related ID ${compoundValueReferenceKey(related)}`);
    }
    if (pack.socialDraft) {
      if (!compoundValueStatuses.includes(pack.socialDraft.status)) errors.push(`${pack.id}: invalid social draft status`);
      if (pack.socialDraft.status === 'published' && !pack.socialDraft.humanApproved) errors.push(`${pack.id}: published social draft requires human approval`);
    }
  }

  return errors;
}
