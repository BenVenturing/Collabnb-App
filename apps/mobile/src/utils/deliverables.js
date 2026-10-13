// Deliverables model: what a creator owes for a collab, the links they submit,
// and the host's review. Pure functions (no React/Convex) so the same rules
// run on-device and in tests.
//
//   submissions = {
//     order: ["reel-1", "story-1", ...],               // item ids, in display order
//     items: { [id]: { label, url, status, note, submittedAt, reviewedAt } },
//   }
//   status: "todo" -> "submitted" -> "approved" | "changes_requested" -> "submitted" ...
//
// The contract's free-text deliverables ("2 Reels, 4 Stories") seed the list.

export const STATUS = {
  todo: { label: "To do" },
  submitted: { label: "In review" },
  changes_requested: { label: "Changes requested" },
  approved: { label: "Approved" },
};

const singular = (w) => w.replace(/(ies)$/i, "y").replace(/(ses|xes|ches|shes)$/i, (m) => m.slice(0, -2)).replace(/s$/i, "");

// "2 Reels, 4 Stories + 1 Photo set" -> [{id:"reel-1",label:"Reel 1"}, ...]
// Unparseable or empty text falls back to one generic "Content" item.
export function parseDeliverables(text) {
  const parts = String(text || "")
    .split(/,|\+|&|\band\b|\n/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  const seen = {};
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*x?\s*(.+)$/i);
    const count = m ? Math.min(parseInt(m[1], 10), 20) : 1;
    const name = (m ? m[2] : part).trim();
    if (!name || /^\d+$/.test(name)) continue;
    const base = singular(name);
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
    const pretty = base.charAt(0).toUpperCase() + base.slice(1);
    for (let i = 0; i < count; i++) {
      seen[slug] = (seen[slug] || 0) + 1;
      out.push({ id: `${slug}-${seen[slug]}`, label: count > 1 || seen[slug] > 1 ? `${pretty} ${seen[slug]}` : pretty });
    }
  }
  return out.length ? out : [{ id: "content-1", label: "Content" }];
}

export const emptySubmissions = (list) => ({
  order: list.map((i) => i.id),
  items: Object.fromEntries(list.map((i) => [i.id, { label: i.label, url: "", status: "todo", note: "" }])),
});

// Tolerates a JSON string (Convex), an object, or nothing; re-seeds from the
// current deliverables text so edits to the contract add/remove items without
// losing submissions that still match.
export function loadSubmissions(raw, deliverablesText) {
  let saved = raw;
  if (typeof raw === "string") {
    try { saved = JSON.parse(raw); } catch { saved = null; }
  }
  const list = parseDeliverables(deliverablesText);
  const fresh = emptySubmissions(list);
  if (!saved || typeof saved !== "object" || !saved.items) return fresh;
  for (const id of fresh.order) if (saved.items[id]) fresh.items[id] = { ...fresh.items[id], ...saved.items[id] };
  return fresh;
}

const must = (s, id) => {
  if (!s.items[id]) throw new Error("Unknown deliverable");
  return s.items[id];
};
const patch = (s, id, p) => ({ ...s, items: { ...s.items, [id]: { ...s.items[id], ...p } } });

export function isValidUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Creator submits (or resubmits) a link to the published content.
export function submit(s, id, url, now = new Date()) {
  const item = must(s, id);
  if (item.status === "approved") throw new Error("Already approved");
  if (!isValidUrl(url)) throw new Error("Paste the full link, starting with https://");
  return patch(s, id, { url: String(url).trim(), status: "submitted", note: "", submittedAt: now.toISOString() });
}

// Host actions apply only to something that's been submitted.
export function approve(s, id, now = new Date()) {
  if (must(s, id).status !== "submitted") throw new Error("Nothing to approve yet");
  return patch(s, id, { status: "approved", note: "", reviewedAt: now.toISOString() });
}

export function requestChanges(s, id, note, now = new Date()) {
  if (must(s, id).status !== "submitted") throw new Error("Nothing to review yet");
  if (!String(note || "").trim()) throw new Error("Tell the creator what to change");
  return patch(s, id, { status: "changes_requested", note: String(note).trim(), reviewedAt: now.toISOString() });
}

export function progress(s) {
  const all = s.order.map((id) => s.items[id]);
  const count = (st) => all.filter((i) => i.status === st).length;
  return {
    total: all.length,
    approved: count("approved"),
    submitted: count("submitted"),
    changes: count("changes_requested"),
    todo: count("todo"),
    complete: all.length > 0 && all.every((i) => i.status === "approved"),
    started: all.some((i) => i.status !== "todo"),
  };
}
