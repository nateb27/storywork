import { getCollection, type CollectionEntry } from 'astro:content';
import { collectionById } from '@/data/collections';

export type Day = CollectionEntry<'days'>;
export type MethodChapter = CollectionEntry<'method'>;

export const CORE_DAYS = 10;
export const TOTAL_DAYS = 15;

export const dayHref = (n: number) => (n <= CORE_DAYS ? `/days/${n}` : `/more/${n}`);
export const dayCollection = (n: number) => collectionById(n <= CORE_DAYS ? 'ten' : 'more');

export async function getDays(): Promise<Day[]> {
  const all = await getCollection('days');
  return all.sort((a, b) => a.data.day - b.data.day);
}

export async function getDay(n: number): Promise<Day | undefined> {
  const all = await getDays();
  return all.find((d) => d.data.day === n);
}

/** Parse a route param into a day number within a collection, or null. */
export function parseDayParam(param: string | undefined, collection: 'ten' | 'more'): number | null {
  if (!param || !/^\d{1,2}$/.test(param)) return null;
  const n = Number(param);
  const [min, max] = collection === 'ten' ? [1, CORE_DAYS] : [CORE_DAYS + 1, TOTAL_DAYS];
  return n >= min && n <= max ? n : null;
}

export async function getMethod(): Promise<MethodChapter[]> {
  const all = await getCollection('method');
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** "Jane Austen · Pride and Prejudice · 1813" */
export function sourceLine(day: Day): string {
  const s = day.data.source;
  return [s.author, s.work, String(s.year)].join(' · ');
}

export interface ShelfBook {
  work: string;
  author: string;
  year: number;
  translator?: string;
  note?: string;
  link?: string;
  days: number[];
}

/** The Shelf: one entry per book, built from each day's source. */
export async function getShelf(): Promise<ShelfBook[]> {
  const days = await getDays();
  const books = new Map<string, ShelfBook>();
  for (const d of days) {
    const s = d.data.source;
    const key = `${s.author}::${s.work}`;
    const existing = books.get(key);
    if (existing) {
      existing.days.push(d.data.day);
      existing.note ??= s.note;
      existing.link ??= s.link;
    } else {
      books.set(key, {
        work: s.work,
        author: s.author,
        year: s.year,
        translator: s.translator,
        note: s.note,
        link: s.link,
        days: [d.data.day],
      });
    }
  }
  return [...books.values()];
}

/** Section links for a lesson sidebar from rendered Markdown headings. */
export function sectionsFrom(headings: Array<{ depth: number; slug: string; text: string }>) {
  return headings.filter((h) => h.depth === 2).map((h) => ({ id: h.slug, label: h.text }));
}
