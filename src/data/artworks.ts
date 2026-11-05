import { artworkDimensions } from './artworkDimensions';
import { rankRelatedArtworks } from '../utils/artworkRelations';

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  filename: string;
  tags: string[];
  width: number;
  height: number;
  description?: string;
  story?: string;
  year?: number;
  medium?: string;
  whatIWasThinking?: string;
  collection?: string;
  relatedArtwork?: string[];
  behindTheSketch?: string;
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

// Display titles are deliberately independent from filenames and stable slugs.
// These overrides cover the visually reviewed import-style and generic names;
// filenames continue to preserve the existing public artwork identities.
const artworkTitleOverrides: Record<string, string> = {
  'big-slave.jpg': 'Chained Elephant',
  'butterfly.jpg': 'Shattered Butterfly',
  'expressions.jpg': 'Green Face Study',
  'flower-01.jpg': 'Carnation Study',
  'flower-02.jpg': 'Pink Lily',
  'flower-03.jpg': 'Tulip Cluster',
  'flower-04.jpg': 'Sunflower Study',
  'Flower 05.jpg': 'Life Blooms Unexpectedly',
  'giraffe.jpg': 'Giraffe in a Book',
  'glamour.jpg': 'Figure Study',
  'hanging-kicls.jpg': 'Suspended High-Tops',
  'husband-punch.jpg': 'Green Portrait',
  'ice-cream.jpg': 'Melting Ice Cream Cone',
  'into-the-void-self-discovery.jpg': 'Into the Void',
  'jack-and-sally-01.jpg': 'Jack and Sally Together',
  'jack-and-sally-02.jpg': 'Jack and Sally Dance',
  'jo-jee.jpg': 'Jo-Jee',
  'just-a-chair.jpg': 'Wooden Chair Study',
  'learning-to-fly.jpg': 'Learning to Fly',
  'little-home-for-little-wings-2026.jpg': 'Birdhouse for Little Wings',
  'monster.jpg': 'Green Tentacled Monster',
  'mortaliy-flame.jpg': 'Skull Lighter',
  'octopus.jpg': 'Orange Octopus',
  'rare-intelligent-&-slave-creature.jpg': 'Creature in a Bottle',
  'raw-beauty-01.jpg': 'Yellow Portrait',
  'raw-beauty-02.jpg': 'Blonde Portrait',
  'raw-beauty-03.jpg': 'Sparkling Figure',
  'raw-beauty-04.jpg': 'Red Lip Portrait',
  'raw-beauty-05.jpg': 'Smiling Portrait',
  'raw-beauty-06.jpg': 'Upward Gaze',
  'raw-beauty-07.jpg': 'Profile Study',
  'raw-beauty-08.jpg': 'Covered Face',
  'raw-beauty-09.jpg': 'Seated Figure',
  'raw-beauty-10.jpg': 'Hands Behind Her Head',
  'raw-beauty-11.jpg': 'Radiant Heart',
  'raw-beauty-12.jpg': 'Short Hair Portrait',
  'raw-beauty-13.jpg': 'Purple Hair Portrait',
  'raw-beauty-14.jpg': 'Jacketed Figure',
  'raw-beauty-15.jpg': 'Glasses Portrait',
  'random-01.jpg': 'Orange Portrait',
  'random-02.jpg': 'Reaching Hands',
  'random-03.jpg': 'Crowned Silhouette',
  'random-04.jpg': 'Mushroom Tower',
  'random-05.jpg': 'Hidden Face',
  'random-06.jpg': 'Seated Conversation',
  'random-07.jpg': 'Split Gaze',
  'random-08.jpg': 'Four Friends',
  'random-09.jpg': 'Pink Duo',
  'random-10.jpg': 'Back Turn',
  'random-11.jpg': 'Heart Line',
  'random-12.jpg': 'Hooded Ghost',
  'random-13.jpg': 'Bearded Portrait',
  'random-14.jpg': 'Long-Haired Portrait',
  'random-15.jpg': 'Colorful Crowd',
  'random-16.jpg': 'Shadowed Man',
  'random-17.jpg': 'Curled Figure',
  'random-18.jpg': 'Winking Girl',
  'random-19.jpg': 'Smokestack Tower',
  'random-20.jpg': 'Crowned Head',
  'random-21.jpg': 'Winged Cat',
  'red-death.jpg': 'Withered Flowers',
  'the-spot.jpg': 'Stacked Houses',
  'tree-house-01.jpg': 'Lantern Treehouse',
  'tree-house-02.jpg': 'Ancient Treehouse',
  'tree-house-03.jpg': 'Stairway Treehouse',
  'whale-trip.jpg': 'Whale Rider',
  'what-we-hide.jpg': 'What We Hide',
};

