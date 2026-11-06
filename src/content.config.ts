import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * One Markdown file per day in src/content/days/.
 * The Markdown body is the lesson; its ## headings become the
 * sections in the day page's sidebar.
 */
const days = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/days' }),
  schema: z.object({
    day: z.number().int().min(1).max(15),
    title: z.string(),
    collection: z.enum(['ten', 'more']),
    technique: z.string(),
    summary: z.string(),
    source: z.object({
      author: z.string(),
      work: z.string(),
      year: z.number().int(),
      chapter: z.string().optional(),
      translator: z.string().optional(),
      public_domain: z.boolean(),
      /** Why the whole book is worth reading. Shown on The Shelf. */
      note: z.string().optional(),
      /** A free edition (e.g. Project Gutenberg). Shown on The Shelf. */
      link: z.url().optional(),
    }),
    estimated_minutes: z.number().int().positive(),
    passage: z.string(),
    reflection: z.string(),
    /** Marks sample content that must be replaced before launch */
    placeholder: z.boolean().default(false),
  }),
});

/**
 * The Method: short chapters on how to do copywork by hand.
 */
const method = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/method' }),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    summary: z.string(),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { days, method };
