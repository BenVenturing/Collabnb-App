import { ClerkProvider, ClerkLoaded, useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemedBackground from "@/components/ThemedBackground";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import clerkTokenCache from "@/config/clerkTokenCache";
import convexClient from "@/config/convexClient";
import { useAuthStore } from "@/utils/auth/store";

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
// yet migrated off it (e.g. src/services/webMessaging.js) keep working.
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
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
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
            <AppShell />
          </ConvexProviderWithClerk>
        ) : (
          <AppShell />
        )}
      </ClerkLoaded>
    </ClerkProvider>
  );
}
