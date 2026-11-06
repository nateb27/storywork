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

Added in milestone 4; see the Stripe section below once it exists.

## 4. Netlify

Added in milestone 5.
