# Critique — Milestone 3: sign-in, access, progress

Method: Interface Craft *Design Critique*. Reviewed `/login` (email step, code step, wrong code), `/library` after a day finished today (phone), `/more/11` locked, `/account`, `/no-purchase`. Behaviour verified with a scripted end-to-end run against the development backend: 16 checks, all passing (listed at the end).

## Context

Two moments matter here. Signing in, often on a phone, often minutes after paying, when the member wants to start, not fight a form. And coming back on Day 4 on a different device and finding the site remembers Days 1–3. Both have to be invisible when they work.

## First impressions

The sign-in screen is the quietest page on the site: the mark, the wordmark in serif, one field, one button, one line explaining there's no password. The code step swaps into a raised paper panel with separate digit boxes, the pattern members already know from banking apps. The one false note before fixes: after a wrong code the status line read "Checking…" in red for the length of the shake animation.

## Visual design

- **Hierarchy.** The login has three weights: the 28px serif wordmark, 15px/500 labels and buttons, 13px grey hints. The error colour (`--danger`) appears only on the field border and one line of text.
- **Code boxes.** 6 boxes in two groups of three with a dash, 42×50px each (35×45px under 400px wide, so six fit on a 320px screen). Focus is an ink border plus a soft 3px ring. On success the boxes fill with ink before the redirect, so there is a visible "yes" before the page changes.
- **Long email addresses** (fixed). `word-break: break-all` split "example.com" mid-word on the code panel and account page. Now `overflow-wrap: anywhere`, which breaks only when it must.

## Interface design

- **Expectation setting.** "We'll email you a 6-digit code. No password." sits under the button before anyone presses it. The code step names the address, warns it may take a minute and may land in spam, and shows a 60-second resend countdown.
- **Error recovery.** A wrong code shakes the row (360ms), clears it, refocuses the first box, and says "That code is wrong or has expired." (fixed: previously masked by "Checking…"). "Use a different email" is always one tap away.
- **Paste and autofill.** Pasting a code into any box fills all of them; the first box carries `autocomplete="one-time-code"` so iOS and Android offer the code from the email.
- **One day at a time, on the library.** After finishing a day, the Today card changes in the member's own time zone: "Today's work is done", "This one will keep until tomorrow. Let today's passage settle.", and the primary button becomes a quiet "Look ahead". Nothing is locked; the site just stops pushing.
- **Locked add-on.** Days 11–15 show their title, what they teach and which book they come from, then the offer. The passage and lesson never leave the server for non-owners; copy and print routes redirect to the locked page.

## Consistency and conventions

- Every member page now carries the server's copy of progress; the client store treats it as truth and holds any change still in flight, so a quick tick-then-navigate can't flicker back.
- The deck shows a lock on Five More for members without it, matching the "Locked" pills in the list.
- Member pages send `Cache-Control: private, no-store`.

## User context

- **Bought with a different email.** The most common support problem for course sites. `/no-purchase` names the address they used, says how to find the right one (the Stripe receipt), and offers "Use a different email" as the primary action.
- **Safety.** Post-login redirects only accept same-site paths (`//evil.example.com` is ignored). The development backend refuses to run in a production build without Supabase keys rather than letting anyone in.

## Verified (end-to-end, development backend)

1. Logged-out day redirects to `/login?next=/days/3`
2. Wrong code shows an error
3. Right code lands on the requested day
4. Marking done saves to the server
5. Completion appears in a second browser
6. Day list shows the check
7. Today is the first unfinished day
8. Library rests after a day finished today
9. Five More day locked without the add-on
10. API refuses add-on progress without it (403)
11. Locked copy mode redirects to the locked page
12. Add-on owner reads Day 11
13. No-purchase email lands on `/no-purchase`
14. No-purchase member is kept out of days
15. Sign out returns to login
16. Off-site `next` is ignored

## Not yet verified

Against a real Supabase project: needs the project and keys (see `docs/setup.md`). The Supabase implementation follows `@supabase/ssr`'s documented cookie pattern and is type-checked, but has not run against a live project.

## Top opportunities

1. Checkout and the purchase webhook (milestone 4), so `/checkout` links stop 404ing.
2. Prices on the Five More offer.
3. Run this same end-to-end script against a Supabase staging project before launch.
