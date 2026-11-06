// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

/** Server-only secret; optional so local development runs without accounts */
const secret = () => envField.string({ context: 'server', access: 'secret', optional: true });

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  env: {
    schema: {
      // Supabase: login codes, purchases, progress
      SUPABASE_URL: secret(),
      SUPABASE_ANON_KEY: secret(),
      SUPABASE_SERVICE_ROLE_KEY: secret(),
      // Stripe: checkout and the purchase webhook
      STRIPE_SECRET_KEY: secret(),
      STRIPE_WEBHOOK_SECRET: secret(),
      // Turn on once Stripe Tax is set up in the Stripe dashboard
      STRIPE_AUTOMATIC_TAX: envField.boolean({ context: 'server', access: 'public', default: false }),
      // Public settings
      // The owner's sales page; "Join the challenge" links and cancelled checkouts go here
      PUBLIC_SALES_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPPORT_EMAIL: envField.string({
        context: 'client',
        access: 'public',
        default: 'hello@storywork.co',
      }),
      PUBLIC_OTP_LENGTH: envField.number({
        context: 'client',
        access: 'public',
        default: 6,
        int: true,
        gt: 3,
        lt: 11,
      }),
    },
  },
});
