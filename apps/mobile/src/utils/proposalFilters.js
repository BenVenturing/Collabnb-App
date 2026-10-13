// Search / filter / bulk helpers for the host Proposals pipeline. Pure.

const norm = (s) => String(s || "").toLowerCase().trim();

// query matches creator name, handle, listing, or the host's note.
export function filterProposals(list, { query = "", tier = "all", listing = "all" } = {}) {
  const q = norm(query);
  return list.filter((p) => {
    if (tier !== "all" && p.tier !== tier) return false;
    if (listing !== "all" && p.listing !== listing) return false;
    if (!q) return true;
    return [p.creatorName, p.handle, p.listing, p.note].some((f) => norm(f).includes(q));
  });
}

// Distinct listing names, most-used first, for the listing filter chips.
export function listingOptions(list) {
  const counts = new Map();
  for (const p of list) if (p.listing) counts.set(p.listing, (counts.get(p.listing) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}

// Stages a bulk decline may touch: anything still in play. Completed work and
// already-declined proposals are left alone.
export const canDecline = (p) => p.stage !== "completed" && p.stage !== "declined";

// Returns a new list with `stage` applied to every proposal in `ids` in ONE
// pass. Bulk actions must use this rather than calling a single-proposal
// updater in a loop: each call there starts from the same render-time list, so
// the last write silently undoes the earlier ones.
export function withStage(list, ids, stage, lastUpdate = "just now") {
  const set = new Set(ids);
  return list.map((p) => (set.has(p.id) ? { ...p, stage, lastUpdate } : p));
}
