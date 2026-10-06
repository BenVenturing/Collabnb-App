// Mirrors Collabnb Website/app/src/lib/threadColors.js — same palette, same
// grouping rules, so a conversation colored on web and opened on mobile
// (or vice versa) matches. 'grey' is the default and is never auto-assigned.
export const THEME_COLORS = {
  grey: { label: "General", dot: "#9CA3AF" },
  mint: { label: "Mint", dot: "#5FBE93" },
  sky: { label: "Sky", dot: "#5B9BD5" },
  amber: { label: "Amber", dot: "#D4A843" },
  rose: { label: "Rose", dot: "#D98A97" },
  lavender: { label: "Lavender", dot: "#A78BC9" },
};

export const THEME_COLOR_IDS = Object.keys(THEME_COLORS);
export const AUTO_COLOR_IDS = THEME_COLOR_IDS.filter((id) => id !== "grey");

export function threadTheme(thread) {
  return THEME_COLORS[thread?.theme_color] || THEME_COLORS.grey;
}

export function threadColorKey(thread) {
  return thread?.thread_key || thread?.id;
}

export function counterpartKey(thread) {
  return thread?.host_name || "";
}
