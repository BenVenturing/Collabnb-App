// Pure helpers behind the host Proposals CRM's server sync. No React, no
// Convex imports, so they can be unit-tested and reused by either backend.

import { crmStageFor } from "@/utils/collabStages";
import { parseContract } from "@/utils/contract";

// Convex `collaborations` row -> the proposal shape proposals.jsx renders.
// ASSUMPTION: creator_name / creator_handle / creator_tier / creator_followers
// may not exist on the row yet; sensible fallbacks keep the card renderable.
export function collabToProposal(c) {
  // Server-held contract (shared with the creator) wins over any local copy.
  const contract = c.contract_draft ? parseContract(c.contract_draft) : null;
  return {
    ...(contract && { contractHistory: contract.history, signatures: contract.signatures, locked: contract.locked }),
    id: `cvx_${String(c._id)}`,
    convexId: String(c._id),
    submissionsRaw: c.deliverable_submissions,
    source: "convex",
    creatorId: c.creator_id,
    creatorName: c.creator_name || "Creator",
    handle: c.creator_handle || "",
    tier: c.creator_tier || "UGC Beginner",
    followers: c.creator_followers || "",
    listing: c.property_name || "Collaboration",
    listingId: c.listing_id,
    stage: crmStageFor(c),
    note: c.host_note || "",
    stayDates: c.stay_dates || "",
    deliverables: c.deliverables || "",
    lastUpdate: "synced",
  };
}

// Fields the server may not hold yet (a row with no contract). They stay in
// the local copy of a server proposal and fill in only where the server has
// nothing — once a contract exists on the server, it wins.
const LOCAL_ONLY = ["contractHistory", "signatures", "locked"];

// Local proposals (invites, samples) + server proposals. A server proposal
// replaces a local "invited" one for the same creator+listing — that's the
// moment the creator actually applied. Server fields win; LOCAL_ONLY fields
// are carried over from the local copy of the same proposal.
export function mergeProposals(local, remote) {
  const localById = new Map(local.map((p) => [p.id, p]));
  const remoteKeys = new Set(remote.map((p) => `${p.creatorId}:${p.listingId}`));
  const merged = remote.map((r) => {
    const l = localById.get(r.id);
    return l ? { ...r, ...Object.fromEntries(LOCAL_ONLY.filter((k) => l[k] !== undefined && r[k] === undefined).map((k) => [k, l[k]])) } : r;
  });
  const keptLocal = local.filter(
    (p) => p.source !== "convex" && !(p.stage === "invited" && remoteKeys.has(`${p.creatorId}:${p.listingId}`))
  );
  return [...merged, ...keptLocal];
}
