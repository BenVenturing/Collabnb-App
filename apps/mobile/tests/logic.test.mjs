import test from "node:test";
import assert from "node:assert/strict";
import * as stages from "@/utils/collabStages.js";
import * as timeline from "@/utils/collabTimeline.js";
import * as contract from "@/utils/contract.js";
import * as pipeline from "@/utils/hostPipeline.js";

test("stage map round-trips and handles terminated", () => {
  for (const [crm, cr] of Object.entries(stages.CRM_TO_CREATOR)) assert.equal(stages.CREATOR_TO_CRM[cr], crm);
  assert.equal(stages.crmStageFor({ current_stage: "accepted", status: "terminated" }), "declined");
  assert.equal(stages.crmStageFor({}), "applied");
  assert.deepEqual(stages.creatorPatchFor("live"), { current_stage: "uploaded_tagged" });
  assert.equal(stages.creatorPatchFor("invited"), null);
});

test("timeline states", () => {
  const st = (c) => timeline.buildTimeline(c).map((s) => s.state).join(",");
  assert.equal(st({ currentStage: "pending" }), "current,upcoming,upcoming,upcoming,upcoming");
  assert.equal(st({ currentStage: "closed" }), "done,done,done,done,done");
  assert.equal(st({ currentStage: "archived" }), "done,done,done,done,done");
  assert.equal(st({ currentStage: "accepted", status: "terminated" }), "done,stopped,upcoming,upcoming,upcoming");
});

test("contract negotiation, signing and locking", () => {
  let k = contract.emptyContract();
  assert.equal(contract.waitingOn(k), "host");
  assert.throws(() => contract.sign(k, "host", "Ann Host"), /Nothing to sign/);
  k = contract.addRound(k, { modifiedBy: "host", fields: { nights: "3" } });
  assert.equal(contract.waitingOn(k), "creator");
  k = contract.addRound(k, { modifiedBy: "creator", fields: { nights: "4" } });
  k = contract.sign(k, "creator", " Cleo Creator ");
  assert.equal(k.signatures.creatorSignature, "Cleo Creator");
  assert.deepEqual(contract.addRound(k, { modifiedBy: "host", fields: {} }).signatures, {}); // new terms wipe signatures
  k = contract.sign(k, "host", "Ann Host");
  assert.equal(k.locked, true);
  assert.throws(() => contract.addRound(k, { modifiedBy: "host", fields: {} }), /locked/);
  assert.throws(() => contract.sign(contract.addRound(contract.emptyContract(), { modifiedBy: "host", fields: {} }), "creator", "x"), /full name/);
  assert.deepEqual(contract.parseContract("not json"), contract.emptyContract());
});

test("host pipeline merge: applications replace invites, server contract wins", () => {
  const row = { _id: "abc", creator_id: "c1", listing_id: "l1", property_name: "Cedar Cabin", current_stage: "accepted" };
  const r = pipeline.collabToProposal(row);
  assert.equal(r.stage, "confirmed");
  const invited = { id: "p_1", creatorId: "c1", listingId: "l1", stage: "invited" };
  const other = { id: "p_2", creatorId: "c2", listingId: "l1", stage: "invited" };
  assert.deepEqual(pipeline.mergeProposals([invited, other], [r]).map((p) => p.id), ["cvx_abc", "p_2"]);

  const k = contract.addRound(contract.emptyContract(), { modifiedBy: "creator", fields: { nights: "2" } });
  const r2 = pipeline.collabToProposal({ ...row, contract: JSON.stringify(k) });
  const stale = { ...r2, contractHistory: [], signatures: { hostSignature: "old" } };
  const merged = pipeline.mergeProposals([stale], [r2])[0];
  assert.equal(merged.contractHistory.length, 1);
  assert.deepEqual(merged.signatures, {});
  assert.equal(pipeline.mergeProposals([stale], []).length, 0); // removed server row drops its overlay
});
