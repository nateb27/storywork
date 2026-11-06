/**
 * Development-only stand-in for Stripe: records the purchase through the
 * same backend call the webhook uses, then lands on /welcome.
 */
import type { APIRoute } from 'astro';
import { isEmail } from '@/lib/access';
import { stripeConfigured } from '@/lib/stripe';
import { pricesAt } from '@/config/pricing';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!import.meta.env.DEV || stripeConfigured) return new Response('Not found', { status: 404 });
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!isEmail(email)) return new Response('Bad email', { status: 400 });
  const product = form.get('product') === 'addon' ? 'addon' : 'challenge';
  const session = `dev_${crypto.randomUUID()}`;
  const prices = pricesAt();
  const bought: Array<'challenge' | 'addon'> = [product];
  if (product === 'challenge' && form.get('addon') === '1') bought.push('addon');
  for (const p of bought) {
    await locals.backend.recordPurchase({
      email,
      product: p,
      stripeSessionId: session,
      amountCents: p === 'challenge' ? prices.challenge : prices.addon,
    });
  }
  const q = new URLSearchParams({ dev_email: email, dev_products: bought.join(',') });
  return redirect(`/welcome?${q}`, 303);
};
