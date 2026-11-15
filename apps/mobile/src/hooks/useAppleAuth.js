import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";

WebBrowser.maybeCompleteAuthSession();

// Same flow as useGoogleAuth (reads the resource create() returns, not the
// stale hook reference) with oauth_apple.
export function useAppleAuth() {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const signInWithApple = useCallback(async () => {
    if (!signInLoaded || !signUpLoaded) {
      return { createdSessionId: null, setActive, signUp };
    }

    const redirectUrl = Linking.createURL("sso-callback", { scheme: "collabnb" });

    const created = await signIn.create({ strategy: "oauth_apple", redirectUrl });
    const authorizeUrl = created?.firstFactorVerification?.externalVerificationRedirectURL;
    if (!authorizeUrl) {
      throw new Error("Clerk did not return an Apple authorization URL.");
    }

    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), redirectUrl);
    if (result.type !== "success" || !result.url) {
      return { createdSessionId: null, setActive, signUp };
    }

    const nonce = new URL(result.url).searchParams.get("rotating_token_nonce") ?? "";
    const reloaded = await signIn.reload({ rotatingTokenNonce: nonce });

    if (reloaded?.firstFactorVerification?.status === "transferable") {
      const transferred = await signUp.create({ transfer: true });
      return { createdSessionId: transferred?.createdSessionId ?? null, setActive, signUp: transferred, isNewUser: true };
    }

    return { createdSessionId: reloaded?.createdSessionId ?? null, setActive, signUp };
  }, [signIn, signUp, setActive, signInLoaded, signUpLoaded]);

  return { signInWithApple };
}

export default useAppleAuth;
