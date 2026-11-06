import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_AUTOMATIC_TAX } from 'astro:env/server';
import { CURRENCY, formatPrice, pricesAt } from '@/config/pricing';
import type { Backend, Product } from './backend/types';

export const stripeConfigured = Boolean(STRIPE_SECRET_KEY);

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error('Stripe is not configured: set STRIPE_SECRET_KEY.');
  // Development only: STRIPE_TEST_HOST=127.0.0.1:12111 points the client at a
  // local fake for automated tests. Ignored in production builds.
  const testHost = import.meta.env.DEV ? process.env.STRIPE_TEST_HOST : undefined;
  if (testHost) {
    const [host, port] = testHost.split(':');
    return (client ??= new Stripe(STRIPE_SECRET_KEY, { host, port: Number(port), protocol: 'http' }));
  }
  return (client ??= new Stripe(STRIPE_SECRET_KEY));
}

const PRODUCT_NAMES: Record<Product, string> = {
  challenge: 'Storywork: The Ten Days',
  addon: 'Storywork: Five More',
};

/** Prices found or created this process, by lookup key */
const priceIds = new Map<string, string>();

/**
 * The Stripe Price for a product at an amount. Found by lookup key, or
 * created on first use, so changing src/config/pricing.ts is all it
 * takes to charge a new price. Each Price carries
 * metadata.storywork_product, which the webhook reads.
 */
export async function ensurePrice(product: Product, amount: number): Promise<string> {
  const key = `storywork_${product}_${CURRENCY}_${amount}`;
  const cached = priceIds.get(key);
  if (cached) return cached;
  const stripe = getStripe();
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  let id = found.data[0]?.id;
  if (!id) {
    const created = await stripe.prices.create({
      currency: CURRENCY,
      unit_amount: amount,
      lookup_key: key,
      transfer_lookup_key: true,
      metadata: { storywork_product: product },
      product_data: { name: PRODUCT_NAMES[product], metadata: { storywork_product: product } },
    });
    id = created.id;
  }
  priceIds.set(key, id);
  return id;
}

export interface CheckoutOptions {
  product: Product;
  /** Prefilled and locked in Checkout when known (signed-in member, or a previous purchase) */
  email?: string;
  /** Offer Five More as a tick-box (challenge checkout, buyer doesn't own it) */
  offerAddon: boolean;
  origin: string;
  cancelUrl: string;
}

export async function createCheckout(o: CheckoutOptions): Promise<string> {
  const stripe = getStripe();
  const prices = pricesAt();
  const amount = o.product === 'challenge' ? prices.challenge : prices.addon;
  const price = await ensurePrice(o.product, amount);
  const addonPrice = o.offerAddon ? await ensurePrice('addon', prices.addon) : null;

  const saleLine =
    o.product === 'challenge' && prices.sale
      ? `${prices.sale} price: ${formatPrice(prices.challenge)} (regularly ${formatPrice(prices.regular)}). `
      : '';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price, quantity: 1 }],
    ...(addonPrice ? { optional_items: [{ price: addonPrice, quantity: 1 }] } : {}),
    ...(o.email ? { customer_email: o.email } : {}),
    customer_creation: 'always',
    allow_promotion_codes: true,
    automatic_tax: { enabled: STRIPE_AUTOMATIC_TAX },
    success_url: `${o.origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: o.cancelUrl,
    custom_text: {
      submit: { message: `${saleLine}You’ll sign in to Storywork with this email address.` },
    },
    metadata: { storywork: 'true' },
  });
  if (!session.url) throw new Error('Stripe returned a session without a URL');
  return session.url;
}

export interface Fulfilment {
  paid: boolean;
  email: string | null;
  products: Product[];
}

/**
 * Record the purchases in a Checkout session. Safe to call more than
 * once (webhook, retries, and the welcome page all call it): each
 * (session, product) is stored once.
 */
export async function fulfil(sessionId: string, backend: Backend): Promise<Fulfilment> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const raw = session.customer_details?.email ?? session.customer_email ?? null;
  const email = raw ? raw.trim().toLowerCase() : null;
  if (session.payment_status !== 'paid' || !email) return { paid: false, email, products: [] };

  const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 10, expand: ['data.price'] });
  const products: Product[] = [];
  for (const item of items.data) {
    const product = item.price?.metadata?.storywork_product;
    if (product !== 'challenge' && product !== 'addon') continue;
    await backend.recordPurchase({
      email,
      product,
      stripeSessionId: session.id,
      amountCents: item.amount_total ?? null,
    });
    products.push(product);
  }
  return { paid: true, email, products };
}
