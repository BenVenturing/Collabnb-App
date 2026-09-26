import { ClerkProvider, ClerkLoaded, useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemedBackground from "@/components/ThemedBackground";
import { useFonts } from "expo-font";
import clerkTokenCache from "@/config/clerkTokenCache";
import convexClient from "@/config/convexClient";
import { useAuthStore } from "@/utils/auth/store";
import { api } from "@/convex/_generated/api";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Mirrors the signed-in Clerk user into the legacy auth store so screens not
// yet migrated off it (host/(tabs)/creators.jsx's mock-creator messaging,
// via src/services/webMessaging.js) keep working.
function AuthStoreBridge() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const auth =
      isSignedIn && user
        ? {
            user: {
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName,
            },
          }
        : null;
    useAuthStore.setState({ auth, isReady: true });
  }, [isSignedIn, user]);

  return null;
}

// Registers this device for push once the signed-in Clerk user resolves to a
// Convex profile, and routes notification taps — see usePushNotifications.
function PushNotificationsBridge() {
  const { isSignedIn, user } = useUser();
  const email = isSignedIn ? user?.primaryEmailAddress?.emailAddress : null;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  usePushNotifications(isSignedIn ? profile : null);
  return null;
}

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedBackground style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
            <Stack.Screen name="index" />
          </Stack>
        </ThemedBackground>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  // The real brand faces, matching the weights index.css loads from Fontshare.
  // Cabinet Grotesk is display, Satoshi is body — see src/config/theme.js.
  const [fontsLoaded, fontError] = useFonts({
    "CabinetGrotesk-Regular": require("../../assets/fonts/CabinetGrotesk-Regular.ttf"),
    "CabinetGrotesk-Medium": require("../../assets/fonts/CabinetGrotesk-Medium.ttf"),
    "CabinetGrotesk-Bold": require("../../assets/fonts/CabinetGrotesk-Bold.ttf"),
    "CabinetGrotesk-Extrabold": require("../../assets/fonts/CabinetGrotesk-Extrabold.ttf"),
    "Satoshi-Regular": require("../../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={clerkTokenCache}>
      <ClerkLoaded>
        <AuthStoreBridge />
        {convexClient ? (
          <ConvexProviderWithClerk client={convexClient} useAuth={useClerkAuth}>
            <PushNotificationsBridge />
            <AppShell />
          </ConvexProviderWithClerk>
        ) : (
          <AppShell />
        )}
      </ClerkLoaded>
    </ClerkProvider>
  );
}
