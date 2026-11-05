/**
 * The four collections in the library. Order here is the order of the
 * cards in the deck, left to right.
 *
 * Intro copy is a draft for the owner to edit.
 */

export type CollectionId = 'method' | 'ten' | 'more' | 'shelf';

export type CardPattern = 'ruled' | 'tally-ten' | 'tally-five' | 'spines';

export interface Collection {
  id: CollectionId;
  href: string;
  /** Full name, used for page titles and back links */
  name: string;
  /** How the name breaks across lines on the card */
  cardLines: string[];
  /** Two or three lines under the page title */
  intro: string;
  /** CSS custom property holding the card colour */
  color: string;
  /** Whether the card's text is light (on dark cards) or dark (on the ochre card) */
  ink: 'light' | 'dark';
  pattern: CardPattern;
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'method',
    href: '/method',
    name: 'The Method',
    cardLines: ['The', 'Method'],
    intro:
      'How to copy a passage by hand: slowly, exactly, and with your attention on how the sentences are built.',
    color: 'var(--card-method)',
    ink: 'light',
    pattern: 'ruled',
  },
  {
    id: 'ten',
    href: '/days',
    name: 'The Ten Days',
    cardLines: ['The Ten', 'Days'],
    intro:
      'Ten passages from literature, one a day. Read the lesson, copy the passage by hand, then answer the question beneath it.',
    color: 'var(--card-ten)',
    ink: 'light',
    pattern: 'tally-ten',
  },
  {
    id: 'more',
    href: '/more',
    name: 'Five More',
    cardLines: ['Five', 'More'],
    intro:
      'Five more days for when ten is not enough. Longer passages, harder sentences, the same quiet hour.',
    color: 'var(--card-more)',
    ink: 'dark',
    pattern: 'tally-five',
  },
  {
    id: 'shelf',
    href: '/shelf',
    name: 'The Shelf',
    cardLines: ['The', 'Shelf'],
    intro:
      'The books behind every passage. If a page stays with you, the rest of the book is waiting.',
    color: 'var(--card-shelf)',
    ink: 'light',
    pattern: 'spines',
  },
];

export const collectionById = (id: CollectionId): Collection => {
  const found = COLLECTIONS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown collection: ${id}`);
  return found;
};
