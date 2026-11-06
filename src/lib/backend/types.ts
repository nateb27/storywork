/**
 * Everything the site needs from its accounts and data layer. One
 * implementation talks to Supabase; a second, development-only one
 * keeps data in memory so the site runs without any accounts.
 */

export type Product = 'challenge' | 'addon';

export interface Member {
  id: string;
  email: string;
}

/** day number → ISO timestamp it was marked done */
export type Progress = Record<number, string>;

export type Result =
  | { ok: true; /** development only: the code, shown on screen */ devCode?: string }
  | { ok: false; error: string };

export interface PurchaseRecord {
  email: string;
  product: Product;
  stripeSessionId: string;
  amountCents: number | null;
}

export interface Backend {
  /** Which implementation is answering (shown in development only) */
  readonly kind: 'supabase' | 'dev';

  /** Email a one-time login code */
  sendCode(email: string): Promise<Result>;
  /** Check the code and start a session (sets cookies) */
  verifyCode(email: string, code: string): Promise<Result>;
  /** The signed-in member for this request, verified with the auth server */
  getMember(): Promise<Member | null>;
  signOut(): Promise<void>;

  /** Products bought with this email address */
  getProducts(email: string): Promise<Product[]>;
  getProgress(memberId: string): Promise<Progress>;
  setProgress(memberId: string, day: number, done: boolean): Promise<void>;

  /** Called by the Stripe webhook. Idempotent per (stripeSessionId, product). */
  recordPurchase(purchase: PurchaseRecord): Promise<'created' | 'duplicate'>;
}
