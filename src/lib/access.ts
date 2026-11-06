import type { CollectionId } from '@/data/collections';
import type { Product, Progress } from './backend/types';
import { CORE_DAYS, TOTAL_DAYS } from './content';

export const hasAddon = (products: Product[]) => products.includes('addon');

/** Collections whose card shows a lock */
export const lockedCollections = (products: Product[]): CollectionId[] =>
  hasAddon(products) ? [] : ['more'];

export const isDone = (progress: Progress, day: number) => Boolean(progress[day]);

export function doneCount(progress: Progress, from: number, to: number): number {
  let n = 0;
  for (let d = from; d <= to; d++) if (progress[d]) n++;
  return n;
}

/**
 * The member's next unfinished day: the first open day of the ten, then
 * (with the add-on) the first open day of Five More. Null when there is
 * nothing left they own.
 */
export function nextDay(progress: Progress, products: Product[]): number | null {
  for (let d = 1; d <= CORE_DAYS; d++) if (!progress[d]) return d;
  if (!hasAddon(products)) return null;
  for (let d = CORE_DAYS + 1; d <= TOTAL_DAYS; d++) if (!progress[d]) return d;
  return null;
}

/** Only allow same-site relative paths as post-login destinations */
export function safeNext(next: string | null | undefined, fallback = '/library'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export const isEmail = (s: unknown): s is string =>
  typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
