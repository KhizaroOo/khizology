import { artworkDimensions } from './artworkDimensions';

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  filename: string;
  tags: string[];
  width: number;
  height: number;
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeArtworkSlug(filename: string): string {
  return filename
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stableFilenameHash(filename: string): string {
  let hash = 2166136261;
  for (const character of filename) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}

const rawFiles: Array<{ filename: string; tags: string[] }> = [
  { filename: '1st-day-at-sea.jpg', tags: ['sea', 'nature', 'story'] },
  { filename: '2-worlds-whale.jpg', tags: ['fantasy', 'nature', 'whale'] },
  { filename: 'a-sea-fish-story.jpg', tags: ['sea', 'animals', 'story'] },
  { filename: 'a-skull-rose-fusion.jpg', tags: ['dark', 'floral', 'concept'] },
  { filename: 'back-beauty.jpg', tags: ['portrait', 'figure'] },
  { filename: 'bearded-titan.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'beautiful-cats.jpg', tags: ['animals', 'cute'] },
  { filename: 'beauty-in-eyes.jpg', tags: ['portrait', 'detail'] },
  { filename: 'big-bang-theory.jpg', tags: ['space', 'concept'] },
  { filename: 'big-slave.jpg', tags: ['dark', 'concept'] },
  { filename: 'big-things.jpg', tags: ['fantasy', 'concept'] },
  { filename: 'blind-hope.jpg', tags: ['portrait', 'emotional'] },
  { filename: 'blocked-view.jpg', tags: ['concept', 'perspective'] },
  { filename: 'blooming-frog.jpg', tags: ['animals', 'floral', 'cute'] },
  { filename: 'blooming-genetics.jpg', tags: ['science', 'floral', 'concept'] },
  { filename: 'blue-chef-remy.jpg', tags: ['character', 'food', 'fun'] },
  { filename: 'broken-hand.jpg', tags: ['dark', 'concept', 'detail'] },
  { filename: 'bubble-burst.jpg', tags: ['concept', 'abstract'] },
  { filename: 'butterfly.jpg', tags: ['nature', 'floral'] },
  { filename: 'captured-mermaid.jpg', tags: ['fantasy', 'sea', 'figure'] },
  { filename: 'cat-and-coffee-mug.jpg', tags: ['animals', 'cute', 'cosy'] },
  { filename: 'chaotic-vision.jpg', tags: ['abstract', 'concept'] },
  { filename: 'crocodile-&-whiskey.jpg', tags: ['animals', 'fun', 'dark'] },
  { filename: 'dead-land.jpg', tags: ['dark', 'nature', 'landscape'] },
  { filename: 'dreamer.jpg', tags: ['portrait', 'emotional', 'sky'] },
  { filename: 'dreams-&-reality.jpg', tags: ['concept', 'emotional', 'fantasy'] },
  { filename: 'echoes-of-the-forest-house.jpg', tags: ['nature', 'landscape', 'fantasy'] },
  { filename: 'enchanted-lamp.jpg', tags: ['fantasy', 'light', 'magic'] },
  { filename: 'enchanting-muse.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'eternal-blaze.jpg', tags: ['fire', 'concept', 'dark'] },
  { filename: 'expressions.jpg', tags: ['portrait', 'emotional'] },
  { filename: 'eyes-that-speak.jpg', tags: ['portrait', 'detail'] },
  { filename: 'fall-of-a-model.jpg', tags: ['portrait', 'fashion', 'dark'] },
  { filename: 'fanon-the-angry-bird.jpg', tags: ['character', 'fun', 'animals'] },
  { filename: 'flirting.jpg', tags: ['portrait', 'emotional'] },
  { filename: 'flower-01.jpg', tags: ['floral', 'nature'] },
  { filename: 'flower-02.jpg', tags: ['floral', 'nature'] },
  { filename: 'flower-03.jpg', tags: ['floral', 'nature'] },
  { filename: 'flower-04.jpg', tags: ['floral', 'nature'] },
  { filename: 'flower-05.jpg', tags: ['floral', 'nature'] },
  { filename: 'Flower 05.jpg', tags: ['floral', 'nature'] },
  { filename: 'flowered-dreams.jpg', tags: ['floral', 'fantasy', 'emotional'] },
  { filename: 'flying-key.jpg', tags: ['fantasy', 'magic', 'concept'] },
  { filename: 'fulgent-life.jpg', tags: ['nature', 'light', 'emotional'] },
  { filename: 'giraffe.jpg', tags: ['animals', 'nature'] },
  { filename: 'girl-and-her-rose-crown.jpg', tags: ['portrait', 'floral', 'figure'] },
  { filename: 'girl-with-no-eyes.jpg', tags: ['portrait', 'dark', 'surreal'] },
  { filename: 'girl-with-painted-face.jpg', tags: ['portrait', 'art', 'figure'] },
  { filename: 'glamour.jpg', tags: ['portrait', 'fashion'] },
  { filename: 'good-morning.jpg', tags: ['cosy', 'nature', 'light'] },
  { filename: 'gothic-romance.jpg', tags: ['dark', 'romance', 'portrait'] },
  { filename: 'great-sea-beast-terror.jpg', tags: ['sea', 'dark', 'fantasy'] },
  { filename: 'green-skirt-girl.jpg', tags: ['portrait', 'fashion', 'figure'] },
  { filename: 'guard-tower.jpg', tags: ['architecture', 'dark', 'concept'] },
  { filename: 'hanging-kicks.jpg', tags: ['street', 'concept'] },
  { filename: 'hanging-kicls.jpg', tags: ['street', 'concept'] },
  { filename: 'haunted-book.jpg', tags: ['dark', 'fantasy', 'magic'] },
  { filename: 'haunted-cabin.jpg', tags: ['dark', 'landscape', 'architecture'] },
  { filename: 'haunted-red-fort-of-khziooo.jpg', tags: ['dark', 'architecture', 'personal'] },
  { filename: 'heart-grenade.jpg', tags: ['dark', 'concept', 'emotional'] },
  { filename: 'house-blender.jpg', tags: ['surreal', 'concept'] },
  { filename: 'huda.jpg', tags: ['portrait', 'personal'] },
  { filename: 'husband-punch.jpg', tags: ['dark', 'concept'] },
  { filename: 'i-believe-i-can-fly.jpg', tags: ['emotional', 'sky', 'freedom'] },
  { filename: 'ice-cream.jpg', tags: ['food', 'cute', 'fun'] },
  { filename: 'jack-and-sally-01.jpg', tags: ['character', 'dark', 'romance'] },
  { filename: 'jack-and-sally-02.jpg', tags: ['character', 'dark', 'romance'] },
  { filename: 'jenni.jpg', tags: ['portrait', 'personal'] },
  { filename: 'junior-professor.jpg', tags: ['character', 'fun', 'education'] },
  { filename: 'just-a-chair.jpg', tags: ['concept', 'minimalism'] },
  { filename: 'key-of-hearts.jpg', tags: ['fantasy', 'magic', 'romance'] },
  { filename: 'legendary-war-horse.jpg', tags: ['animals', 'fantasy', 'epic'] },
  { filename: 'life-within-the-jar.jpg', tags: ['concept', 'surreal', 'nature'] },
  { filename: 'little-home-for-little-wings.jpg', tags: ['nature', 'animals', 'cosy'] },
  { filename: 'little-princess.jpg', tags: ['portrait', 'fantasy', 'cute'] },
  { filename: 'lost-and-found.jpg', tags: ['emotional', 'concept'] },
  { filename: 'lost-in-thought.jpg', tags: ['portrait', 'emotional'] },
  { filename: 'luna-pink-cat.jpg', tags: ['animals', 'cute', 'fantasy'] },
  { filename: 'magical-pencil.jpg', tags: ['art', 'magic', 'concept'] },
  { filename: 'midnight-muse.jpg', tags: ['dark', 'portrait', 'emotional'] },
  { filename: 'monster.jpg', tags: ['dark', 'fantasy', 'character'] },
  { filename: 'morning-rituals.jpg', tags: ['cosy', 'lifestyle'] },
  { filename: 'mortaliy-flame.jpg', tags: ['dark', 'fire', 'concept'] },
  { filename: 'my-max.jpg', tags: ['animals', 'personal', 'cute'] },
  { filename: 'mysterious-brick-cave.jpg', tags: ['architecture', 'dark', 'landscape'] },
  { filename: 'mysterious-giantess.jpg', tags: ['fantasy', 'figure', 'surreal'] },
  { filename: 'mystical-beauty.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'mystical-hand.jpg', tags: ['detail', 'magic', 'dark'] },
  { filename: 'naked-beauty.jpg', tags: ['portrait', 'figure', 'emotional'] },
  { filename: 'nature-excavation.jpg', tags: ['nature', 'concept'] },
  { filename: 'ocean-light.jpg', tags: ['sea', 'nature', 'light'] },
  { filename: 'octopus.jpg', tags: ['sea', 'animals', 'fantasy'] },
  { filename: 'peak-perfection.jpg', tags: ['nature', 'landscape', 'emotional'] },
  { filename: 'portal-to-the-past.jpg', tags: ['fantasy', 'magic', 'surreal'] },
  { filename: 'positive-in-everything.jpg', tags: ['emotional', 'concept'] },
  { filename: 'prey.jpg', tags: ['dark', 'animals', 'concept'] },
  { filename: 'rapunzel.jpg', tags: ['fantasy', 'character', 'story'] },
  { filename: 'rare-intelligent-&-slave-creature.jpg', tags: ['dark', 'fantasy', 'character'] },
  { filename: 'raw-beauty-01.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-02.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-03.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-04.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-05.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-06.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-07.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-08.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-09.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-10.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-11.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-12.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-13.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-14.jpg', tags: ['portrait', 'figure'] },
  { filename: 'raw-beauty-15.jpg', tags: ['portrait', 'figure'] },
  { filename: 'rebirth.jpg', tags: ['emotional', 'concept', 'fantasy'] },
  { filename: 'red-death.jpg', tags: ['dark', 'concept'] },
  { filename: 'red-gandalf.jpg', tags: ['character', 'fantasy', 'dark'] },
  { filename: 'red-rose.jpg', tags: ['floral', 'dark', 'romance'] },
  { filename: 'rose-enchanted.jpg', tags: ['floral', 'magic', 'fantasy'] },
  { filename: 'rose-head.jpg', tags: ['floral', 'portrait', 'surreal'] },
  { filename: 'rustic-rum-cup.jpg', tags: ['food', 'vintage', 'cosy'] },
  { filename: 'sad-water.jpg', tags: ['nature', 'emotional', 'dark'] },
  { filename: 'seeing-speaking-listening.jpg', tags: ['concept', 'portrait', 'dark'] },
  { filename: 'shadow-watcher.jpg', tags: ['dark', 'concept', 'surreal'] },
  { filename: 'shiny-blue-eyes-girl.jpg', tags: ['portrait', 'detail'] },
  { filename: 'silent-bonds.jpg', tags: ['emotional', 'concept'] },
  { filename: 'silent-scream.jpg', tags: ['dark', 'emotional'] },
  { filename: 'silent_screams.jpg', tags: ['dark', 'emotional'] },
  { filename: 'smiling-nightmare.jpg', tags: ['dark', 'surreal', 'portrait'] },
  { filename: 'smoker-lips.jpg', tags: ['portrait', 'detail', 'dark'] },
  { filename: 'space-love.jpg', tags: ['space', 'romance', 'fantasy'] },
  { filename: 'speaking-eyes.jpg', tags: ['portrait', 'detail', 'emotional'] },
  { filename: 'story-of-the-acropolis.jpg', tags: ['architecture', 'history', 'landscape'] },
  { filename: 'stylish-rooster.jpg', tags: ['animals', 'character', 'fun'] },
  { filename: 'tale-of-ella-two-faces.jpg', tags: ['character', 'story', 'dark'] },
  { filename: 'the-spot.jpg', tags: ['concept', 'abstract'] },
  { filename: 'tree-house-01.jpg', tags: ['nature', 'landscape', 'cosy'] },
  { filename: 'tree-house-02.jpg', tags: ['nature', 'landscape', 'cosy'] },
  { filename: 'tree-house-03.jpg', tags: ['nature', 'landscape', 'cosy'] },
  { filename: 'twisting-hand.jpg', tags: ['dark', 'detail', 'concept'] },
  { filename: 'unseen-whispers.jpg', tags: ['dark', 'concept', 'emotional'] },
  { filename: 'unstoppable-strength.jpg', tags: ['concept', 'emotional', 'dark'] },
  { filename: 'vintage-scooter.jpg', tags: ['vintage', 'vehicle', 'art'] },
  { filename: 'watchful-wanderer.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'whale-trip.jpg', tags: ['sea', 'fantasy', 'animals'] },
  { filename: 'wild-eyed-wanderer.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'wise-toad.jpg', tags: ['animals', 'character', 'fun'] },
  { filename: 'young-girl-vs-dark-wind.jpg', tags: ['portrait', 'dark', 'emotional'] },
  // random series
  ...Array.from({ length: 21 }, (_, i) => ({
    filename: `random-${String(i + 1).padStart(2, '0')}.jpg`,
    tags: ['random', 'sketch'],
  })),
];

const normalizedSlugCounts = rawFiles.reduce((counts, { filename }) => {
  const slug = normalizeArtworkSlug(filename);
  counts.set(slug, (counts.get(slug) || 0) + 1);
  return counts;
}, new Map<string, number>());

export const artworks: Artwork[] = rawFiles.map(({ filename, tags }) => {
  const normalizedSlug = normalizeArtworkSlug(filename);
  const slug = normalizedSlugCounts.get(normalizedSlug)! > 1
    ? `${normalizedSlug}-${stableFilenameHash(filename)}`
    : normalizedSlug;
  const dimensions = artworkDimensions[filename as keyof typeof artworkDimensions];

  return {
    id: `artwork:${filename}`,
    slug,
    title: slugToTitle(filename),
    filename,
    tags,
    width: dimensions.width,
    height: dimensions.height,
  };
});

// Unique tag list
export const artworkTags = [...new Set(artworks.flatMap((a) => a.tags))].sort();

// Featured artworks for homepage preview (hand-picked)
export const featuredArtworks: Artwork[] = [
  'blooming-frog',
  'enchanted-lamp',
  'captured-mermaid',
  'luna-pink-cat',
  'legendary-war-horse',
  'space-love',
  'portal-to-the-past',
  'dreamer',
  'rose-head',
  'mysterious-giantess',
  'heart-grenade',
  'stylish-rooster',
]
  .map((slug) => artworks.find((a) => a.slug === slug))
  .filter(Boolean) as Artwork[];
