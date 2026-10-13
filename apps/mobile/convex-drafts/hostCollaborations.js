// DRAFT — host-side queries/mutations for the Proposals CRM. See README.md.
// Stage vocabulary matches apps/mobile/src/utils/collabStages.js.
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateContractTransition, validateSubmissionsTransition } from "./rules";

const CREATOR_STAGES = ["pending", "updated", "accepted", "uploaded_tagged", "closed", "archived"];

// ASSUMPTION: collaboration rows carry host_id (string profile id) — the
// creator side already filters by creator_id via getByCreator.
export const getByHost = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) => {
    const all = await ctx.db.query("collaborations").collect();
    return all.filter((c) => c.host_id === hostId);
  },
});

async function ownedBy(ctx, id, hostId) {
  const collab = await ctx.db.get(id);
  if (!collab) throw new Error("Collaboration not found");
  if (collab.host_id !== hostId) throw new Error("Not your collaboration");
  return collab;
}

// Host moves a proposal between pipeline columns. The client translates the
// CRM stage to these values with creatorPatchFor().
export const setStage = mutation({
  args: {
    id: v.id("collaborations"),
    hostId: v.string(),
    current_stage: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, hostId, current_stage, status }) => {
    const collab = await ownedBy(ctx, id, hostId);
    if (current_stage !== undefined && !CREATOR_STAGES.includes(current_stage)) {
      throw new Error(`Unknown stage: ${current_stage}`);
    }
    // Record the transition date in the same `stages` JSON the web app reads.
    let stages = {};
    try { stages = collab.stages ? JSON.parse(collab.stages) : {}; } catch { /* keep {} */ }
    const patch = {};
    if (current_stage !== undefined) {
      patch.current_stage = current_stage;
      stages[current_stage] = { ...(stages[current_stage] || {}), date: new Date().toISOString().slice(0, 10) };
      patch.stages = JSON.stringify(stages);
    }
    if (status !== undefined) patch.status = status;
    await ctx.db.patch(id, patch);
  },
});

// Host-private CRM fields (notes, stay dates, deliverables edits).
export const saveDetails = mutation({
  args: {
    id: v.id("collaborations"),
    hostId: v.string(),
    host_note: v.optional(v.string()),
    stay_dates: v.optional(v.string()),
    deliverables: v.optional(v.string()),
  },
  handler: async (ctx, { id, hostId, ...fields }) => {
    await ownedBy(ctx, id, hostId);
    const patch = Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined));
    await ctx.db.patch(id, patch);
  },
});

// ── Contract (shared by host and creator) ─────────────────────────────────
// ASSUMPTION: a `contract` string column (JSON) on collaborations holding
// { history, signatures, locked } — see src/utils/contract.js. The caller
// passes the whole next contract; the server re-checks ownership, lock state
// and that a lock really has both signatures before accepting it.
export const saveContract = mutation({
  args: {
    id: v.id("collaborations"),
    role: v.union(v.literal("host"), v.literal("creator")),
    profileId: v.string(),
    contract: v.string(),
  },
  handler: async (ctx, { id, role, profileId, contract }) => {
    const collab = await ctx.db.get(id);
    if (!collab) throw new Error("Collaboration not found");
    const owner = role === "host" ? collab.host_id : collab.creator_id; // ASSUMPTION
    if (owner !== profileId) throw new Error("Not your collaboration");
    if (collab.status === "terminated") throw new Error("This collaboration was ended");

    // Throws unless this is a move this party is allowed to make (see rules.js).
    const next = validateContractTransition(collab.contract, contract, role);

    const patch = { contract: JSON.stringify(next) };
    if (next.locked) {
      // Both signed -> Confirmed (creator-side "accepted").
      patch.current_stage = "accepted";
    } else if ((next.history || []).length && collab.current_stage === "pending") {
      patch.current_stage = "updated"; // negotiating
    }
    await ctx.db.patch(id, patch);
  },
});

// ── Deliverables (creator submits links, host reviews) ────────────────────
// ASSUMPTION: a `deliverable_submissions` string column (JSON) on
// collaborations — shape in src/utils/deliverables.js. The whole next state is
// sent; the server accepts only the transitions each role may make, so neither
// side can approve their own work or rewrite the other's review.
export const saveDeliverables = mutation({
  args: {
    id: v.id("collaborations"),
    role: v.union(v.literal("host"), v.literal("creator")),
    profileId: v.string(),
    submissions: v.string(),
  },
  handler: async (ctx, { id, role, profileId, submissions }) => {
    const collab = await ctx.db.get(id);
    if (!collab) throw new Error("Collaboration not found");
    const owner = role === "host" ? collab.host_id : collab.creator_id; // ASSUMPTION
    if (owner !== profileId) throw new Error("Not your collaboration");
    if (collab.status === "terminated") throw new Error("This collaboration was ended");
    if (!["accepted", "updated", "uploaded_tagged"].includes(collab.current_stage)) {
      throw new Error("Deliverables open once the contract is signed");
    }

    // Throws unless this is a move this party is allowed to make (see rules.js).
    const next = validateSubmissionsTransition(collab.deliverable_submissions, submissions, role);

    const patch = { deliverable_submissions: JSON.stringify(next) };
    const allApproved = next.order.length > 0 && next.order.every((k) => next.items[k].status === "approved");
    if (allApproved) {
      patch.current_stage = "closed"; // Completed
    } else if (role === "creator" && collab.current_stage !== "uploaded_tagged") {
      patch.current_stage = "uploaded_tagged"; // Live
    }
    await ctx.db.patch(id, patch);
  },
});

// ── Ending a collaboration (creator withdraws / either party leaves) ──────
// ASSUMPTION: status "terminated" (what the creator tab already renders) plus
// ended_by / end_reason columns. Finished collabs can't be ended.
export const endCollaboration = mutation({
  args: {
    id: v.id("collaborations"),
    role: v.union(v.literal("host"), v.literal("creator")),
    profileId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, role, profileId, reason }) => {
    const collab = await ctx.db.get(id);
    if (!collab) throw new Error("Collaboration not found");
    const owner = role === "host" ? collab.host_id : collab.creator_id; // ASSUMPTION
    if (owner !== profileId) throw new Error("Not your collaboration");
    if (collab.status === "terminated") return; // already ended — idempotent
    if (["closed", "archived"].includes(collab.current_stage)) throw new Error("This collaboration is already completed");
    await ctx.db.patch(id, { status: "terminated", ended_by: role, end_reason: (reason || "").slice(0, 500) });
  },
});
