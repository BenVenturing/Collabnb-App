import { Redirect, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useRoleStore from "@/utils/RoleStore";
import { LoadingScreen } from "@/components/ui";

export default function Index() {
  const { role, isRoleReady, loadRole } = useRoleStore();
  const rootNavigationState = useRootNavigationState();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [welcomeSeen, setWelcomeSeen] = useState(null);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  useEffect(() => {
    AsyncStorage.getItem("@collabnb:welcome_seen")
      .then((v) => setWelcomeSeen(v === "1"))
      .catch(() => setWelcomeSeen(true));
  }, []);

  // Wait for role to load before routing (prevents flicker). Render the
  // branded screen rather than null — this gate sits directly after Clerk's,
  // and two nulls in a row is what made a cold launch look like a white crash.
  //
  // Also wait for the router's own navigation state to be ready. Without
  // this, a cold launch via deep link (e.g. a push notification into
  // /listing-detail) could have this redirect fire before the router
  // finishes resolving the linked URL, replacing the stack and stranding
  // the user on the default tab instead of the link target.
  if (!isRoleReady || !rootNavigationState?.key || !authLoaded || welcomeSeen === null) {
    return <LoadingScreen />;
  }

  if (!isSignedIn && !welcomeSeen) {
    return <Redirect href="/welcome" />;
  }

  // Role-based routing
  if (role === "host") {
    return <Redirect href="/host/(tabs)/dashboard" />;
  }

  // Default to creator tabs (for creators or users without role set)
  return <Redirect href="/explore" />;
}
