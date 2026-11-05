# Storywork — build handoff

This file is the brief for the session that builds the site. Read all of it before writing code. Decisions below were made with the owner (Nate) in a planning session on 2026-11-05 and are settled unless marked **assumption**.

## 1. What this is

A paid, members-only website for a **10-day copywork challenge** focused on quality writing, storytelling, and "reclaiming your brain". Participants copy passages of literature **by hand, on paper**. The site holds the passages and the daily lessons; it does not have a typing box.

- Name: **Storywork**. The owner has the domain (exact domain not yet given; ask when DNS is needed).
- Core product: 10 days. All ten open at purchase, but the site encourages one day at a time.
- Upsell: an optional **5-day add-on** ("Five More"), sold separately.
- Passages: literature, **public domain** (owner said "probably public domain" — confirm before any modern excerpt goes in). The owner writes all passages and lessons and will deliver them later. Build the shell with clearly labelled placeholder public-domain passages so typesetting can be judged.
- Sales page: the owner already has one, hosted elsewhere. Its Buy button will link to this site's checkout. This site is the **members' area + checkout**, not a marketing site (**assumption**; if the owner sends sales copy, add a landing page at `/`).

## 2. Design reference: interfacecraft.dev

The owner wants the site modelled on Interface Craft's member library (interfacecraft.dev/library). Borrow the **structure and feel**, not the content, name, colours, logo, or card artwork. Nothing from the library's lessons may be reproduced.

What the reference does (from screenshots of the logged-in library and the public homepage):

- **Page**: white, one narrow centred column (~540–600px). Lots of air. Hairline rules (`#ececec`) separate things. No nav bar; a small logo top-left.
- **Type**: serif for titles, quotes and section headings (Signifier by Klim — paid; use a free alternative such as **Newsreader** or **Source Serif 4**). Grey system sans for body (`system-ui`, 15–16px, colour around `#6b6b6b`). Titles ~24px on the homepage, ~56px on collection pages, weight 400.
- **Collection page**: big serif title, 2–3 line grey intro, then a plain list of lessons: dark sans title (16px, 500) + one-line grey description, hairline between rows. An outlined orange pill "NEW" on fresh items.
- **Lesson page**: "← Collection name" back link top-left with a left sidebar listing the lesson's sections. Title in serif. Two quiet icons beside the title: mark-complete (circle-check) and bookmark. Section headings serif with hairline below. Body grey sans, ~18px, line-height ~1.6. The card deck is hidden on lesson pages.
- **Navigation**: a fanned deck of collection cards pinned to the bottom of the viewport. Each collection has a bold-coloured card with a generated pattern and its name set in serif. The current collection's card rises out of the deck; clicking another card navigates. On the homepage the deck sits in the hero, tilted, as the main illustration.
- **Reference Desk** collection: each entry has a small type icon (PDF, video), serif title, and a short quoted note with a grey left bar.
- **Login**: email only → eight-digit code typed into separate boxes → auto-submit. No passwords.
- **Homepage (public)**: opening statement, fanned stack of lesson previews + email capture, testimonials in serif, author section, single price, FAQ, one-line footer.

## 3. Site map

| Route | Who | Purpose |
|---|---|---|
| `/` | public | If no sales page is supplied: a short page with the Storywork wordmark, one paragraph, price, Buy button, and Sign in link. Otherwise redirect to the library when logged in, else to `/login`. |
| `/login` | public | Email → code. Mirrors the reference flow. |
| `/checkout?product=challenge\|addon` | public | Creates a Stripe Checkout session and redirects. |
| `/welcome` | after purchase | Thank-you page. Tells them to check email for the login code. Add-on upsell if not owned. |
| `/library` | members | Home. Shows the card deck and the **next unfinished day** as "Today". |
| `/method` | members | Collection: how to do copywork by hand (owner writes; placeholder sections for now). |
| `/days` | members | Collection "The Ten Days": list of Day 1–10. |
| `/days/[n]` | members | Day page (see §6). |
| `/more` | members | Collection "Five More": Days 11–15. Locked state if add-on not owned, with upsell. |
| `/more/[n]` | members, add-on owners | Day page. Non-owners see a locked page with the upsell. |
| `/shelf` | members | Collection "The Shelf": the books behind the passages, with notes and links to free editions. |
| `/days/[n]/copy` | members | **Copy mode**: full-screen passage for propping up a device while writing. |
| `/days/[n]/print` | members | Print layout: passage on one page, clean. |
| `/account` | members | Email, purchases, sign out. |
| `/api/stripe/webhook` | Stripe | Grants access on `checkout.session.completed`. |

