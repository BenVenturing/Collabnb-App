// Move to src/utils/widgetSync.js when activating widgets (see README.md).
// Writes the JSON contract Shared.swift decodes, then asks iOS to redraw.
import { Platform } from "react-native";
import { ExtensionStorage } from "@bacons/apple-targets";

const storage = new ExtensionStorage("group.com.collabnb.app");

const STAGES = ["applied", "approved", "signed", "stay", "content", "done"];

const iso = (v) => (v ? new Date(v).toISOString() : undefined);

/**
 * @param {object} data
 * @param {"creator"|"host"} data.role
 * @param {{id,title,location,checkIn,deadline,deliverablesDone,deliverablesTotal}} [data.nextCollab]
 * @param {{applicants,activeCollabs,unread,nextCheckInName,nextCheckInDate}} [data.host]
 * @param {{id,title,partnerName,stage}} [data.tracker] stage: one of STAGES or its index
 */
export function syncWidgets({ role, nextCollab, host, tracker }) {
  if (Platform.OS !== "ios") return;
  const payload = {
    role,
    updatedAt: new Date().toISOString(),
    nextCollab: nextCollab && {
      ...nextCollab,
      id: String(nextCollab.id),
      checkIn: iso(nextCollab.checkIn),
      deadline: iso(nextCollab.deadline),
    },
    host: host && { ...host, nextCheckInDate: iso(host.nextCheckInDate) },
    tracker: tracker && {
      ...tracker,
      id: String(tracker.id),
      stage: typeof tracker.stage === "number" ? tracker.stage : Math.max(0, STAGES.indexOf(tracker.stage)),
    },
  };
  storage.set("widgetData", JSON.stringify(payload));
  ExtensionStorage.reloadWidget();
}

export function clearWidgets() {
  if (Platform.OS !== "ios") return;
  storage.remove("widgetData");
  ExtensionStorage.reloadWidget();
}
