# Setting up Storywork's accounts

The site runs locally with no accounts at all (see "Local development" in the README). To take real payments and send real login codes it needs three services: **Supabase** (logins, purchases, progress), **Resend** (sends the login emails from your domain), and **Stripe** (payments). Netlify hosts the site.

Keys never go in the repository or in chat. Put them in Netlify's environment variables (and in a local `.env` file, which git ignores, if you run the site on your own machine).

---

## 1. Supabase

1. Create a project at supabase.com. Pick the region closest to most of your buyers.
2. **Database.** Open *SQL Editor*, paste the contents of `supabase/migrations/0001_init.sql`, and run it. This creates the `purchases` and `progress` tables with row-level security.
3. **Email sign-in.** *Authentication → Sign In / Providers → Email*: leave Email enabled. Set **Email OTP length** to 6 and **Email OTP expiration** to 600 seconds.
4. **Email templates.** *Authentication → Emails → Templates*. Supabase uses two templates for code sign-in: **Magic Link** (returning members) and **Confirm signup** (first sign-in). Replace the body of both with a code, not a link:

   Subject: `Your Storywork code`

   ```html
   <p>Your Storywork sign-in code is:</p>
   <p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
   <p>It expires in 10 minutes. If you didn’t ask for it, you can ignore this email.</p>
   ```

5. **URL.** *Authentication → URL Configuration*: set **Site URL** to `https://your-domain`.
6. **Keys.** *Project Settings → API Keys*. You need three values for Netlify:

   | Netlify variable | Supabase value |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | Publishable (anon) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret (service_role) key. Server only; never share it. |

## 2. Resend (login emails from your domain)

Supabase's built-in email is limited to a few messages an hour and comes from a Supabase address. Resend fixes both.

1. Create an account at resend.com and add your domain. Resend shows DNS records (SPF, DKIM); add them at your domain registrar and wait for Resend to verify.
2. Create an API key with *Sending access*.
3. In Supabase: *Authentication → Emails → SMTP Settings → Enable custom SMTP*:
   - Sender email: `hello@your-domain` (any address on the verified domain)
   - Sender name: `Storywork`
   - Host `smtp.resend.com`, port `465`, username `resend`, password: the Resend API key
4. *Authentication → Rate Limits*: raise "emails sent per hour" to something comfortable for launch day (e.g. 500).

The site never sees the Resend key; only Supabase uses it.

## 3. Stripe

You don't create products or prices in Stripe. The site creates them the first time someone checks out at a given price, named "Storywork: The Ten Days" and "Storywork: Five More", and reuses them after that. To change a price, edit `src/config/pricing.ts`.

1. **Keys.** *Developers → API keys*. Copy the **Secret key** into Netlify as `STRIPE_SECRET_KEY`. Use the test-mode key (`sk_test_…`) until you've done a test purchase end to end, then switch to the live key (`sk_live_…`).
2. **Webhook.** *Developers → Webhooks → Add endpoint*:
   - URL: `https://your-domain/api/stripe/webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
   - Copy the endpoint's **Signing secret** (`whsec_…`) into Netlify as `STRIPE_WEBHOOK_SECRET`.
   Test mode and live mode have separate webhooks and separate secrets; set up both.
3. **Receipts.** *Settings → Customer emails*: turn on "Successful payments" so buyers get a receipt. The receipt shows the email they paid with, which is the email they sign in with.
4. **Branding.** *Settings → Branding*: add the Storywork icon and colours so Checkout matches the site.
5. **Sales tax / VAT (optional).** Stripe charges tax only if you set up *Stripe Tax* (*Settings → Tax*: add your business address and where you're registered). Once that's done, set `STRIPE_AUTOMATIC_TAX=true` in Netlify. Leave it unset until then; turning it on without Stripe Tax set up makes checkout fail.
6. **Discount codes (optional).** *Product catalogue → Coupons*: create a coupon, then a promotion code for it. Checkout already shows an "Add promotion code" field.

### Where buyers come from

- Your sales page's Buy button should link to `https://your-domain/checkout`. That page sends them straight to Stripe at the current price, with Five More offered as a tick-box.
- Set `PUBLIC_SALES_URL` in Netlify to your sales page's address. "Join the challenge" on the sign-in page and cancelled checkouts go there.
- `https://your-domain/api/price` returns the current prices as JSON if you want the sales page to show them automatically.

### Test purchase checklist (test mode)

1. Open `/checkout`, pay with card `4242 4242 4242 4242`, any future date, any CVC. Tick Five More.
2. You land on `/welcome`, which says "You're in" and "Five More is included".
3. *Developers → Webhooks → your endpoint* shows a `200` for the event.
4. Sign in with the email you used; Days 1–10 and Five More are open.
5. Buy again with a new email without ticking Five More; after Day 10 the Five More offer appears, and buying it from there unlocks Days 11–15.

## 4. Netlify

Added in milestone 5.
