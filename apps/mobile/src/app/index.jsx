import { Redirect, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import useRoleStore from "@/utils/RoleStore";
import { LoadingScreen } from "@/components/ui";

export default function Index() {
  const { role, isRoleReady, loadRole } = useRoleStore();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Wait for role to load before routing (prevents flicker). Render the
  // branded screen rather than null — this gate sits directly after Clerk's,
  // and two nulls in a row is what made a cold launch look like a white crash.
  //
  // Also wait for the router's own navigation state to be ready. Without
  // this, a cold launch via deep link (e.g. a push notification into
  // /listing-detail) could have this redirect fire before the router
  // finishes resolving the linked URL, replacing the stack and stranding
  // the user on the default tab instead of the link target.
  if (!isRoleReady || !rootNavigationState?.key) {
    return <LoadingScreen />;
  }

  // Role-based routing
  if (role === "host") {
    return <Redirect href="/host/(tabs)/dashboard" />;
  }

  // Default to creator tabs (for creators or users without role set)
  return <Redirect href="/explore" />;
}
