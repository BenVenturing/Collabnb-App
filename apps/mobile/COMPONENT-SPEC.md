# Collabnb mobile — component spec

Transcribed from screenshots of the **web app running on a phone**, which is the
design target. Read with `STYLE-GUIDE.md` (rules) and `src/config/theme.js`
(tokens). This file is the *composition* layer: what the pieces are and how they
assemble. Tokens alone were not enough — round 1 fixed colors and type and the
app still didn't look like web, because the components differ.

Build these **before** rebuilding screens. Three agents inventing three listing
cards is the failure mode this exists to prevent.

---

## Why this file exists

Round 1 swept 1,710 hardcoded colors down to 557 and put real fonts in. The app
still doesn't match web, because web composes a specific vocabulary of ~16
recurring pieces that mobile never built. Correct atoms in the wrong molecules
still read wrong.

---

## Global

**Never replicate the web's floating pill navbar.** On web-on-phone a rounded
glass bar with logo + bell + hamburger + avatar floats over every screen. Mobile
has a native tab bar and must not carry that header — the owner confirmed it's
being removed from web too.

**Bottom tab bar** (mobile already matches): compass · heart · people · chat ·
person. Active tab gets a rounded-square tinted background behind the icon.

**Map is Mapbox, not Apple Maps.** Web uses Mapbox including a globe projection
at low zoom. `EXPO_PUBLIC_MAPBOX_TOKEN` is already in env.

---

## 1. Eyebrow label
Uppercase, wide tracking, sage, small. Used above form fields and stat groups:
`WHERE` · `WHAT` · `WHEN` · `CREATOR TIER` · `COMPENSATION` · `DELIVERABLES` ·
`WHAT YOU GET` · `WHAT YOU DELIVER` · `LOCATION` · `DATES` · `PAYMENT` · `USAGE`.

`fonts.bodyMedium`, ~11px, `colors.sage`, `textTransform: "uppercase"`,
`letterSpacing: track(11, tracking.eyebrow)`.

