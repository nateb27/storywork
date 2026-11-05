# Critique — Milestone 1: scaffold, design system, deck

Method: Interface Craft *Design Critique*. Screens reviewed at 1440×900 and 390×844: `/library`, `/days`, `/method`, `/more`, `/shelf`, 404. Also tested: navigating between collections by clicking deck cards.

## Context

A members-only library for a paid 10-day copywork challenge. The member arrives with a notebook and pen, wanting to know what today's work is and get to it. The emotional register is calm and deliberate: the product's promise is "reclaim your brain", so the interface has to feel like the opposite of a feed.

## First impressions

The page reads as quiet and literary: one 576px column, a serif title, grey sans text, hairlines between rows, and nothing else until the deck at the bottom. The deck is the only colour on the page, which makes it read as navigation without labels. Before fixes, three things undercut that: the DialKit dev button covered the Account link, a run-together "ReadThe Method", and progress tally marks too faint to read as marks at all.

## Visual design

- **Colour intentionality.** Five colours carry meaning: paper (`#faf8f4`), ink (`#1b1a17`), grey (`#6f6b64`), accent red-brown (`#8c3b2e`) for "Today" only, and the four card colours, used only on the deck and the mark. No decorative colour elsewhere.
- **Typographic hierarchy.** Four sizes do all the work on collection pages: 56px serif title, 17px grey intro, 16px/500 row title, 15px grey description. The "Day 1" label uses the faint grey at the row-title size, so the number reads as a tab, not a second title.
- **Faint tally marks** (fixed). The unfinished marks used `--hairline` (`#e6e2da`) on paper, a contrast of about 1.2:1, so "0 of 10" showed as a smudge. They now use `--grey-faint` at 45% opacity: pencil marks that are clearly there and clearly not done.
- **Shadow quality.** Cards use a three-layer shadow (1px contact, 16px mid, 40px ambient) so they sit on the page instead of floating in haze.

## Interface design

- **Focusing mechanism.** On `/library` the eye goes to the "Today" pill, then the 56px day title, then the black "Begin today's work" button. One primary action per screen.
- **Collision with the deck.** On long lists the last rows ran under the cards. The main column now has bottom padding equal to the deck's visible height plus a full section gap, and a paper-coloured fade sits behind the deck so text dissolves before reaching the cards.
- **Feedback.** The current collection's card rises 46px (30px on phones) and straightens slightly. Hover and keyboard focus lift a card 14px, so the deck invites a click without a label.

## Consistency and conventions

- The deck is a `<nav aria-label="Collections">` of real links with `aria-current="page"` on the raised card, so it works with a keyboard and a screen reader.
- The deck persists across page changes (Astro view transitions with `transition:persist`). Verified: clicking The Method from The Ten Days swaps the page without a reload, the deck element survives, the old card sinks while the new one rises.
- Row hover nudges right 3px, the only motion inside the column. Buttons press to 97%.

## User context

The member is often on a phone propped against a notebook. On 390px the deck shrinks (132px cards, 74px spread) and still shows all four titles. There is no horizontal overflow on any page at either size (checked programmatically).

## Fixed in this pass

1. DialKit panel moved from top-right (covered the Account link) to bottom-right, clear of the deck at desktop widths. Dev only.
2. "ReadThe Method": the whitespace was lost at a line break in the template. Fixed.
3. Tally marks raised from ~1.2:1 to readable pencil grey.
4. Deck fade now blends from paper at 0% opacity instead of `transparent`.

## Top opportunities (next milestones)

1. Replace placeholder rows with the content collection so day titles and descriptions are real.
2. The library home should show real progress and the next unfinished day (milestone 3).
3. Give the raised card a 1px accent hairline in dark mode, where the ink-black Ten Days card loses its edge against the dark paper (milestone 5).
