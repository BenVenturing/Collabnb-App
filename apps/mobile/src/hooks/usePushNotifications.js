import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "@/convex/_generated/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Maps a notification's `link` (the same value the web bell dropdown and
// wallet pushes use — see app/convex/notifications.ts) onto a mobile route.
// Only message threads have a direct mobile equivalent today; everything
// else falls back to Inbox rather than 404ing into a screen that isn't
// built yet.
function routeForLink(link) {
  if (!link) return { pathname: "/(tabs)/inbox" };
  const threadMatch = link.match(/thread=([^&]+)/);
  if (threadMatch) {
    return { pathname: "/messages/[threadId]", params: { threadId: decodeURIComponent(threadMatch[1]) } };
  }
  return { pathname: "/(tabs)/inbox" };
}

// Registers this device for native push (see convex/expoPush.ts) once a
// signed-in profile is known, displays notifications while the app is open,
// and routes a tap to the right screen. Call with `null` while signed out —
// the previous device's token is unregistered automatically.
export function usePushNotifications(profile) {
  const router = useRouter();
  const registerToken = useMutation(api.expoPush.registerToken);
  const unregisterToken = useMutation(api.expoPush.unregisterToken);
  const tokenRef = useRef(null);
  const userId = profile?._id ? String(profile._id) : null;

  useEffect(() => {
    if (!userId || !Device.isDevice) return undefined;
    let cancelled = false;

    (async () => {
      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted" || cancelled) return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      // Standalone/dev-client builds (this app isn't run in Expo Go) need an
      // EAS project id to mint a token — absent until `eas init` links one.
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn("Push notifications: no EAS project id configured, skipping token registration.");
        return;
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled || !token) return;
        tokenRef.current = token;
        await registerToken({ userId, token });
      } catch (err) {
        console.warn("Push notifications: failed to get/register push token.", err);
      }
    })();

    return () => {
      cancelled = true;
      if (tokenRef.current) {
        unregisterToken({ userId, token: tokenRef.current }).catch(() => {});
        tokenRef.current = null;
      }
    };
  }, [userId]);

  useEffect(() => {
    // App opened directly from a killed state via a notification tap.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const link = response?.notification?.request?.content?.data?.link;
      if (link) router.push(routeForLink(link));
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link;
      router.push(routeForLink(link));
    });

    return () => {
      Notifications.removeNotificationSubscription(responseSub);
    };
  }, [router]);
}
