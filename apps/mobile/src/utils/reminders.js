// Plans the local reminders for a creator's collaborations. Pure: given the
// collabs and "now" it returns what should be scheduled, so scheduling is
// idempotent (the caller cancels everything it owns and re-schedules this list;
// identifiers are deterministic) and the rules are testable.
//
// Rules:
//  * Due-date: at 10:00 local on each of `dueDays` days before (default 3, 1
//    and the day itself — the creator picks these in Settings > Notifications).
//    Only for active, non-terminated collabs that are past "pending".
//  * Your turn: if the contract is waiting on the creator, or the host asked
//    for changes on a deliverable, nudge once, 24h from now.

const DAY = 86400000;
export const ID_PREFIX = "collab:";

const at10 = (base, plusDays) => {
  const d = new Date(base.getTime() + plusDays * DAY);
  d.setHours(10, 0, 0, 0);
  return d;
};

const whenLabel = (before) =>
  before === 0 ? "today" : before === 1 ? "tomorrow" : before === 7 ? "in a week" : `in ${before} days`;

export function planReminders({ collabs = [], now = new Date(), dueDays = [3, 1, 0] }) {
  const out = [];
  for (const c of collabs) {
    if (!c || !c.isActive || c.status === "terminated") continue;
    if (!c.currentStage || c.currentStage === "pending" || c.currentStage === "closed" || c.currentStage === "archived") continue;
    const name = c.propertyName || "your collaboration";
    const data = { collabId: c.id, route: `/collab/${c.id}` };

    const days = Number(c.daysLeft);
    if (Number.isFinite(days) && days > 0) {
      for (const before of dueDays) {
        const when = whenLabel(before);
        if (days < before) continue;
        const date = at10(now, days - before);
        if (date.getTime() <= now.getTime() + 60000) continue;
        out.push({
          identifier: `${ID_PREFIX}${c.id}:due-${before}`,
          title: before === 0 ? "Content due today" : "Content due soon",
          body: `${name}: deliverables are due ${when}.`,
          date,
          data,
        });
      }
    }

    if (c.contractTurn === "creator") {
      out.push({
        identifier: `${ID_PREFIX}${c.id}:turn`,
        title: "Your turn on the contract",
        body: `The host sent terms for ${name}. Review, counter or sign.`,
        date: new Date(now.getTime() + DAY),
        data,
      });
    }
    if (c.changesRequested > 0) {
      out.push({
        identifier: `${ID_PREFIX}${c.id}:changes`,
        title: "Changes requested",
        body: `${name}: the host asked for changes to ${c.changesRequested === 1 ? "a deliverable" : `${c.changesRequested} deliverables`}.`,
        date: new Date(now.getTime() + DAY),
        data,
      });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}
