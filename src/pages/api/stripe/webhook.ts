/**
 * Stripe webhook: grants access when a Checkout session is paid.
 * Configure in Stripe → Developers → Webhooks with the events
 * checkout.session.completed and checkout.session.async_payment_succeeded.
 */
import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { STRIPE_WEBHOOK_SECRET } from 'astro:env/server';
import { fulfil, getStripe, stripeConfigured } from '@/lib/stripe';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!stripeConfigured || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook not configured', { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;
    try {
      const result = await fulfil(session.id, locals.backend);
      console.info(`[webhook] ${event.type} ${session.id}: paid=${result.paid} products=${result.products.join(',')}`);
    } catch (e) {
      console.error('[webhook] fulfilment failed', e);
      // 500 makes Stripe retry; recording is idempotent
      return new Response('Fulfilment failed', { status: 500 });
    }
  }
  return new Response('ok');
};
