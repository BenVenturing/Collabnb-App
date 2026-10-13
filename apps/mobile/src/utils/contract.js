// Contract model shared by the host CRM and the creator collab screen. Shapes
// match what the host Proposals CRM (transcribed from the web app) already
// stores, so both sides read and write the same record:
//
//   contract = {
//     history:    [{ version, modifiedBy: "host" | "creator", fields, note }],
//     signatures: { hostSignature, hostSignedAt, creatorSignature, creatorSignedAt },
//     locked:     boolean,   // true once both parties have signed
//   }
//
// Pure functions, no React/Convex — unit-testable and backend-agnostic.

export const CONTRACT_FIELDS = [
  { key: "nights", label: "Nights", placeholder: "e.g. 3 nights" },
  { key: "compensation", label: "Compensation", placeholder: "e.g. $500 + 2 nights free" },
  { key: "deliverables", label: "Deliverables", placeholder: "e.g. 2 Reels, 4 Stories" },
  { key: "turnaround", label: "Turnaround", placeholder: "e.g. 14 days after checkout" },
  { key: "affiliate", label: "Affiliate %", placeholder: "e.g. 10%" },
  { key: "extra_terms", label: "Extra Terms", placeholder: "Any additional terms..." },
];

export const emptyContract = () => ({ history: [], signatures: {}, locked: false });

// Tolerates a JSON string (how Convex stores it), an object, or nothing.
export function parseContract(raw) {
  let c = raw;
  if (typeof raw === "string") {
    try { c = JSON.parse(raw); } catch { c = null; }
  }
  if (!c || typeof c !== "object") return emptyContract();
  return {
    history: Array.isArray(c.history) ? c.history : [],
    signatures: c.signatures && typeof c.signatures === "object" ? c.signatures : {},
    locked: !!c.locked,
  };
}

// Latest agreed-so-far terms; falls back to blank fields seeded with the
// listing's deliverables, like the host's getLatestContractFields.
export function latestFields(contract, seed = {}) {
  const h = contract?.history;
  if (h?.length) return { ...h[h.length - 1].fields };
  const out = {};
  CONTRACT_FIELDS.forEach((f) => { out[f.key] = seed[f.key] || ""; });
  return out;
}

export const isLocked = (c) => !!(c?.signatures?.hostSignature && c?.signatures?.creatorSignature);

// Whose move it is: the party that did NOT write the latest round. With no
// rounds yet, the host moves first (they answer the creator's pitch).
export function waitingOn(contract) {
  if (contract?.locked) return null;
  const last = contract?.history?.[contract.history.length - 1];
  if (!last) return "host";
  return last.modifiedBy === "host" ? "creator" : "host";
}

export function addRound(contract, { modifiedBy, fields, note = "" }) {
  if (contract.locked) throw new Error("Contract is locked");
  if (modifiedBy !== "host" && modifiedBy !== "creator") throw new Error("Unknown party");
  // New terms invalidate any earlier signatures.
  return {
    ...contract,
    history: [...contract.history, { version: contract.history.length + 1, modifiedBy, fields, note }],
    signatures: {},
    locked: false,
  };
}

export function sign(contract, role, name, now = new Date()) {
  if (contract.locked) throw new Error("Contract is locked");
  const clean = (name || "").trim();
  if (clean.length < 2) throw new Error("Type your full name to sign");
  if (!contract.history.length) throw new Error("Nothing to sign yet");
  const signatures = {
    ...contract.signatures,
    [`${role}Signature`]: clean,
    [`${role}SignedAt`]: now.toISOString(),
  };
  const next = { ...contract, signatures };
  return { ...next, locked: isLocked(next) };
}
