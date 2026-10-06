import { useCallback, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSSO } from "@clerk/clerk-expo";

// Required once per app so the in-app browser closes itself and resolves
// startSSOFlow's promise when Clerk redirects back via our URL scheme.
WebBrowser.maybeCompleteAuthSession();

// Pre-warms the Android Chrome Custom Tab so it opens without a visible
// delay — no-op on iOS. See Clerk's Expo OAuth guide.
function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => void WebBrowser.coolDownAsync();
  }, []);
}

export function useGoogleAuth() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();

  const signInWithGoogle = useCallback(async () => {
    const { createdSessionId, setActive, signUp } = await startSSOFlow({
      strategy: "oauth_google",
      redirectUrl: Linking.createURL("/sso-callback"),
    });
    return { createdSessionId, setActive, signUp };
  }, [startSSOFlow]);

  return { signInWithGoogle };
}

export default useGoogleAuth;
