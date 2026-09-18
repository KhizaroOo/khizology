export const notoooCategories = ['Mind', 'Money', 'Nature', 'Life', 'People', 'Society'] as const;
export type NotoooCategory = typeof notoooCategories[number];
export type NotoooBookStatus = 'draft' | 'published';
export type NotoooContentFormat = 'book';

export interface NotoooBook {
  id: string;
  number: number;
  slug: string;
  title: string;
  author: string;
  publicationYear?: number;
  format: NotoooContentFormat;
  category: NotoooCategory;
  tags: string[];
  summaryImage: string;
  originalDownload: string;
  printDownload: string;
  alt: string;
  shortDescription: string;
  whyItMatters: string;
  keyIdeas: string[];
  khizoooTakeaway: string;
  editionNote?: string;
  relatedBooks?: string[];
  publishedAt: string;
  updatedAt?: string;
  featured?: boolean;
  status: NotoooBookStatus;
  sheet: { bigIdea: string; systemsLine: string; identity: string; habitLoop: string[]; laws: Array<{ title: string; note: string }>; environment: string; startSmall: string; consistency: string; takeaway: string; remember: string; };
}

export const notoooIdentity = {
  id: 'notooo',
  monsterId: 'notooo',
  status: 'active' as const,
  type: 'Book in One Page',
  role: 'REMEMBER',
  tagline: 'One Book. One Page.',
  supportingLine: 'Big knowledge. Small space. Simple words.',
  philosophy: 'Research, understand, filter, compress, and visualize the useful ideas in one simple knowledge page.',
  mission: 'Preserve useful knowledge in a form worth returning to.',
  disclosure: 'A khizooo-curated one-page synthesis created with AI-assisted research. It captures useful ideas, not the complete book.',
  notReplacementNotice: 'Notooo is not a replacement for reading the original book.',
  mascot: null,
  mascotNote: 'No final Notooo mascot asset is assigned yet.',
  pageFormat: 'A4 portrait',
  color: '#E38D7C',
  colorLight: '#FED7AA',
} as const;

// Add approved public Book in One Page entries here after their release is approved.
export const notoooBooks: NotoooBook[] = [{
  id: 'atomic-habits', number: 1, slug: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear', publicationYear: 2018,
  format: 'book', category: 'Mind', tags: ['Habits', 'Behavior', 'Identity', 'Systems', 'Self Improvement'], summaryImage: '', originalDownload: '', printDownload: '',
  alt: 'Visual one-page Notooo synthesis of Atomic Habits by James Clear',
  shortDescription: 'Atomic Habits by James Clear compressed into one visual Notooo page covering identity, systems, the habit loop, Four Laws, environment and consistency.',
  whyItMatters: 'Atomic Habits provides a practical way to think about behavior change: make useful actions easier to repeat, shape the environment around them, and focus on the identity built through repetition rather than depending only on motivation.',
  keyIdeas: ['Small changes compound', 'Identity grows through repeated actions', 'Systems move progress forward', 'Habits follow a cue-to-reward loop', 'Make good habits obvious, attractive, easy, and satisfying'],
  khizoooTakeaway: 'Build an environment and system where the useful action becomes easier to repeat — then let repetition slowly change who you become.',
  editionNote: 'Published by Avery, 2018.', publishedAt: '2026-09-17', status: 'published', featured: true,
  sheet: { bigIdea: 'Your life rarely changes because of one huge action. It changes when small actions become repeated systems.', systemsLine: 'SMALL ACTION → REPEAT → IDENTITY → RESULTS', identity: 'IDENTITY → ACTION → EVIDENCE → STRONGER IDENTITY', habitLoop: ['CUE', 'CRAVING', 'RESPONSE', 'REWARD'], laws: [{ title: 'OBVIOUS', note: 'Make the trigger visible.' }, { title: 'ATTRACTIVE', note: 'Make yourself want it.' }, { title: 'EASY', note: 'Reduce friction.' }, { title: 'SATISFYING', note: 'Give the brain a reason to repeat it.' }], environment: 'Make good choices convenient. Make bad choices inconvenient.', startSmall: 'Shrink the beginning until starting feels almost effortless.', consistency: 'One miss is an event. Return quickly.', takeaway: 'The strongest idea is to stop treating change as one heroic moment.', remember: 'Don’t chase one perfect day. Build a system you can return to tomorrow.' },
}];
export const publishedNotoooBooks = notoooBooks.filter((book) => book.status === 'published');
export const hasPublishedNotoooBooks = publishedNotoooBooks.length > 0;

export function getNotoooBook(slug: string) {
  return publishedNotoooBooks.find((book) => book.slug === slug);
}

export function relatedNotoooBooks(book: NotoooBook) {
  const ids = new Set(book.relatedBooks || []);
  return publishedNotoooBooks.filter((candidate) => candidate.id !== book.id && ids.has(candidate.id));
}

export function validateNotoooBooks(books: NotoooBook[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const numbers = new Set<number>();
  const slugs = new Set<string>();
  const validCategories = new Set<string>(notoooCategories);

  for (const book of books) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.id)) errors.push(`${book.id}: id must be lowercase kebab-case`);
    if (ids.has(book.id)) errors.push(`${book.id}: duplicate id`);
    ids.add(book.id);
    if (!Number.isInteger(book.number) || book.number < 1) errors.push(`${book.id}: number must be a positive integer`);
    if (numbers.has(book.number)) errors.push(`${book.id}: duplicate number`);
    numbers.add(book.number);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug)) errors.push(`${book.id}: slug must be lowercase kebab-case`);
    if (slugs.has(book.slug)) errors.push(`${book.slug}: duplicate slug`);
    slugs.add(book.slug);
    if (!validCategories.has(book.category)) errors.push(`${book.slug}: invalid category`);
    if (book.format !== 'book') errors.push(`${book.slug}: unsupported Notooo format`);
    for (const [label, value] of Object.entries({ title: book.title, author: book.author, alt: book.alt, shortDescription: book.shortDescription, whyItMatters: book.whyItMatters, khizoooTakeaway: book.khizoooTakeaway, publishedAt: book.publishedAt })) {
      if (!value.trim()) errors.push(`${book.slug}: missing ${label}`);
    }
    if (!book.keyIdeas.length) errors.push(`${book.slug}: add at least one paraphrased key idea`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(book.publishedAt)) errors.push(`${book.slug}: publishedAt must use YYYY-MM-DD`);
    if (book.updatedAt && !/^\d{4}-\d{2}-\d{2}$/.test(book.updatedAt)) errors.push(`${book.slug}: updatedAt must use YYYY-MM-DD`);
    if (book.publicationYear && (!Number.isInteger(book.publicationYear) || book.publicationYear < 1)) errors.push(`${book.slug}: invalid publicationYear`);
    if (book.relatedBooks?.includes(book.id)) errors.push(`${book.slug}: cannot relate to itself`);
  }

  for (const book of books) for (const relatedId of book.relatedBooks || []) {
    if (!ids.has(relatedId)) errors.push(`${book.slug}: broken related book reference ${relatedId}`);
  }
  return errors;
}
