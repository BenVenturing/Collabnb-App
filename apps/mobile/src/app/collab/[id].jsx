// Deep-link alias for the creator collab screen. Local reminders
// (utils/reminders.js) and push notifications (hooks/usePushNotifications.js)
// both route to /collab/<id>, so that shape has to keep resolving. The screen
// itself is /collab-detail — this branch's own overview screen was folded into
// it during the glass-inbox-collabs merge rather than kept as a second page.

import { Redirect, useLocalSearchParams } from "expo-router";

export default function CollabDeepLink() {
  const { id } = useLocalSearchParams();
  return <Redirect href={{ pathname: "/collab-detail", params: { id: String(id) } }} />;
}
