# Critique — Milestone 4: checkout, webhook, upsells, pricing

Method: Interface Craft *Design Critique* for the screens (`/welcome`, the Day 10 offer, the locked add-on offer, the development checkout); scripted tests for behaviour. Stripe Checkout itself is Stripe's page; what we control there is what it's given (prices, the add-on tick-box, the message under the Pay button).

## Context

The buyer has just paid, often on their phone, often from a sales page they found that day. The moment after payment decides whether they start the challenge or forget it: they need to know exactly what to do next and that nothing else is required of them. The add-on should be offered at moments where it makes sense (checkout, right after buying, after finishing Day 10) and never to people who already own it.

## First impressions

`/welcome` reads as a short set of instructions, not a receipt: "You're in.", one line of thanks, three numbered steps (sign in, find a notebook, start with The Method), and only then the Five More offer. The sign-in step names the email they paid with, which pre-empts the most common support problem.

## Visual design

- The numbered steps use the serif for the numbers in small paper-coloured discs, the same raised-paper tone as the login code panel, so the welcome page and the sign-in page feel like one sequence.
- The offer card repeats the ochre Five More card from the deck (tilted, with five tally marks) so the add-on is recognisable everywhere it appears: welcome, library, locked days, after Day 10.
- **Line-break nit** (fixed). "6-digit" broke across lines as "6-" / "digit" on phones; now a non-breaking hyphen.

## Interface design

- **Checkout carries the sale.** During a sale Stripe shows, under the Pay button, "Black Friday price: $99 (regularly $199). You'll sign in to Storywork with this email address." The second sentence matters every day: it tells buyers which email becomes their login before they type it.
- **Add-on as a tick-box.** The challenge checkout offers Five More as a Stripe optional item, so adding it is one tap on the same page.
- **After Day 10, not before.** On Day 10 the offer is in the page but hidden until the member marks the day done; it then rises in under the "That's today's work" line. Verified: absent before completion, present after.
- **No dead ends.** Buying the add-on from `/welcome` before signing in uses the email from the purchase just made; from the library it uses the signed-in member's email, locked in Checkout. A signed-out visitor who follows an add-on link is asked to sign in first and brought back.
- **Owners never see the offer.** Owners who open either checkout are sent back to the library or Five More.

## Consistency and conventions

- One price file (`src/config/pricing.ts`) drives Checkout, the offer buttons, and `/api/price`. Stripe prices are found or created by lookup key, so a price change needs no Stripe dashboard work.
- Fulfilment is idempotent per (Stripe session, product) and runs from both the webhook and `/welcome`, so a slow webhook never blocks a buyer.

## User context

- **Paid with an email in capitals.** Stripe's email is lower-cased before it is stored or shown, so "Name@Example.com" signs in as name@example.com (fixed during testing).
- **Slow phone connection.** Testing caught a real bug: tapping "Continue" on the sign-in page before its JavaScript loaded submitted the form natively and reloaded the page without sending a code. The button now stays disabled until the form is live.

## Verified

**Development checkout (no Stripe keys), 16/16:** add-on tick-box shown; welcome confirms and offers Five More; sign-in email prefilled; buyer reaches the library; Five More stays locked; Day 10 offer appears only after done; add-on checkout uses the member's email (read-only); welcome after add-on says it's included; Five More unlocks; no Day 10 offer for owners; owners redirected away from both checkouts; buying both at once shows no offer; signed-out add-on checkout asks to sign in; price endpoint answers.

**Stripe integration (the real `stripe` library against a local fake of the API), 23/23:** challenge checkout redirects to Stripe; prices created by lookup key and reused; session is payment mode with one line item, the add-on as an optional item, the session id in the success URL, promotion codes on, no prefilled email for anonymous buyers, tax off until configured; webhook rejects bad and missing signatures, accepts valid events, and a replay records nothing twice; both products recorded; email stored lower-case; welcome confirms the session and shows the email; the buyer can sign in and read Day 11; add-on checkout for a member prefills their email, has no optional item, and cancels back to Five More.

**Price schedule:** $199 until 23:59:59 Nov 26 (New York), $99 from 00:00 Nov 27 through Cyber Monday, $129 from Dec 1 through Dec 31, $199 from Jan 1. Add-on $29 throughout.

## Not yet verified

Against Stripe itself (test mode). The fake server checks our code paths and the parameters we send, not Stripe's own validation. Run the test-purchase checklist in `docs/setup.md` before launch.

## Top opportunities

1. Confirm the sale window and the end of the $129 price with the owner (marked as assumptions in `pricing.ts`).
2. Launch polish (milestone 5): dark mode pass, keyboard pass, social image, robots, Netlify config, README.
