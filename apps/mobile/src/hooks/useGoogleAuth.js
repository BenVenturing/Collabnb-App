import { useCallback, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";

// Required once per app so the in-app browser closes itself and resolves
// openAuthSessionAsync's promise when Clerk redirects back via our scheme.
WebBrowser.maybeCompleteAuthSession();

// Pre-warms the Android Chrome Custom Tab so it opens without a visible
// delay — no-op on iOS.
function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => void WebBrowser.coolDownAsync();
  }, []);
}

// This is the same sequence as @clerk/clerk-expo's useSSO, reimplemented for
// one reason: useSSO calls `await signIn.create(...)` and then reads
// `signIn.firstFactorVerification` off the resource captured from the render
// it was called in, rather than off the resource create() returns. On this
// app that read comes back empty and it throws "Missing external verification
// redirect URL for SSO flow" — even though the identical request made
// straight against the Frontend API returns a valid Google authorize URL.
// Reading the returned resource instead avoids the stale reference.
export function useGoogleAuth() {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const signInWithGoogle = useCallback(async () => {
    if (!signInLoaded || !signUpLoaded) {
      return { createdSessionId: null, setActive, signUp };
    }

    // No leading slash: Linking.createURL("/sso-callback") emits an empty host
    // segment (collabnb:///sso-callback, three slashes), which won't match the
    // redirect URL registered with Clerk.
    const redirectUrl = Linking.createURL("sso-callback", { scheme: "collabnb" });

    const created = await signIn.create({ strategy: "oauth_google", redirectUrl });
    const authorizeUrl = created?.firstFactorVerification?.externalVerificationRedirectURL;
    if (!authorizeUrl) {
      throw new Error("Clerk did not return a Google authorization URL.");
    }

    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), redirectUrl);
    if (result.type !== "success" || !result.url) {
      // User dismissed the browser — not an error worth surfacing.
      return { createdSessionId: null, setActive, signUp };
    }

    const nonce = new URL(result.url).searchParams.get("rotating_token_nonce") ?? "";
    const reloaded = await signIn.reload({ rotatingTokenNonce: nonce });

    // A Google account with no existing Clerk user comes back "transferable" —
    // hand it to signUp to create the account rather than failing the sign-in.
    if (reloaded?.firstFactorVerification?.status === "transferable") {
      const transferred = await signUp.create({ transfer: true });
      return { createdSessionId: transferred?.createdSessionId ?? null, setActive, signUp: transferred };
    }

    return { createdSessionId: reloaded?.createdSessionId ?? null, setActive, signUp };
  }, [signIn, signUp, setActive, signInLoaded, signUpLoaded]);

  return { signInWithGoogle };
}

export default useGoogleAuth;
