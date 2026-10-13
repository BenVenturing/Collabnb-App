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

import * as deliv from "@/utils/deliverables.js";
import * as reminders from "@/utils/reminders.js";

test("deliverables are parsed from contract text", () => {
  const ids = (t) => deliv.parseDeliverables(t).map((i) => i.id).join(",");
  assert.equal(ids("2 Reels, 4 Stories"), "reel-1,reel-2,story-1,story-2,story-3,story-4");
  assert.equal(deliv.parseDeliverables("2 Reels")[1].label, "Reel 2");
  assert.equal(deliv.parseDeliverables("1 Photo set")[0].label, "Photo set");
  assert.equal(ids("3 Reels and 1 TikTok + 2 Reels"), "reel-1,reel-2,reel-3,tiktok-1,reel-4,reel-5");
  assert.equal(ids(""), "content-1");
  assert.equal(ids(undefined), "content-1");
  assert.equal(deliv.parseDeliverables("500 Posts").length, 20); // capped
});

test("deliverable review flow", () => {
  let s = deliv.emptySubmissions(deliv.parseDeliverables("2 Reels"));
  assert.equal(deliv.progress(s).started, false);
  assert.throws(() => deliv.submit(s, "reel-1", "not a link"), /full link/);
  assert.throws(() => deliv.approve(s, "reel-1"), /Nothing to approve/);
  s = deliv.submit(s, "reel-1", " https://instagram.com/reel/abc ");
  assert.equal(s.items["reel-1"].url, "https://instagram.com/reel/abc");
  assert.throws(() => deliv.requestChanges(s, "reel-1", "  "), /what to change/);
  s = deliv.requestChanges(s, "reel-1", "Tag the host");
  assert.equal(s.items["reel-1"].status, "changes_requested");
  s = deliv.submit(s, "reel-1", "https://instagram.com/reel/abc2"); // resubmit clears the note
  assert.equal(s.items["reel-1"].note, "");
  s = deliv.approve(s, "reel-1");
  assert.throws(() => deliv.submit(s, "reel-1", "https://x.co"), /Already approved/);
  assert.equal(deliv.progress(s).complete, false);
  s = deliv.approve(deliv.submit(s, "reel-2", "https://x.co/2"), "reel-2");
  const p = deliv.progress(s);
  assert.equal(p.complete, true); assert.equal(p.approved, 2);
});

test("submissions survive edits to the deliverables text", () => {
  let s = deliv.submit(deliv.emptySubmissions(deliv.parseDeliverables("1 Reel")), "reel-1", "https://x.co/a");
  const loaded = deliv.loadSubmissions(JSON.stringify(s), "2 Reels");
  assert.equal(loaded.order.length, 2);
  assert.equal(loaded.items["reel-1"].status, "submitted");
  assert.equal(loaded.items["reel-2"].status, "todo");
  assert.equal(deliv.loadSubmissions("garbage", "1 Reel").order.length, 1);
});

