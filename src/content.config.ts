import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { noteCategories } from './data/noteCategories';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase, hyphenated slug.');

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(3).max(52),
    description: z.string().min(30).max(160),
    slug,
    category: z.enum(noteCategories),
    tags: z.array(z.string().min(1).max(32)).max(8).default([]),
    status: z.enum(['draft', 'published']).default('draft'),
    featured: z.boolean().default(false),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    image: z.string().startsWith('/').optional(),
    imageAlt: z.string().min(3).max(160).optional(),
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    author: z.string().min(2).max(80).optional(),
    relatedNotes: z.array(slug).max(6).default([]),
    seoTitle: z.string().min(3).max(52).optional(),
    seoDescription: z.string().min(30).max(160).optional(),
  }).superRefine((note, context) => {
    if (note.status === 'published' && !note.publishedAt) {
      context.addIssue({ code: 'custom', path: ['publishedAt'], message: 'Published notes need a publishedAt date.' });
    }
    if (note.updatedAt && note.publishedAt && note.updatedAt < note.publishedAt) {
      context.addIssue({ code: 'custom', path: ['updatedAt'], message: 'updatedAt cannot be earlier than publishedAt.' });
    }
    const imageFields = [note.image, note.imageAlt, note.imageWidth, note.imageHeight];
    if (imageFields.some(Boolean) && imageFields.some((value) => !value)) {
      context.addIssue({ code: 'custom', path: ['image'], message: 'An image requires imageAlt, imageWidth and imageHeight.' });
    }
  }),
});

export const collections = { notes };
