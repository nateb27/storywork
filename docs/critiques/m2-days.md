# Critique — Milestone 2: content, day pages, copy mode, print

Method: Interface Craft *Design Critique*. Reviewed at 1440×900 and 390×844: `/days/1`, `/days/3/copy`, `/days/6/copy` (sentence mode), `/more/11`, `/method/03-how-to-copy`, `/shelf`, `/days/1/print`. Interaction tests scripted with Playwright: sentence stepping, idle fade, marking a day done, same-day note, print page count.

## Context

The day page is where the work happens. The member reads a short lesson, copies a passage by hand (often with a phone or laptop propped up beside a notebook), answers one question on paper, and marks the day done. They are focused and unhurried; the page should feel like a well-set book, and copy mode should disappear while they write.

## First impressions

The day page reads like a chapter: a 56px serif title, a grey line naming the technique, a 17px lesson, then the passage set larger in serif (21px, line-height 1.7, book-style first-line indents). The passage is visibly the most important thing on the page without any box or colour around it. Copy mode is close to empty: the passage, a source line, and controls that leave after three seconds.

## Visual design

- **Typographic hierarchy.** Four levels on the day page: 56px title, 26px serif section headings with a hairline, 21px serif passage, 17px sans lesson. The source line uses 13px uppercase tracking for the author and an italic title, the only small caps on the site, which makes it read as a citation.
- **Long lines in copy mode** (fixed). At the 27px default, the 34em column ran about 95 characters per line. After each glance down at the notebook the eye had to search for its place. Now 30em, about 60 characters.
- **Faint completion icon** (fixed). The circle beside the title was `--grey-faint` with the ring at 55% opacity, close to invisible on paper. Now `--grey`, ink on hover.

## Interface design

- **Focusing mechanism.** The page has one primary action at a time: "Open copy mode" when you reach the passage, "I've copied today's passage" when you're done. Both are black pills; everything else is quiet.
- **Progressive disclosure in copy mode.** Size, sentence mode, and full screen hide after 3.2s of no input and return on any pointer movement, tap or key. The cursor hides with them.
- **Sentence by sentence.** Non-current sentences dim to 18%; arrows, space, J/K or the bottom buttons step through. Verified on the Poe passage: 7 sentences, split correctly around dashes, "Hearken! and", and abbreviations like "Mrs." and "Mr.".
- **Feedback and reward.** Marking done fills the ring, draws the check, then shows "That's today's work. Day 2 will keep until tomorrow." with a quiet Undo. The confirmation originally put "Day 2 will keep until tomorrow" in a link to the library, which read as a broken promise (fixed: plain sentence plus a separate "Back to the library" link).
- **One day at a time.** Opening Day 2 after finishing Day 1 the same day shows a soft note in the accent tint, "Continue anyway" to dismiss. Nothing is locked.
- **Expectation setting.** The day meta shows the estimated minutes. The pager now names the neighbouring days ("Day 2 → A Voice on the Page") rather than a bare number.

## Consistency and conventions

- Both completion controls share one store, so ticking the icon updates the bottom button and vice versa.
- The deck persists into day pages hidden; it is now also `visibility: hidden` once it has slid away, so it cannot be tabbed to or show up in full-page captures.
- The Shelf mirrors the reference desk pattern (icon tile, serif title, grey-barred note) but is generated from each day's `source`, so the owner maintains one file per day and nothing else.

## User context

- **Phone propped against a notebook.** Copy mode requests a screen wake lock and re-requests it when the tab returns to view; the top bar says "Screen stays on" while the lock is held. Text size persists per device.
- **Paper.** "Print the passage" opens a sheet with only the passage, source and question. Passages over 220 words print at 11.5pt. Verified: a 350-word passage fits on one page in both A4 and US Letter.
- **Phones.** The section sidebar becomes a sticky, blurred bar with horizontally scrolling pills; the active pill scrolls into view as you read. No horizontal page overflow at 390px.

## Top opportunities

1. Real progress from the server (milestone 3) so "Today", tally marks and done states follow the member across devices.
2. Lock Days 11–15 for members without the add-on and show the upsell in place (milestone 4).
3. Replace the placeholder passages and lessons; they are marked "Sample" on every page until `placeholder: true` is removed.
