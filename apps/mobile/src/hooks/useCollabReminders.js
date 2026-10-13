// Schedules local reminders (due dates, "your turn") for the creator's collabs.
// The plan comes from utils/reminders.js; this hook only talks to the OS.
//
// It never prompts for notification permission — usePushNotifications already
// asks once, at sign-in. If permission isn't granted, this quietly does nothing.
// Every run cancels the reminders it owns (identifier prefix) and re-schedules
// the current plan, so changes (a signed contract, an approved deliverable)
// clear stale reminders.

import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { ID_PREFIX, planReminders } from "@/utils/reminders";

export function useCollabReminders(collabs) {
  const plan = useMemo(() => planReminders({ collabs, now: new Date() }), [collabs]);
  // Only re-run when the plan itself changes, not on every render.
  const signature = plan.map((r) => `${r.identifier}@${r.date.getTime()}`).join("|");

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    let cancelled = false;
    (async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== "granted" || cancelled) return;
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          scheduled
            .filter((n) => n.identifier?.startsWith(ID_PREFIX))
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        );
        if (cancelled) return;
        for (const r of plan) {
          await Notifications.scheduleNotificationAsync({
            identifier: r.identifier,
            content: { title: r.title, body: r.body, data: r.data },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
          });
        }
      } catch (err) {
        console.warn("Collab reminders: couldn't schedule.", err);
      }
    })();
    return () => { cancelled = true; };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps
}
