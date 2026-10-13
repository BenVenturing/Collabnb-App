import test from "node:test";
import assert from "node:assert/strict";
import * as rules from "../convex-drafts/rules.js";
import { CONTRACT_FIELDS, addRound, emptyContract, sign } from "@/utils/contract.js";
import * as deliv from "@/utils/deliverables.js";
import { withStage } from "@/utils/proposalFilters.js";

const J = JSON.stringify;
const throwsMsg = (fn, re) => assert.throws(fn, re);

test("server contract rules: keys stay in sync with the app", () => {
  // rules.js keeps its own FIELD_KEYS (it's copied into the Convex project).
  const k = addRound(emptyContract(), { modifiedBy: "host", fields: Object.fromEntries(CONTRACT_FIELDS.map((f) => [f.key, "x"])) });
  rules.validateContractTransition(null, J(k), "host"); // every app field is accepted
});

test("server contract rules: legitimate flow is accepted end to end", () => {
  let c = emptyContract();
  let next = addRound(c, { modifiedBy: "host", fields: { nights: "3" }, note: "hi" });
  rules.validateContractTransition(J(c), J(next), "host"); c = next;
  next = addRound(c, { modifiedBy: "creator", fields: { nights: "4" } });
  rules.validateContractTransition(J(c), J(next), "creator"); c = next;
  next = sign(c, "creator", "Cleo Creator");
  rules.validateContractTransition(J(c), J(next), "creator"); c = next;
  next = sign(c, "host", "Ann Host");
  const out = rules.validateContractTransition(J(c), J(next), "host");
  assert.equal(out.locked, true);
});

