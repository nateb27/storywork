/**
 * Prices. Edit this file to change what checkout charges; no other code
 * needs to change. Amounts are in cents (USD). Times are written with
 * their US Eastern offset so a period starts at midnight in New York.
 *
 * Outside every period below, the regular price applies.
 *
 * ASSUMPTION (confirm with the owner): Black Friday runs Fri Nov 27
 * through Cyber Monday Nov 30; the $129 launch price runs through
 * December.
 */

export const CURRENCY = 'usd';

/** The full price, shown struck through during a sale */
export const REGULAR_CHALLENGE = 19900;

/** Five More, the add-on */
export const ADDON = 2900;

export interface PricePeriod {
  label: string;
  /** Inclusive start */
  from: string;
  /** Exclusive end */
  to: string;
  challenge: number;
}

export const PERIODS: PricePeriod[] = [
  { label: 'Black Friday', from: '2026-11-27T00:00:00-05:00', to: '2026-12-01T00:00:00-05:00', challenge: 9900 },
  { label: 'Launch', from: '2026-12-01T00:00:00-05:00', to: '2027-01-01T00:00:00-05:00', challenge: 12900 },
];

export interface CurrentPrices {
  challenge: number;
  addon: number;
  regular: number;
  /** Name of the active sale, or null at the regular price */
  sale: string | null;
  /** When the active sale ends (ISO), or null */
  endsAt: string | null;
}

export function pricesAt(now: Date = new Date()): CurrentPrices {
  const t = now.getTime();
  const period = PERIODS.find((p) => t >= Date.parse(p.from) && t < Date.parse(p.to));
  return {
    challenge: period?.challenge ?? REGULAR_CHALLENGE,
    addon: ADDON,
    regular: REGULAR_CHALLENGE,
    sale: period && period.challenge < REGULAR_CHALLENGE ? period.label : null,
    endsAt: period ? new Date(Date.parse(period.to)).toISOString() : null,
  };
}

/** 9900 → "$99", 12950 → "$129.50" */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