## 4. Stack

- **Astro** (latest 5.x), SSR with the **Netlify** adapter. Host on **Netlify** (free plan allows commercial use). Vercel's free plan does not; do not use it.
- **React islands** (`@astrojs/react`) only for the interactive parts: the card deck, copy mode, OTP input, mark-complete. Everything else is static Astro.
- **Motion** (`motion/react`) for animation, so the Interface Craft storyboard pattern applies directly (§7).
- **Supabase**: Auth (email OTP), Postgres for purchases and progress. Use `@supabase/ssr` with cookies.
- **Stripe Checkout** + **Stripe Tax**. Webhook grants access. Two products: `challenge` and `addon`.
- **Resend** as Supabase's custom SMTP so login codes come from the Storywork domain.
- **Content**: Astro content collections, one Markdown file per day in `src/content/days/`. Schema in §6.
- TypeScript strict. Prettier. No CSS framework; hand-written CSS with design tokens on `:root`.

## 5. Auth and access

- Login: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`. Set the Supabase **Magic Link email template** to include `{{ .Token }}` so it sends a **6-digit code** instead of a link (the reference uses eight digits; six is Supabase's default and fine). Verify with `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
- The login page replicates the reference: email field → "Check your email" card with code boxes, auto-advance, auto-submit on the last digit, "Resend code in 60s", "Try a different email", inline red error on failure.
- **Access rule**: a member can see `/days/*`, `/method`, `/shelf` if the `purchases` table has a row for their email with `product = 'challenge'`. `/more/*` needs `product = 'addon'`. Check on the server in Astro middleware; never ship gated Markdown to the client unless the check passes.
- **Purchase before login**: the Stripe webhook inserts `purchases(email, product, stripe_session_id, amount, created_at)`. The buyer then logs in with the same email at `/login` and gets access. On `/welcome`, say exactly this. If they log in with a different email, show "No purchase found for this email" with a mailto for support.
- Progress: `progress(user_id, day, completed_at)`. Mark-complete writes a row; syncs across devices. Also mirror to `localStorage` for instant UI.

### Tables (SQL migration in `supabase/migrations/`)

```sql
create table purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product text not null check (product in ('challenge','addon')),
  stripe_session_id text unique,
  amount_cents int,
  created_at timestamptz default now()
);
create index on purchases (lower(email));

create table progress (
  user_id uuid references auth.users(id) on delete cascade,
  day int not null check (day between 1 and 15),
  completed_at timestamptz default now(),
  primary key (user_id, day)
);
alter table progress enable row level security;
create policy "own progress" on progress for all using (auth.uid() = user_id);
alter table purchases enable row level security; -- read via service role on the server only
```

## 6. Day content schema

`src/content/days/day-03.md`:

```yaml
---
day: 3
title: "The Long Sentence"
collection: "ten"          # "ten" | "more"
technique: "Holding a sentence together across many clauses"
summary: "One line shown in the day list."
source:
  author: "Jane Austen"
  work: "Persuasion"
  year: 1817
  chapter: "Chapter 1"
  public_domain: true
estimated_minutes: 25
passage: |
  The passage text. Preserve the author's paragraphing.
reflection: "One or two prompts for after copying."
---
Lesson body in Markdown. Headings (##) become the sidebar sections.
```

Day page layout, top to bottom:
1. Back link "← The Ten Days". Left sidebar: *Lesson · Passage · Reflect* plus the lesson's own `##` headings.
2. Title in serif. "Day 3 · 25 min" in small grey. Mark-complete and bookmark icons as in the reference.
3. **Lesson** (Markdown body).
4. **Passage**: set large in serif (~20px, line-height 1.7), the author/work/year in small caps beneath, then two buttons: **Open copy mode** and **Print**.
5. **Reflect**: the prompt, with a note to write the answer by hand under the copied passage.
6. Footer row: ← Day 2 · Day 4 →.