test("server contract rules: tampering is rejected", () => {
  const host1 = addRound(emptyContract(), { modifiedBy: "host", fields: { nights: "3" } });
  // creator forges a round "from the host"
  throwsMsg(() => rules.validateContractTransition(J(host1), J(addRound(host1, { modifiedBy: "host", fields: { nights: "9" } })), "creator"), /written by the party/);
  // creator forges the host's signature
  const forged = { ...host1, signatures: { hostSignature: "Ann Host", hostSignedAt: new Date().toISOString() } };
  throwsMsg(() => rules.validateContractTransition(J(host1), J(forged), "creator"), /other party's signature/);
  // rewriting history
  const rewritten = { ...host1, history: [{ ...host1.history[0], fields: { nights: "30" } }] };
  throwsMsg(() => rules.validateContractTransition(J(host1), J(rewritten), "host"), /earlier rounds/);
  // dropping rounds
  throwsMsg(() => rules.validateContractTransition(J(host1), J(emptyContract()), "host"), /remove earlier rounds/);
  // new terms must clear signatures
  const signed = sign(host1, "host", "Ann Host");
  const keepSig = { ...addRound(signed, { modifiedBy: "creator", fields: { nights: "4" } }), signatures: signed.signatures };
  throwsMsg(() => rules.validateContractTransition(J(signed), J(keepSig), "creator"), /clear all signatures/);
  // locked without both signatures; edits after lock; unknown terms; oversized terms; signing nothing
  throwsMsg(() => rules.validateContractTransition(J(host1), J({ ...host1, locked: true }), "host"), /Lock must match/);
  const locked = sign(sign(host1, "creator", "Cleo Creator"), "host", "Ann Host");
  throwsMsg(() => rules.validateContractTransition(J(locked), J(addRound({ ...locked, locked: false }, { modifiedBy: "host", fields: {} })), "host"), /locked/);
  throwsMsg(() => rules.validateContractTransition(J(emptyContract()), J(addRound(emptyContract(), { modifiedBy: "host", fields: { evil: "x" } })), "host"), /Unknown term/);
  throwsMsg(() => rules.validateContractTransition(J(emptyContract()), J(addRound(emptyContract(), { modifiedBy: "host", fields: { nights: "x".repeat(1001) } })), "host"), /too long/);
  throwsMsg(() => rules.validateContractTransition(J(emptyContract()), J({ history: [], signatures: { hostSignature: "Ann Host", hostSignedAt: new Date().toISOString() }, locked: false }), "host"), /Nothing to sign/);
  throwsMsg(() => rules.validateContractTransition(null, "not json", "host"), /Invalid contract/);
});

test("server deliverable rules: review flow accepted, tampering rejected", () => {
  let s = deliv.emptySubmissions(deliv.parseDeliverables("2 Reels"));
  const V = (prev, next, role) => rules.validateSubmissionsTransition(prev && J(prev), J(next), role);

  let next = deliv.submit(s, "reel-1", "https://instagram.com/reel/a");
  V(s, next, "creator"); let prev = next;
  // creator can't approve own work, or review
  throwsMsg(() => V(prev, deliv.approve(prev, "reel-1"), "creator"), /creator can't move/);
  // creator can't submit without a real link, or smuggle a review note
  throwsMsg(() => V(s, { ...s, items: { ...s.items, "reel-1": { ...s.items["reel-1"], status: "submitted", url: "javascript:alert(1)" } } }, "creator"), /full link/);
  // host: approve / request changes OK
  V(prev, deliv.approve(prev, "reel-1"), "host");
  const changes = deliv.requestChanges(prev, "reel-1", "Tag us");
  V(prev, changes, "host");
  // host can't edit the link, can't review something not submitted, can't approve with a note
  throwsMsg(() => V(prev, { ...prev, items: { ...prev.items, "reel-1": { ...prev.items["reel-1"], status: "approved", url: "https://evil.co" } } }, "host"), /change the submitted link/);
  throwsMsg(() => V(prev, deliv.approve(deliv.submit(prev, "reel-2", "https://x.co/2"), "reel-2"), "host"), /can't review reel-2 while it is todo/);
  throwsMsg(() => V(prev, { ...prev, items: { ...prev.items, "reel-1": { ...prev.items["reel-1"], status: "approved", note: "nice" } } }, "host"), /no note/);
  throwsMsg(() => V(prev, { ...prev, items: { ...prev.items, "reel-1": { ...prev.items["reel-1"], status: "changes_requested", note: "  " } } }, "host"), /what to change/);
  // nobody can rename items, reorder or reshape the list
  throwsMsg(() => V(prev, { ...prev, items: { ...prev.items, "reel-1": { ...prev.items["reel-1"], label: "Hacked" } } }, "creator"), /rename/);
  throwsMsg(() => V(prev, { ...prev, order: ["reel-2", "reel-1"] }, "host"), /list of deliverables/);
  // creator can edit a submitted link before review, but not after approval
  V(prev, deliv.submit(prev, "reel-1", "https://instagram.com/reel/b"), "creator");
  const approved = deliv.approve(prev, "reel-1");
  throwsMsg(() => V(approved, { ...approved, items: { ...approved.items, "reel-1": { ...approved.items["reel-1"], status: "submitted", url: "https://x.co/z" } } }, "creator"), /creator can't move/);
});

test("bulk stage change applies every id in one pass (regression: stale-list overwrite)", () => {
  const list = [{ id: "a", stage: "applied" }, { id: "b", stage: "applied" }, { id: "c", stage: "applied" }];
  // The old behaviour: each call starts from the same stale list -> only the last survives.
  let stale = list;
  for (const id of ["a", "b"]) stale = withStage(list, [id], "declined"); // simulates persist overwriting
  assert.deepEqual(stale.map((p) => p.stage), ["applied", "declined", "applied"]); // 'a' was lost
  // The fix: one pass.
  const fixed = withStage(list, ["a", "b"], "declined");
  assert.deepEqual(fixed.map((p) => p.stage), ["declined", "declined", "applied"]);
  assert.notEqual(fixed[0], list[0]); // immutable
});
