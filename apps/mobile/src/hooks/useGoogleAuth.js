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
    // Explicit scheme forces a stable collabnb://sso-callback URL. Without
    // it, a dev client wraps the path in its own dynamic
    // exp+collabnb-app://expo-development-client/?url=... form (embedding
    // the current Metro host/port), which can't be whitelisted in Clerk's
    // dashboard — causing signIn.create() to come back with no
    // externalVerificationRedirectURL at all ("Missing external
    // verification redirect URL for SSO flow").
    // No leading slash on the path — Linking.createURL("/sso-callback", ...)
    // produces collabnb:///sso-callback (empty host + /-prefixed path, three
    // slashes); Clerk's own AuthSession.makeRedirectUri doc example confirms
    // the path arg should be unprefixed to get the correct collabnb://sso-callback.
    const redirectUrl = Linking.createURL("sso-callback", { scheme: "collabnb" });
    console.log("[GoogleAuth] redirectUrl:", redirectUrl);
    const { createdSessionId, setActive, signUp } = await startSSOFlow({
      strategy: "oauth_google",
      redirectUrl,
    });
    return { createdSessionId, setActive, signUp };
  }, [startSSOFlow]);

  return { signInWithGoogle };
}

export default useGoogleAuth;
