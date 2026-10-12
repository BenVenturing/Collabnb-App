// Stage stepper model for the creator's collaboration detail screen. Stage
// keys and labels mirror the web app's STAGES (see collaborations.jsx); the
// copy under each step tells a creator what is expected of them there.

export const TIMELINE_STAGES = [
  { key: "pending", label: "Application sent", hint: "The host is reviewing your application." },
  { key: "accepted", label: "Accepted", hint: "You're in. Agree the stay dates and terms with the host." },
  { key: "updated", label: "Adjustments", hint: "Terms or dates are being adjusted. Check your messages." },
  { key: "uploaded_tagged", label: "Content uploaded", hint: "Your content is live and tagged. The host will review it." },
  { key: "closed", label: "Completed", hint: "All done. Thanks for collaborating." },
];

// "archived" is a finished collab the creator tucked away; show it as completed.
const normalise = (stage) => (stage === "archived" ? "closed" : stage);

export function buildTimeline(collab) {
  const current = normalise(collab?.currentStage ?? "pending");
  const idx = Math.max(TIMELINE_STAGES.findIndex((s) => s.key === current), 0);
  const terminated = collab?.status === "terminated";
  return TIMELINE_STAGES.map((s, i) => ({
    ...s,
    date: collab?.stageDates?.[s.key] ?? null,
    state: terminated && i === idx ? "stopped" : i < idx ? "done" : i === idx ? (current === "closed" ? "done" : "current") : "upcoming",
  }));
}
