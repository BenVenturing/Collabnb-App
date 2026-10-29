// Country → landmark icon key for the Where search. Keys resolve in
// components/explore/PlaceIcon.jsx. Anything without an obvious landmark gets
// a palm, castle, mountain etc. so no country falls back to a bare pin.

export const COUNTRY_ICONS = [
  { name: "United States", icon: "liberty", aliases: ["usa", "us", "america"] },
  { name: "Canada", icon: "maple" },
  { name: "Mexico", icon: "cactus" },
  { name: "Costa Rica", icon: "turtle" },
  { name: "Belize", icon: "shell" },
  { name: "Bahamas", icon: "shell" },
  { name: "Jamaica", icon: "palm" },
  { name: "Dominican Republic", icon: "palm" },
  { name: "Colombia", icon: "palm" },
  { name: "Ecuador", icon: "turtle", aliases: ["galapagos"] },
  { name: "Peru", icon: "mountain" },
  { name: "Brazil", icon: "palm" },
  { name: "Argentina", icon: "drama" },
  { name: "Chile", icon: "mountainSnow" },
  { name: "United Kingdom", icon: "clocktower", aliases: ["uk", "britain", "england", "london"] },
  { name: "Scotland", icon: "castle" },
  { name: "Ireland", icon: "castle" },
  { name: "France", icon: "eiffel" },
  { name: "Spain", icon: "church" },
  { name: "Portugal", icon: "lighthouse" },
  { name: "Italy", icon: "pisa" },
  { name: "Malta", icon: "church" },
  { name: "Germany", icon: "castle" },
  { name: "Netherlands", icon: "windmill", aliases: ["holland"] },
  { name: "Switzerland", icon: "mountainSnow" },
  { name: "Austria", icon: "mountain" },
  { name: "Czech Republic", icon: "castle", aliases: ["czechia", "prague"] },
  { name: "Poland", icon: "castle" },
  { name: "Hungary", icon: "castle" },
  { name: "Slovenia", icon: "castle" },
  { name: "Croatia", icon: "castle" },
  { name: "Montenegro", icon: "mountain" },
  { name: "Romania", icon: "castle" },
  { name: "Estonia", icon: "castle" },
  { name: "Greece", icon: "landmark" },
  { name: "Cyprus", icon: "landmark" },
  { name: "Iceland", icon: "mountainSnow" },
  { name: "Norway", icon: "mountainSnow" },
  { name: "Sweden", icon: "pine" },
  { name: "Finland", icon: "pine" },
  { name: "Denmark", icon: "sailboat" },
  { name: "Turkey", icon: "mosque", aliases: ["turkiye"] },
  { name: "Georgia", icon: "mountain" },
  { name: "Morocco", icon: "mosque" },
  { name: "Tunisia", icon: "mosque" },
  { name: "Egypt", icon: "pyramid" },
  { name: "Kenya", icon: "acacia" },
  { name: "Tanzania", icon: "acacia", aliases: ["zanzibar"] },
  { name: "South Africa", icon: "mountain" },
  { name: "Namibia", icon: "cactus" },
  { name: "Mauritius", icon: "palm" },
  { name: "Seychelles", icon: "shell" },
  { name: "Maldives", icon: "palm" },
  { name: "United Arab Emirates", icon: "burj", aliases: ["uae", "dubai", "abu dhabi"] },
  { name: "Saudi Arabia", icon: "mosque" },
  { name: "Israel", icon: "landmark" },
  { name: "Jordan", icon: "landmark" },
  { name: "India", icon: "mosque" },
  { name: "Sri Lanka", icon: "palm" },
  { name: "Nepal", icon: "mountainSnow" },
  { name: "Thailand", icon: "pagoda" },
  { name: "Cambodia", icon: "pagoda" },
  { name: "Vietnam", icon: "pagoda" },
  { name: "Indonesia", icon: "pagoda", aliases: ["bali"] },
  { name: "Philippines", icon: "palm" },
  { name: "Malaysia", icon: "twin" },
  { name: "Singapore", icon: "building" },
  { name: "Japan", icon: "torii" },
  { name: "South Korea", icon: "pagoda", aliases: ["korea"] },
  { name: "China", icon: "wall" },
  { name: "Australia", icon: "opera" },
  { name: "New Zealand", icon: "mountain" },
  { name: "Fiji", icon: "palm" },
];

// Best-guess landmark for a free-text listing location ("Ubud, Indonesia",
// "Asheville, NC"). A trailing two-letter code is a US state.
export function iconForLocation(location = "") {
  const s = String(location).toLowerCase();
  let best = null;
  for (const c of COUNTRY_ICONS) {
    for (const term of [c.name, ...(c.aliases ?? [])]) {
      const t = term.toLowerCase();
      // Short aliases (us, uk, uae) must be whole words or "Austin" matches "us".
      const hit = t.length <= 3 ? new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(s) : s.includes(t);
      if (hit && (!best || t.length > best.len)) best = { icon: c.icon, len: t.length };
    }
  }
  if (best) return best.icon;
  if (/,\s*[a-z]{2}$/.test(s)) return "liberty";
  return "pin";
}
