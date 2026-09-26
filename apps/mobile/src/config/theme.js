// Design tokens, ported 1:1 from the web app's :root in
// Collabnb Website/app/src/index.css.
//
// Values under "WEB PARITY" are mirrored from that stylesheet and must not be
// invented or tweaked locally — if the web changes, re-port. Values under
// "NATIVE ONLY" have no web equivalent (RN needs numeric shadows, Skia needs
// explicit stops) or exist because a CSS feature has no RN equivalent.
//
// See STYLE-GUIDE.md before styling any screen.

/* ── WEB PARITY: color ──────────────────────────────────────────────────── */
export const colors = {
  ink: "#192524",
  slate: "#3C5759",
  sage: "#646B62",
  mint: "#D1EBDB",
  stone: "#D0D5CE",
  bone: "#EFECE9",
  surface: "#FFFFFF",
  surfaceTint: "rgba(255,255,255,0.55)",
  hairline: "rgba(25,37,36,0.08)",
};

/* ── WEB PARITY: type ───────────────────────────────────────────────────── */
// Cabinet Grotesk = display, Satoshi = body. Both are real now (assets/fonts,
// ITF Free Font License) — the old Inter substitution is gone. Weights match
// exactly what index.css loads from Fontshare: satoshi 400/500/700,
// cabinet-grotesk 400/500/700/800.
export const fonts = {
  display: "CabinetGrotesk-Bold",
  displayMedium: "CabinetGrotesk-Medium",
  displayRegular: "CabinetGrotesk-Regular",
  displayExtrabold: "CabinetGrotesk-Extrabold",
  body: "Satoshi-Regular",
  bodyMedium: "Satoshi-Medium",
  bodySemibold: "Satoshi-Bold",
  // Kept because ~40 screens already reference it; same file as displayMedium.
  displaySemibold: "CabinetGrotesk-Medium",
};

// Web expresses tracking in em; RN letterSpacing is absolute points. Multiply
// by fontSize via track() rather than hardcoding a point value per screen.
export const tracking = {
  display: -0.025, // index.css h1–h4
  displayTight: -0.02,
  body: 0,
  label: 0.06,
  labelWide: 0.12,
  eyebrow: 0.2,
};

export const track = (fontSize, em) => fontSize * em;

export const lineHeights = {
  display: 1.08, // index.css h1–h4
  body: 1.6, // index.css body
};

/* ── WEB PARITY: shape ──────────────────────────────────────────────────── */
// xl mirrors the 1.75rem on .glass, lg the 1.25rem on .glass-card,
// md the 1rem on .glass-sm.
export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

/* ── WEB PARITY: the hazy background stack ──────────────────────────────── */
// Four stacked layers on web (.bg-base / .bg-gradient / .bg-clouds /
// .bg-grain). Flat `colors.bone` is NOT equivalent — that flatness is the
// single biggest reason mobile reads cheaper than web. Render via
// <AtmosphericBackground />, never by hand.
export const backdrop = {
  base: colors.bone,
  // radial-gradient(ellipse 90% 60% at 50% 0%, #D1EBDB 0%, transparent 70%)
  glow: {
    color: colors.mint,
    centerX: 0.5,
    centerY: 0,
    radiusX: 0.9,
    radiusY: 0.6,
    stop: 0.7,
  },
  clouds: { opacity: 0.18, saturate: 0.5, brightness: 1.1, blend: "multiply" },
  grain: { opacity: 0.03, baseFrequency: 0.9, tile: 200 },
};

/* ── WEB PARITY: the glass system ───────────────────────────────────────── */
// Three variants from index.css. CSS gives each an inset top highlight that RN
// cannot express as a shadow — <Glass /> draws it as a 1px hairline instead.
// expo-blur also has no saturate(), so tintSaturate is applied as an overlay.
export const glass = {
  regular: {
    background: "rgba(255,255,255,0.55)",
    blur: 24,
    saturate: 1.4,
    border: "rgba(255,255,255,0.6)",
    insetTop: "rgba(255,255,255,0.6)",
    insetBottom: "rgba(25,37,36,0.04)",
    radius: radii.xl,
  },
  small: {
    background: "rgba(255,255,255,0.45)",
    blur: 16,
    saturate: 1.3,
    border: "rgba(255,255,255,0.5)",
    insetTop: "rgba(255,255,255,0.5)",
    insetBottom: null,
    radius: radii.md,
  },
  card: {
    background: "rgba(255,255,255,0.94)",
    blur: 24,
    saturate: 1.4,
    border: "rgba(255,255,255,0.85)",
    insetTop: "rgba(255,255,255,0.8)",
    insetBottom: "rgba(25,37,36,0.04)",
    radius: radii.lg,
  },
};

/* ── WEB PARITY: motion ─────────────────────────────────────────────────── */
// Bezier control points, not Easing objects, so this file stays dependency
// free. Consume as Easing.bezier(...motion.easeOutExpo).
export const motion = {
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeDrawer: [0.32, 0.72, 0, 1],
};

/* ── NATIVE ONLY ────────────────────────────────────────────────────────── */
// Web stacks two box-shadow layers per elevation and uses a negative spread on
// --shadow-lg; RN supports neither, so these are deliberate approximations.
// Do not "fix" them to match the CSS numerically — they are tuned to look the
// same, not to read the same.
export const shadows = {
  sm: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
  },
};

// No web equivalent — CSS transitions are declared per rule there.
export const durations = { fast: 180, base: 260, slow: 420 };

export const theme = {
  colors,
  fonts,
  tracking,
  track,
  lineHeights,
  radii,
  backdrop,
  glass,
  motion,
  shadows,
  durations,
};

export default theme;
