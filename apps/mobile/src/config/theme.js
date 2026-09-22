// Mirrors the CSS custom properties in Collabnb Website/app/src/index.css :root —
// keep these two in sync by hand; there's no shared package between the repos.
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

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

// Web uses Cabinet Grotesk (display) / Satoshi (body) via Fontshare, which has
// no redistributable font files yet — substituting the Inter weights already
// bundled in _layout.jsx until real font files are added.
export const fonts = {
  display: "Inter-Bold",
  displaySemibold: "Inter-SemiBold",
  body: "Inter-Regular",
  bodyMedium: "Inter-Medium",
  bodySemibold: "Inter-SemiBold",
};

export const theme = { colors, shadows, radii, fonts };

export default theme;
