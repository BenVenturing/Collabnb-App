// DRAFT — host-side queries/mutations for the Proposals CRM. See README.md.
// Stage vocabulary matches apps/mobile/src/utils/collabStages.js.
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