**Copy mode** (`/days/[n]/copy`): full-screen, passage only, in serif. Controls fade in on tap: text size A−/A+, a "sentence by sentence" toggle that dims all but the current sentence (tap or → to advance), and close. Request a wake lock (`navigator.wakeLock`) so the screen stays on. Persist text size in `localStorage`.

**"One day at a time"**: `/library` shows the next unfinished day as "Today". Opening a *second* unfinished day on the same calendar day shows a soft dismissible note above the lesson: "You've done today's work. This one will keep until tomorrow." Nothing is locked.

## 7. Using the Interface Craft skills

The owner asked that Interface Craft's design skills be used. They are installed into `~/.claude/skills/interface-craft` by running, in a session whose environment allows `interfacecraft.dev` (the personal environment named **storywork** does):

```bash
curl -sL interfacecraft.dev/api/install-skills | bash
```

The script was reviewed: it only writes six text files to `~/.agents/skills/interface-craft` and symlinks them. Load `/interface-craft` after installing. Apply it in three ways:

1. **Design Critique** (`design-critique.md`). After each milestone in §9, take a desktop (1440×900) and phone (390×844) screenshot of every new page and run the critique method on it: Context → First impressions → Visual → Interface → Consistency → User context → Top opportunities. Fix the top opportunities before moving on. Be quantitative (count sizes, name colours). Write the critique and what changed into `docs/critiques/<milestone>.md` so the owner can see the reasoning.
2. **Storyboard Animation** (`storyboard-animation.md`). Every animated React component follows the pattern exactly: ASCII storyboard comment at the top, a `TIMING` object, UPPERCASE per-element config objects with springs, a single `stage` integer, `>=` checks, `replayTrigger` prop. Use it for:
   - the **card deck**: cards fan in on load (staggered ~80ms), the active card rises on hover/selection, deck slides down out of view when a day page opens;
   - **mark-complete**: circle-check fills, a short "Day 3 done" confirmation, the next day's row gains the "Today" pill;
   - **login**: the code boxes shake on an invalid code; the "Check your email" card crossfades in;
   - **copy mode**: controls fade in on tap, sentence focus dims the rest.
   Spring defaults from the skill: containers `{stiffness:300,damping:30}`, pop-ins `{stiffness:500,damping:25}`, entrances `{stiffness:350,damping:28}`. Respect `prefers-reduced-motion` by collapsing all durations to 0.
3. **DialKit** (`dialkit.md`, `dialkit-timeline.md`). Install `dialkit@2.0.0` as a dev dependency. During development mount `DialRoot` in the React island shell and give the deck a `useDialKit('Deck', {...})` panel for fan angle, card overlap, rise distance, and the spring; give copy mode a panel for text size range and dim opacity. Use the timeline for the deck's fan-in sequence. `DialRoot` is hidden in production by default; leave it that way and bake the tuned values back into the config objects (use the panel's Copy). Do not ship DialKit in the production bundle (import it behind `import.meta.env.DEV`).

## 8. Visual direction

Original, not a clone. Keep the reference's restraint and swap its identity:

- **Palette** (tokens on `:root`, with a dark-mode set under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]`): paper background `#faf8f4`, ink text `#1b1a17`, grey text `#6f6b64`, hairline `#e6e2da`, one accent for "Today"/links: a deep red-brown `#8c3b2e`.
- **Cards** (one per collection): The Method — slate blue; The Ten Days — ink black; Five More — ochre; The Shelf — bottle green. Patterns are generated SVG (ruled lines, dot grid, marbled paper, library-card stamps), not photos. Names set in the serif.
- **Serif**: Newsreader (variable, via `@fontsource-variable/newsreader`), optical sizing on. **Sans**: system stack. Self-host fonts; no external font CSS at runtime.
- Column 600px max, 16px side gutters on phones, no horizontal scroll. Phone layout: sidebar sections become a sticky top row of pills; the deck becomes a horizontal strip.
- Favicon and wordmark: a simple "S" in the serif. Ask the owner for a logo later; don't block on it.