test("reminder planning", () => {
  const now = new Date("2026-10-12T15:30:00");
  const base = { id: "c1", isActive: true, status: "active", currentStage: "accepted", propertyName: "Cedar Cabin" };
  const ids = (cs) => reminders.planReminders({ collabs: cs, now }).map((r) => r.identifier.split(":").slice(2).join(":")).join(",");

  assert.equal(ids([{ ...base, daysLeft: 10 }]), "due-3,due-1,due-0");
  const plan = reminders.planReminders({ collabs: [{ ...base, daysLeft: 10 }], now });
  assert.equal(plan[0].date.getHours(), 10);
  assert.equal(Math.round((plan[0].date - now) / 86400000), 7); // 3 days before day 10
  assert.equal(ids([{ ...base, daysLeft: 2 }]), "due-1,due-0"); // 3-day mark already passed
  assert.equal(ids([{ ...base, daysLeft: 0 }]), "");
  assert.equal(ids([{ ...base, daysLeft: undefined }]), "");
  // pending, terminated, inactive and finished collabs are quiet
  assert.equal(ids([{ ...base, currentStage: "pending", daysLeft: 9 }]), "");
  assert.equal(ids([{ ...base, status: "terminated", daysLeft: 9 }]), "");
  assert.equal(ids([{ ...base, isActive: false, daysLeft: 9 }]), "");
  assert.equal(ids([{ ...base, currentStage: "closed", daysLeft: 9 }]), "");
  // your-turn nudges
  assert.equal(ids([{ ...base, contractTurn: "creator", changesRequested: 2 }]), "turn,changes");
  assert.equal(ids([{ ...base, contractTurn: "host" }]), "");
  // deterministic identifiers -> re-planning replaces rather than duplicates
  assert.deepEqual(reminders.planReminders({ collabs: [{ ...base, daysLeft: 5 }], now }).map((r) => r.identifier),
                   reminders.planReminders({ collabs: [{ ...base, daysLeft: 5 }], now }).map((r) => r.identifier));
});

import * as threads from "@/utils/threads.js";
import * as pfilters from "@/utils/proposalFilters.js";
import * as chtml from "@/utils/contractHtml.js";

test("thread keys match the apply flow's format", () => {
  assert.equal(threads.threadKeyFor("l1", "c9"), "thread_l1_c9");
  assert.equal(threads.threadKeyFor(undefined, "c9"), null);
  assert.equal(threads.threadKeyFor("l1", null), null);
});

test("proposal search, listing filter and bulk eligibility", () => {
  const list = [
    { id: 1, creatorName: "Maya Chen", handle: "@mayaexplores", listing: "Cedar Cabin", tier: "UGC Pro", note: "loves hiking", stage: "applied" },
    { id: 2, creatorName: "Leo Park", handle: "@leopark", listing: "Lake Villa", tier: "Influencer", note: "", stage: "completed" },
    { id: 3, creatorName: "Ana Ruiz", handle: "@ana", listing: "Cedar Cabin", tier: "UGC Pro", note: "", stage: "declined" },
  ];
  const ids = (o) => pfilters.filterProposals(list, o).map((p) => p.id).join(",");
  assert.equal(ids({}), "1,2,3");
  assert.equal(ids({ query: "MAYA" }), "1");
  assert.equal(ids({ query: "hiking" }), "1");
  assert.equal(ids({ query: "villa" }), "2");
  assert.equal(ids({ listing: "Cedar Cabin" }), "1,3");
  assert.equal(ids({ tier: "UGC Pro", listing: "Cedar Cabin", query: "ana" }), "3");
  assert.equal(ids({ query: "zzz" }), "");
  assert.deepEqual(pfilters.listingOptions(list), ["Cedar Cabin", "Lake Villa"]); // most-used first
  assert.deepEqual(list.map(pfilters.canDecline), [true, false, false]);
});

test("contract HTML escapes user text and shows signature state", () => {
  const html = chtml.generateContractHtml({
    listing: "Cedar <b>Cabin</b>",
    creatorName: 'Maya "M" & Co',
    handle: "@m",
    fields: { nights: "3 nights", extra_terms: "<script>alert(1)</script>" },
    rounds: 2,
    signatures: { hostSignature: "Ann Host", hostSignedAt: "2026-10-01T10:00:00Z" },
    date: new Date("2026-10-12T12:00:00Z"),
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Cedar &lt;b&gt;Cabin&lt;/b&gt;"));
  assert.ok(html.includes("Maya &quot;M&quot; &amp; Co"));
  assert.ok(html.includes("Negotiated over 2 rounds"));
  assert.ok(html.includes("Ann Host"));
  assert.ok(html.includes("Not yet signed")); // creator hasn't signed
  assert.ok(!html.includes("Nights</td><td style=\"padding:10px 14px;border-bottom:1px solid #eee;\"></td>")); // empty fields omitted
});