const rawFiles: Array<Omit<Artwork, 'id' | 'slug' | 'title' | 'width' | 'height'>> = [
  // Story, perspective and process text supplied by Khizar on 2026-11-05.
  { filename: '1st-day-at-sea.jpg', tags: ['sea', 'nature', 'story'] },
  { filename: '2-worlds-whale.jpg', tags: ['fantasy', 'nature', 'animals', 'whale'] },
  { filename: 'a-sea-fish-story.jpg', tags: ['sea', 'animals', 'story'] },
  { filename: 'a-skull-rose-fusion.jpg', tags: ['dark', 'floral', 'concept'],
    story: "A skull and a rose together.",
    whatIWasThinking: "One shows death and the other shows life and beauty. I liked putting both ideas together.",
    behindTheSketch: "I wanted them to feel like one thing instead of two separate objects.",
  },
  { filename: 'back-beauty.jpg', tags: ['portrait', 'figure'] },
  { filename: 'bearded-titan.jpg', tags: ['portrait', 'fantasy'],
    story: "A strong face with a lot of character.",
    whatIWasThinking: "I enjoy drawing faces that look different and have some personality. Perfect faces are not always interesting.",
    behindTheSketch: "The beard and expression made him feel more like a character than a normal portrait.",
  },
  { filename: 'beautiful-cats.jpg', tags: ['animals', 'cute'] },
  { filename: 'beauty-in-eyes.jpg', tags: ['portrait', 'detail'] },
  { filename: 'big-bang-theory.jpg', tags: ['space', 'concept'] },
  { filename: 'big-slave.jpg', tags: ['dark', 'concept'],
    story: "An elephant is very strong, but even something strong can be trapped.",
    whatIWasThinking: "Power does not always mean freedom.",
    behindTheSketch: "The main idea was simple: a very powerful animal controlled by a small chain.",
  },
  { filename: 'big-things.jpg', tags: ['fantasy', 'concept'] },
  { filename: 'blind-hope.jpg', tags: ['portrait', 'emotional'] },
  { filename: 'blocked-view.jpg', tags: ['concept', 'perspective'] },
  { filename: 'blooming-frog.jpg', tags: ['animals', 'floral', 'cute'],
    story: "A frog mixed with flowers.",
    whatIWasThinking: "There is no serious reason behind every artwork. Sometimes I just like mixing things that normally do not belong together.",
    behindTheSketch: "This one came from my fun and random side.",
  },
  { filename: 'blooming-genetics.jpg', tags: ['science', 'floral', 'concept'],
    story: "DNA and flowers together.",
    whatIWasThinking: "This one connects my tech side and my artist side. One side sees patterns and systems. The other side sees nature and beauty.",
    behindTheSketch: "I wanted science and nature to feel connected.",
  },
  { filename: 'blue-chef-remy.jpg', tags: ['character', 'food', 'fun'] },
  { filename: 'broken-hand.jpg', tags: ['dark', 'concept', 'detail'] },
  { filename: 'bubble-burst.jpg', tags: ['concept', 'abstract'] },
  { filename: 'butterfly.jpg', tags: ['nature', 'floral'] },
  { filename: 'captured-mermaid.jpg', tags: ['fantasy', 'sea', 'figure'], description: 'A mermaid curls inside a green glass bottle, with its tail rising toward the stopper.',
    story: "A mermaid belongs in the sea, but here she is trapped inside a small place.",
    whatIWasThinking: "Sometimes we like something so much that we try to keep it with us, even if it means taking away its freedom.",
    behindTheSketch: "I liked the strange idea of putting a mermaid somewhere she should never be.",
  },
  { filename: 'cat-and-coffee-mug.jpg', tags: ['animals', 'cute', 'cosy'] },
  { filename: 'chaotic-vision.jpg', tags: ['abstract', 'concept'] },
  { filename: 'crocodile-&-whiskey.jpg', tags: ['animals', 'fun', 'dark'],
    story: "A small crocodile inside a whiskey glass. No big meaning. I just liked the weird idea.",
    whatIWasThinking: "Sometimes random ideas come into my head and I just want to draw them.",
    behindTheSketch: "I wanted something funny and strange that makes people look twice.",
  },
  { filename: 'dead-land.jpg', tags: ['dark', 'nature', 'landscape'] },
  { filename: 'dreamer.jpg', tags: ['portrait', 'emotional', 'sky'] },
  { filename: 'dreams-&-reality.jpg', tags: ['concept', 'emotional', 'fantasy'],
    story: "We all have dreams, but we also have real life.",
    whatIWasThinking: "I was thinking about the space between where we are and where we want to be.",
    behindTheSketch: "I wanted both sides to exist together instead of showing one as good and the other as bad.",
  },
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
  { filename: 'hanging-kicls.jpg', tags: ['street', 'concept'] },
  { filename: 'haunted-book.jpg', tags: ['dark', 'fantasy', 'magic'] },
  { filename: 'haunted-cabin.jpg', tags: ['dark', 'landscape', 'architecture'] },
  { filename: 'haunted-red-fort-of-khziooo.jpg', tags: ['dark', 'architecture', 'personal'],
    story: "A dark old fort from my imagination.",
    whatIWasThinking: "I like old places because they always make me wonder what happened there before.",
    behindTheSketch: "I wanted to create my own mysterious place instead of copying a real one.",
  },
  { filename: 'heart-grenade.jpg', tags: ['dark', 'concept', 'emotional'],
    story: "A heart and a grenade together.",
    whatIWasThinking: "Love can make you very happy, but it can also hurt badly.",
    behindTheSketch: "The idea was simple: mix love with something dangerous.",
  },
  { filename: 'house-blender.jpg', tags: ['surreal', 'concept'] },
  { filename: 'huda.jpg', tags: ['portrait', 'personal'] },
  { filename: 'husband-punch.jpg', tags: ['dark', 'concept'] },
  { filename: 'i-believe-i-can-fly.jpg', tags: ['emotional', 'sky', 'freedom'] },
  { filename: 'ice-cream.jpg', tags: ['food', 'cute', 'fun'] },
  { filename: 'into-the-void-self-discovery.jpg', tags: ['portrait', 'emotional', 'concept'],
    story: "Sometimes you have to move forward even when you do not know what is ahead.",
    whatIWasThinking: "Finding yourself is not always clear. Sometimes you have to go into the unknown.",
    behindTheSketch: "I wanted the empty space to be part of the artwork.",
  },
  { filename: 'jack-and-sally-01.jpg', tags: ['character', 'dark', 'romance'] },
  { filename: 'jack-and-sally-02.jpg', tags: ['character', 'dark', 'romance'], description: 'Jack bows toward Sally, with small hearts drawn around the pair.' },
  { filename: 'jenni.jpg', tags: ['portrait', 'personal'] },
  { filename: 'junior-professor.jpg', tags: ['character', 'fun', 'education'] },
  { filename: 'jo-jee.jpg', tags: ['character', 'portrait', 'fun'] },
  { filename: 'just-a-chair.jpg', tags: ['concept', 'minimalism'] },
  { filename: 'key-of-hearts.jpg', tags: ['fantasy', 'magic', 'romance'] },
  { filename: 'legendary-war-horse.jpg', tags: ['animals', 'fantasy', 'epic'] },
  { filename: 'life-within-the-jar.jpg', tags: ['concept', 'surreal', 'nature'],
    story: "A small jar can hold a whole little world.",
    whatIWasThinking: "Small things can still have a lot inside them.",
    behindTheSketch: "I like putting strange little worlds inside normal everyday objects.",
  },
  { filename: 'learning-to-fly.jpg', tags: ['portrait', 'emotional', 'freedom'],
    story: "This one is about trying to go beyond your limits.",
    whatIWasThinking: "You cannot fly if you never try to leave the ground.",
    behindTheSketch: "For me, flying here means freedom and growth.",
  },
  { filename: 'little-home-for-little-wings-2026.jpg', tags: ['nature', 'animals', 'cosy'] },
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
  { filename: 'mysterious-giantess.jpg', tags: ['fantasy', 'figure', 'surreal'],
    story: "A normal person becomes something very different when everything around her looks tiny.",
    whatIWasThinking: "I was imagining what the world would look like if a human suddenly became huge.",
    behindTheSketch: "I wanted people to look at her and make their own story.",
  },
  { filename: 'mystical-beauty.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'mystical-hand.jpg', tags: ['detail', 'magic', 'dark'] },
  { filename: 'naked-beauty.jpg', tags: ['portrait', 'figure', 'emotional'] },
  { filename: 'nature-excavation.jpg', tags: ['nature', 'concept'] },
  { filename: 'ocean-light.jpg', tags: ['sea', 'nature', 'light'] },
  { filename: 'octopus.jpg', tags: ['sea', 'animals', 'fantasy'] },
  { filename: 'peak-perfection.jpg', tags: ['nature', 'landscape', 'emotional'] },
  { filename: 'portal-to-the-past.jpg', tags: ['fantasy', 'magic', 'surreal'],
    story: "I like old doors because they always make me think about the past. So many people may have used the same door before us.",
    whatIWasThinking: "I was thinking about where this door could lead and what kind of stories may be behind it.",
    behindTheSketch: "I wanted it to feel like a door to another time, not just an old door.",
  },
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
  { filename: 'red-death.jpg', tags: ['dark', 'floral'] },
  { filename: 'red-gandalf.jpg', tags: ['character', 'fantasy', 'dark'] },
  { filename: 'red-rose.jpg', tags: ['floral', 'dark', 'romance'] },
  { filename: 'rose-enchanted.jpg', tags: ['floral', 'magic', 'fantasy'] },
  { filename: 'rose-head.jpg', tags: ['floral', 'portrait', 'surreal'] },
  { filename: 'rustic-rum-cup.jpg', tags: ['food', 'vintage', 'cosy'] },
  { filename: 'sad-water.jpg', tags: ['nature', 'emotional', 'dark'] },
  { filename: 'seeing-speaking-listening.jpg', tags: ['concept', 'portrait', 'dark'],
    story: "Good communication is not only about speaking.",
    whatIWasThinking: "Sometimes people talk a lot but still do not really see or listen to each other.",
    behindTheSketch: "I wanted the artwork itself to explain the idea without adding a lot of words.",
  },
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
  { filename: 'tale-of-ella-two-faces.jpg', tags: ['character', 'story', 'dark'],
    story: "One person can have more than one side.",
    whatIWasThinking: "People act differently depending on the situation, the people around them, and what they are feeling.",
    behindTheSketch: "Two faces were a simple way to show that idea.",
  },
  { filename: 'the-spot.jpg', tags: ['concept', 'abstract'] },
  { filename: 'tree-house-01.jpg', tags: ['nature', 'landscape', 'cosy'], description: 'A tall tree supports stacked rooms, a pointed roof and a hanging lantern.' },
  { filename: 'tree-house-02.jpg', tags: ['nature', 'landscape', 'cosy'], description: 'A branching tree supports a house with a steep roof, a balcony and a ladder.' },
  { filename: 'tree-house-03.jpg', tags: ['nature', 'landscape', 'cosy'], description: 'Rooms and stairways wrap around a bare tree trunk.' },
  { filename: 'twisting-hand.jpg', tags: ['dark', 'detail', 'concept'] },
  { filename: 'unseen-whispers.jpg', tags: ['dark', 'concept', 'emotional'],
    story: "Some things affect us even when nobody else can see them.",
    whatIWasThinking: "Thoughts, memories and words can stay in our minds for a long time.",
    behindTheSketch: "I wanted it to feel quiet and personal.",
  },
  { filename: 'unstoppable-strength.jpg', tags: ['concept', 'emotional', 'dark'] },
  { filename: 'vintage-scooter.jpg', tags: ['vintage', 'vehicle', 'art'] },
  { filename: 'watchful-wanderer.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'whale-trip.jpg', tags: ['sea', 'fantasy', 'animals', 'whale'], description: 'A small rider sits on the back of a blue whale.',
    story: "A whale carrying a traveler through the sea.",
    whatIWasThinking: "I like the idea of travelling in ways that are only possible in imagination.",
    behindTheSketch: "I wanted it to feel like a strange but peaceful journey.",
  },
  { filename: 'what-we-hide.jpg', tags: ['portrait', 'emotional', 'concept'],
    story: "Everyone hides something.",
    whatIWasThinking: "A face can show many things, but it can also hide what is really happening inside.",
    behindTheSketch: "I did not want to explain exactly what is hidden. Everyone can see their own meaning in it.",
  },
  { filename: 'wild-eyed-wanderer.jpg', tags: ['portrait', 'fantasy'] },
  { filename: 'wise-toad.jpg', tags: ['animals', 'character', 'fun'] },
  { filename: 'young-girl-vs-dark-wind.jpg', tags: ['portrait', 'dark', 'emotional'] },
  // Import-style filenames keep their identities; tags describe visually reviewed subjects.
  ...[
    ['portrait'], ['detail', 'figure'], ['figure'], ['architecture', 'fantasy'],
    ['portrait', 'figure'], ['figure'], ['portrait'], ['portrait', 'figure'],
    ['portrait', 'figure'], ['figure'], ['portrait', 'romance'], ['character', 'fantasy'],
    ['portrait'], ['portrait'], ['portrait'], ['portrait'], ['figure'], ['portrait'],
    ['architecture'], ['portrait', 'figure'], ['animals', 'fantasy'],
  ].map((tags, i) => ({ filename: `random-${String(i + 1).padStart(2, '0')}.jpg`, tags })),
];

const normalizedSlugCounts = rawFiles.reduce((counts, { filename }) => {
  const slug = normalizeArtworkSlug(filename);
  counts.set(slug, (counts.get(slug) || 0) + 1);
  return counts;
}, new Map<string, number>());

// Numbered filenames establish these series; they do not establish artist collections.
const numberedSeries = (filename: string) => filename.match(/^(tree-house|flower|raw-beauty|jack-and-sally)[ -]\d+\.jpg$/i)?.[1].toLowerCase();

export const artworks: Artwork[] = rawFiles.map(({ filename, tags, ...context }) => {
  const normalizedSlug = normalizeArtworkSlug(filename);
  const slug = normalizedSlugCounts.get(normalizedSlug)! > 1
    ? `${normalizedSlug}-${stableFilenameHash(filename)}`
    : normalizedSlug;
  const dimensions = artworkDimensions[filename as keyof typeof artworkDimensions];

  return {
    id: `artwork:${filename}`,
    slug,
    title: artworkTitleOverrides[filename] ?? slugToTitle(filename),
    filename,
    tags,
    ...context,
    ...(!context.relatedArtwork && numberedSeries(filename) ? { relatedArtwork: rawFiles.filter(item => item.filename !== filename && numberedSeries(item.filename) === numberedSeries(filename)).map(item => normalizeArtworkSlug(item.filename)) } : {}),
    width: dimensions.width,
    height: dimensions.height,
  };
});

// Unique tag list
export const artworkTags = [...new Set(artworks.flatMap((a) => a.tags))].sort();

// Collections remain empty until Khizar provides intentional classification.
export const artworkCollections = [...new Set(artworks.flatMap((artwork) => artwork.collection ? [artwork.collection] : []))].sort();

export function getRelatedArtworks(artwork: Artwork, limit = 3): Artwork[] {
  return rankRelatedArtworks(artwork, artworks, limit);
}

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