## 2. Mint chip
Pill, mint-tinted fill, hairline border, ink text. Two sizes and two states.
Seen as: `FOUNDING MEMBER` (with ★), filter chips (`Treehouse`/`Glamping`/
`Lodge`), `UGC Video`, `Photography`, `$1,200 + 3-night stay`, `12 CREATORS`.
Active/selected state inverts to `colors.ink` fill with `colors.bone` text
(web's `.chip.active`). Stat pills use eyebrow tracking; content tags don't.

## 3. Status chip
Same pill shape, semantic fill. Web uses amber for load warnings
(`Custom campaign Load`) and rose for deadlines (`Due in 14 days`).
**These two colors are not in the 9-token palette.** Do not invent them — pull
the exact values off the web component and add them to `theme.js` as
`colors.warning` / `colors.danger` in one commit, then use only those.
Web's danger anchor is `#7F1D1D`.

## 4. Glass card
`<Glass variant="card">`. The workhorse: stat grids, Links & Socials rows, the
Offer block, Travel Calendar, contract forms. Generous internal padding,
`radii.lg`.

## 5. Stat grid
Inside a glass card: 2×2 (or 2×3) cells split by 1px hairline rules running
full bleed both directions. Each cell = big `fonts.display` value over a small
`colors.sage` label. Seen as Collabs / Followers / Profile ER / Content ER, and
as the contract's LOCATION / DATES / PROPERTY / DELIVERABLES / PAYMENT / USAGE.
An em-dash `—` is the empty state, not "0" and not blank.
Optional footer line: `↻ Updated just now`, centered, sage.

## 6. Section heading
Bold `fonts.display` title, an underlined `see all` link baseline-aligned to its
right, and a `colors.sage` subtitle underneath.
Examples: **Trending Now** / see all / "Top picks this week" ·
**All Stays** / see all / "6 collabs available" · **Saved** / "1 stay".

## 7. Listing card
Image on top with `radii.lg` corners, body below on near-opaque white.
- Image overlays: `FEATURED` mint chip top-left; circular white heart button
  top-right (filled ink when saved).
- Body: title (`fonts.display`), location (sage), price line
  (`fonts.bodySemibold`, e.g. `$1,000 Cash` / `$1,200 + 3-night stay`),
  deliverables line (sage, e.g. `2 Reels, 6 Photos, 2 Stories`), date range
  (sage), and a right-aligned mint chip for the type.
- Footer: hairline rule, then a small avatar + `by Ben Venturing` where the
  name is emphasised.
Horizontal carousels show the next card peeking at the screen edge — that
peek is intentional, don't pad it away.

## 8. Compact list row
The bottom-sheet variant: small rounded thumbnail left, title / location / price
stacked right. Used in the map sheet.

## 9. Search bar
One glass pill split into three tap targets by vertical hairlines —
`WHERE` / `WHAT` / `WHEN`, each an eyebrow label over a value or placeholder —
with a circular dark ink search button on the right end.

## 10. Dark pill button
`colors.ink` fill, white label, fully rounded. Primary action.
Seen as `Map`, `+ Add trip`, `Apply Now →`, `Saved 1`, `+ New Contract`.
Web's hover is `#2a3a39`; press is `scale(0.97)` — mirror that with
`durations.fast` and `motion.easeOutQuart`.

## 11. Glass pill button
Translucent counterpart for secondary actions: `Back`, `Share`, `Save`,
`Share Profile`, `Show all photos`, `Show list`, `Show map`, `Search this area`.
Often paired with a leading icon. Same 0.97 press scale.

## 12. Sticky action bar
Pinned above the tab bar on listing detail. Left: price
(`fonts.display`, e.g. `$1,200 + Stay`) over a sage sub-line
(`24 deliverables`). Right: a wide dark pill CTA (`Apply Now →`). Sits on an
opaque surface so content scrolls beneath it cleanly.

## 13. Bottom sheet
Rounded top corners, centred grey drag handle, opaque bone surface.
Header line (`1 collab available` / `6 collabs here`), then a horizontal row of
compact rows or cards. Used over the map.

## 14. Segmented toggle
Pill-shaped track with the active segment as a filled dark pill and the inactive
as plain text. Seen as `Earnings | Applications`.

## 15. Form field
Eyebrow label above a rounded rectangle input with a hairline border and a
generous tap target. Placeholder is sage at reduced emphasis. Date fields are
two chevron dropdowns separated by an em-dash. Seen throughout Build Contract.

## 16. Loading screen
Full-bleed clouds background with the mint glow, the constellation/network mark
centred, and `LOADING...` beneath it in wide-tracked uppercase sage. This is a
branded screen, not a spinner — it's the first thing users see, so it matters
more than its size suggests.

## 17. Menu overlay
Heavy blur over the current screen, nav items stacked and centred in large
`fonts.display` ink (`Explore` · `Collabs` · `Saved` · `Inbox` · `Founders`),
with a dark pill action beneath. The close `X` replaces the hamburger in place.

## 18. Message bubble
Own messages: dark slate fill, white text, generous radius, timestamp bottom-
right inside the bubble. Composer is a rounded field with attachment, document,
sparkle (AI), and send icons trailing, plus an
`Enter to send • Shift+Enter for new line` hint in sage beneath.

## 19. Profile header
Hero media (video on web) bleeding to the top edge, a circular avatar with a
thick white ring overlapping its lower edge, then centred name
(`fonts.display`), a mint chip (`★ FOUNDING MEMBER`), and a sage
`@handle • location` line.

---

## Verification without a working backend

Several screens (Collabs, Saved, Inbox, Profile) don't reliably load, so they
can't be used to check styling. Build a dev-only **component gallery** screen
that renders every component above against static props and no Convex queries.
It loads instantly, is immune to socket drops, and is the fastest way to check a
component against these notes. Verify there first, then on real screens.
