import { LoadingScreen } from "@/components/ui";

// expo-router briefly lands here when Clerk's redirectUrl fires, while
// useGoogleAuth's startSSOFlow promise resolves in the calling screen and
// takes over navigation — this never does anything on its own.
export default function SsoCallbackScreen() {
  return <LoadingScreen />;
}
