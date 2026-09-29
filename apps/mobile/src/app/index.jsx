import { Redirect } from "expo-router";
import { useEffect } from "react";
import useRoleStore from "@/utils/RoleStore";
import { LoadingScreen } from "@/components/ui";

export default function Index() {
  const { role, isRoleReady, loadRole } = useRoleStore();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Wait for role to load before routing (prevents flicker). Render the
  // branded screen rather than null — this gate sits directly after Clerk's,
  // and two nulls in a row is what made a cold launch look like a white crash.
  if (!isRoleReady) {
    return <LoadingScreen />;
  }

  // Role-based routing
  if (role === "host") {
    return <Redirect href="/host/(tabs)/dashboard" />;
  }

  // Default to creator tabs (for creators or users without role set)
  return <Redirect href="/(tabs)" />;
}