## 9. Milestones and acceptance

Work in this order. Commit after each; push to the designated branch. Run the critique (§7.1) at the end of each.

1. **Scaffold + design system**. Astro + React + Netlify adapter, tokens, fonts, layout shell, 404. `/library` renders the deck with four cards and placeholder lists. *Accept*: deck fans in with the storyboard pattern; passes the critique; phone width has no horizontal scroll.
2. **Content + day pages**. Content collection with 15 placeholder days (public-domain passages, labelled `PLACEHOLDER` in the title until replaced). `/days`, `/days/[n]`, `/more`, `/more/[n]`, `/shelf`, `/method`. Copy mode and print layout. *Accept*: a day reads well at 390px; print preview fits one page for a 350-word passage; wake lock works on a phone.
3. **Auth**. Supabase OTP login, middleware gating, `/account`, progress sync, "Today" logic, mark-complete animation. *Accept*: logged-out hits to `/days/3` redirect to `/login?next=/days/3`; after code entry you land on the day; completion survives a reload on another browser.
4. **Payments**. Stripe products, `/checkout`, webhook (verify signature with `STRIPE_WEBHOOK_SECRET`), `/welcome`, upsell placements, add-on gating. Price schedule from `src/config/pricing.ts`:

   ```ts
   export const PRICES = [
     { from: '2026-11-27', to: '2026-11-30', challenge: 9900, addon: 2900, label: 'Black Friday' },  // assumption on dates
     { from: '2026-12-01', to: '2026-12-31', challenge: 12900, addon: 2900, label: 'Launch' },        // assumption on end date
     { from: '2027-01-01', to: null,         challenge: 19900, addon: 2900, label: 'Regular' },
   ];
   ```
   Checkout shows the strike-through list price ($199) when a discount period is active. *Accept*: Stripe test-mode purchase of both products grants access; a repeat webhook delivery is idempotent (unique `stripe_session_id`); the add-on is offered at checkout (Checkout `optional_items` / a second line item toggle), on `/welcome`, and after Day 10, and never to someone who owns it.
5. **Polish + launch prep**. Dark mode pass, reduced motion, keyboard access through login and copy mode, OG image, `robots.txt` disallowing member routes, Netlify config, README with the owner's runbook (how to edit a day, change prices, see purchases). Final full-site critique.

## 10. Secrets and accounts

Never put keys in the repo or chat. In a cloud session, ask for each with the `request_credential` tool; in Netlify set them as environment variables. Needed:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CHALLENGE_*`, `STRIPE_PRICE_ADDON` (or create prices via the schedule and look them up by lookup_key)
- `RESEND_API_KEY` (configured in Supabase as SMTP, not used by the app directly)
- `PUBLIC_SITE_URL`

The owner has a Stripe account. Supabase, Resend and Netlify accounts are needed; ask the owner to create them when milestone 3 begins and to add the DNS records when it's time to go live.

## 11. Rules

- Do not reproduce Interface Craft content, copy, card art, logo, or name anywhere.
- Only public-domain passages until the owner confirms otherwise. Placeholder passages must be labelled.
- Don't build a marketing/sales page unless the owner sends copy.
- Never commit secrets. Never put model identifiers in commits, code, or comments.
- Keep each commit to one milestone or one fix; push to `claude/zen-shannon-ap8j6g` unless told otherwise.
- The repo was empty at handoff except this file.

## 12. Still open (ask the owner when relevant, don't block on them)

- Exact domain and registrar.
- Black Friday window and when $129 ends (dates above are assumptions).
- Whether buyers should be added to the owner's newsletter (Substack and beehiiv are both connected to the owner's account).
- Logo, author bio/photo, testimonials — only needed if a landing page is built here.
- Refunds and gifting: deferred.
- The real passages and lessons: owner delivers later. Target by ~Nov 20 to leave a week for proofing before Black Friday.
