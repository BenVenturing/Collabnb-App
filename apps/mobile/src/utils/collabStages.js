// One vocabulary for a collaboration's lifecycle.
//
// The creator tab reads the Convex `collaborations.current_stage` values
// (the web app's STAGES); the host Proposals CRM uses its own six-column
// pipeline. These helpers translate between them so both sides can point at
// the same record.
//
//   host CRM        creator / Convex current_stage
//   ─────────────   ──────────────────────────────
//   invited         (none — host-only until the creator applies)
//   applied         pending
//   negotiating     updated        ("Adjustments")
//   confirmed       accepted
//   live            uploaded_tagged
//   completed       closed
//   declined        status === "terminated"
//
// "archived" is a creator-side view state of a finished collab, not a stage
// the host moves a proposal into.

export const CRM_TO_CREATOR = {
  applied: "pending",
  negotiating: "updated",
  confirmed: "accepted",
  live: "uploaded_tagged",
  completed: "closed",
};

export const CREATOR_TO_CRM = {
  pending: "applied",
  updated: "negotiating",
  accepted: "confirmed",
  uploaded_tagged: "live",
  closed: "completed",
  archived: "completed",
};

// Stage the host CRM should show for a Convex collaboration record.
export function crmStageFor(collab) {
  if (collab?.status === "terminated") return "declined";
  return CREATOR_TO_CRM[collab?.current_stage] ?? "applied";
}

// current_stage / status a host-side stage change should write back.
// Returns null for "invited" (no record exists to update yet).
export function creatorPatchFor(crmStage) {
  if (crmStage === "declined") return { status: "terminated" };
  const current_stage = CRM_TO_CREATOR[crmStage];
  return current_stage ? { current_stage } : null;
}
