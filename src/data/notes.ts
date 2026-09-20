import { getCollection, type CollectionEntry } from 'astro:content';

export type NoteEntry = CollectionEntry<'notes'>;

export function notePath(slug: string) {
  return `/notes/${slug}`;
}

export function readingTime(note: NoteEntry) {
  const words = (note.body || '').replace(/```[\s\S]*?```/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length || 0;
  return Math.max(1, Math.ceil(words / 220));
}

export function validateNotes(notes: NoteEntry[]) {
  const errors: string[] = [];
  const bySlug = new Map<string, NoteEntry>();

  for (const note of notes) {
    const slug = note.data.slug;
    if (bySlug.has(slug)) errors.push(`Duplicate note slug "${slug}" in ${bySlug.get(slug)?.id} and ${note.id}.`);
    else bySlug.set(slug, note);
  }

  for (const note of notes.filter((item) => item.data.status === 'published')) {
    const references = new Set<string>();
    for (const slug of note.data.relatedNotes) {
      if (slug === note.data.slug) errors.push(`${note.id}: a note cannot relate to itself.`);
      else if (references.has(slug)) errors.push(`${note.id}: duplicate related note "${slug}".`);
      else references.add(slug);

      const related = bySlug.get(slug);
      if (!related) errors.push(`${note.id}: related note "${slug}" does not exist.`);
      else if (related.data.status !== 'published') errors.push(`${note.id}: related note "${slug}" is not published.`);
    }
  }

  return errors;
}

export async function getAllNotes() {
  const notes = await getCollection('notes');
  const errors = validateNotes(notes);
  if (errors.length) throw new Error(`Notes validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  return notes;
}

export async function getPublishedNotes() {
  const notes = await getAllNotes();
  return notes
    .filter((note) => note.data.status === 'published')
    .sort((left, right) => right.data.publishedAt!.getTime() - left.data.publishedAt!.getTime());
}

export function relatedPublishedNotes(note: NoteEntry, publishedNotes: NoteEntry[]) {
  const bySlug = new Map(publishedNotes.map((entry) => [entry.data.slug, entry]));
  return note.data.relatedNotes.map((slug) => bySlug.get(slug)).filter((entry): entry is NoteEntry => Boolean(entry));
}
