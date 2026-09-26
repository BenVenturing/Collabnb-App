# Collabnb mobile — style guide

**Required reading before you touch any UI in this app.** The goal is visual
parity with the web app, which is the design source of truth. If something here
conflicts with what a screen currently does, this document wins and the screen
is wrong.

Source of truth: `Collabnb Website/app/src/index.css` (`:root` and the
`.bg-*` / `.glass*` blocks). Ported into `src/config/theme.js`.

---

## The one rule

**Never hardcode a visual value.** No hex colors, no font family strings, no
magic radii, no bare `letterSpacing` numbers. Import from the theme:

```js
import { colors, fonts, radii, tracking, track, lineHeights, shadows } from "@/config/theme";
```

As of this writing only 9 of ~49 files did this. The rest inline values like
`fontFamily: "Inter-Medium"` and `color: "#192524"`. Those are bugs. If you
open a file and see one, fix it while you're there.

---

## Typography

Cabinet Grotesk is display, Satoshi is body. Both ship real in `assets/fonts`
(ITF Free Font License, embedding in apps permitted). The previous Inter
substitution is gone — if you see `Inter` anywhere, it's stale.

| Use | Token |
| --- | --- |
| Headings, titles, numbers | `fonts.display` (Cabinet Grotesk Bold) |
| Lighter headings | `fonts.displayMedium` |
| Hero / oversized | `fonts.displayExtrabold` |
| Body copy | `fonts.body` (Satoshi Regular) |
| Emphasised body, buttons | `fonts.bodyMedium` / `fonts.bodySemibold` |

**Tracking is not optional.** Web tightens display type and opens small labels.
RN needs absolute points, so always multiply through `track()`:

```js
// A 24px heading
{ fontFamily: fonts.display, fontSize: 24,
  letterSpacing: track(24, tracking.display),   // -0.025em
  lineHeight: 24 * lineHeights.display }        // 1.08

// A small uppercase eyebrow label
{ fontFamily: fonts.bodyMedium, fontSize: 11, textTransform: "uppercase",
  letterSpacing: track(11, tracking.eyebrow) }  // +0.2em
```

Omitting tracking is the second-biggest reason this app read as cheap (after
the wrong typeface). Display type without negative tracking looks generic.

---

## Background — never use flat `colors.bone`

Web stacks **four** layers: bone base, a mint radial glow from top centre,
hazy clouds at `multiply`, and 3% grain. A flat background is not equivalent,
and flatness is the single biggest reason mobile looked less premium.

Use `<AtmosphericBackground />` as the root of every full screen. Do not
reimplement it, and do not set `backgroundColor: colors.bone` on a screen root.

Values live in `theme.backdrop`.

---

## Glass

Three variants, ported from `.glass` / `.glass-sm` / `.glass-card`. Use
`<Glass variant="regular|small|card">`, never a raw `BlurView`.

Two CSS features have no RN equivalent, which is why the component exists:

- **Inset highlight.** CSS puts `inset 0 1px 0 rgba(255,255,255,0.6)` on glass —
  a lit top edge. RN has no inset shadow, so `<Glass>` draws a 1px hairline.
  Without it, glass looks flat and muddy.
- **`saturate()`.** Web blurs with `saturate(140%)`. `expo-blur` can't, so the
  component compensates with a tint overlay. A bare `BlurView` reads grey.

---

## Motion

Use the web's easing curves, not RN defaults. Default timing is the third
reason things feel generic.

```js
import { Easing } from "react-native-reanimated";
import { motion, durations } from "@/config/theme";

withTiming(1, { duration: durations.base, easing: Easing.bezier(...motion.easeOutExpo) });
```

`easeDrawer` is for sheets and drawers specifically — it matches the web's
drawer feel.

---

## Shadows

Use `shadows.sm|md|lg`. They are **deliberate approximations** — web stacks two
shadow layers per elevation and `--shadow-lg` uses a negative spread that RN
cannot express. Do not "correct" them to match the CSS numbers; they're tuned
to look right, not to read right.

---

## Don't

- Don't add a new color. If you need one that isn't in `colors`, the design
  needs a decision, not an invention — ask.
- Don't edit `theme.js` to suit one screen. It is ported from web; changing it
  silently desynchronises the two apps.
- Don't introduce dark-mode styling. Web is light-only.
- Don't reach for a new animation or UI library. `expo-blur`,
  `expo-linear-gradient`, `@shopify/react-native-skia`, `reanimated`,
  `react-native-svg` and `expo-haptics` are all already installed.

## When web and mobile genuinely can't match

Some CSS has no RN equivalent (inset shadows, `saturate()` on blur, layered
shadows, `mix-blend-mode`). When you hit one: get as close as the platform
allows, put the approximation inside a shared component rather than in a
screen, and comment *why* with a pointer to the CSS rule. Never leave the gap
sitting in a screen file where the next person will copy it.
