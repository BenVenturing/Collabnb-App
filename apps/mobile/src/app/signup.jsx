import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import useRoleStore from "@/utils/RoleStore";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import AppleButton from "@/components/AppleButton";
import { Ionicons } from "@expo/vector-icons";
import { AtmosphericBackground } from "@/components/ui";
import Glass from "@/components/Glass";
import CodeBoxes from "@/components/CodeBoxes";

// Clerk requires a username on this instance; the form only asks for email.
function makeUsername(email, withSuffix = false) {
  const base = (email.trim().split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 60);
  const name = base.length >= 4 ? base : `${base}user`;
  return withSuffix ? `${name}_${Math.floor(1000 + Math.random() * 9000)}` : name;
}
const isUsernameTaken = (err) =>
  err?.errors?.some((e) => e.code === "form_identifier_exists" && e.meta?.paramName === "username");
import { colors, fonts, radii } from "@/config/theme";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { setRole } = useRoleStore();
  const { signInWithGoogle } = useGoogleAuth();
  const { signInWithApple } = useAppleAuth();
  const getOrCreateProfile = useMutation(api.profiles.getOrCreate);
  const params = useLocalSearchParams();
  const fromWelcome = params.welcome === "1";
  const [emailMode, setEmailMode] = useState(!fromWelcome);

  const [step, setStep] = useState("form"); // "form" | "verify"
  const [selectedRole, setSelectedRole] = useState(params.role === "host" ? "host" : "creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("idle");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const finalizeSession = async (createdSessionId, finalEmail, activate = setActive, fullName, waitFor) => {
    await activate({ session: createdSessionId });
    // Convex receives the new Clerk token a beat after setActive resolves,
    // so the first call can fail with "Sign in required."
    let profile;
    for (let i = 0; ; i++) {
      try {
        profile = await getOrCreateProfile({
          email: finalEmail.trim(),
          full_name: fullName || finalEmail.trim().split("@")[0],
          role: selectedRole,
        });
        break;
      } catch (err) {
        if (i >= 9 || !String(err?.message || err).includes("Sign in required")) throw err;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    await setRole(profile?.role || selectedRole);
    if (waitFor) await waitFor;
    router.replace(
      (profile?.role || selectedRole) === "host"
        ? "/host-onboarding/property"
        : "/creator-onboarding/basic-info",
    );
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: activateSSO, signUp: ssoSignUp, isNewUser } =
        await signInWithGoogle();
      // An existing Google account signs straight in; only new accounts carry
      // an email on the transferred signUp and need a profile created.
      if (createdSessionId && activateSSO && !isNewUser) {
        await activateSSO({ session: createdSessionId });
        router.replace("/explore");
        return;
      }
      if (createdSessionId && activateSSO) {
        const googleEmail = ssoSignUp?.emailAddress;
        if (!googleEmail) {
          setError("Couldn't read your Google email. Please try again.");
          return;
        }
        await finalizeSession(createdSessionId, googleEmail, activateSSO);
      }
    } catch (err) {
      console.error("[GoogleAuth] sign-up failed:", err?.message, JSON.stringify(err?.errors || err));
      setError(err?.errors?.[0]?.message || err?.message || "Google sign-up failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setError("");
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: activateSSO, signUp: ssoSignUp, isNewUser } =
        await signInWithApple();
      // An existing Apple account signs straight in; only new accounts carry
      // an email on the transferred signUp and need a profile created.
      if (createdSessionId && activateSSO && !isNewUser) {
        await activateSSO({ session: createdSessionId });
        router.replace("/explore");
        return;
      }
      if (createdSessionId && activateSSO) {
        const appleEmail = ssoSignUp?.emailAddress;
        if (!appleEmail) {
          setError("Couldn't read your Apple email. Please try again.");
          return;
        }
        const appleName = [ssoSignUp?.firstName, ssoSignUp?.lastName].filter(Boolean).join(" ");
        await finalizeSession(createdSessionId, appleEmail, activateSSO, appleName);
      }
    } catch (err) {
      console.error("[AppleAuth] sign-up failed:", err?.message, JSON.stringify(err?.errors || err));
      setError(err?.errors?.[0]?.message || err?.message || "Apple sign-up failed. Please try again.");
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    if (!privacyConsent) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const fields = {
        emailAddress: email.trim(),
        password,
        username: makeUsername(email),
        legalAccepted: privacyConsent,
        unsafeMetadata: { role: selectedRole },
      };
      let result;
      try {
        result = await signUp.create(fields);
      } catch (err) {
        if (!isUsernameTaken(err)) throw err;
        result = await signUp.create({ ...fields, username: makeUsername(email, true) });
      }

      if (result.status === "complete") {
        await finalizeSession(result.createdSessionId, email);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onCodeChange = (next) => {
    setCode(next);
    if (verifyStatus === "error") setVerifyStatus("idle");
    if (next.length === 6) handleVerify(next);
  };

  const handleVerify = async (code) => {
    if (!isLoaded || !code.trim() || loading) return;
    setError("");
    setLoading(true);
    setVerifyStatus("verifying");
    // A retry after a half-finished attempt returns "already verified", so
    // fall back to the sign-up's current state instead of a dead end.
    const finishOrExplain = async (attempt) => {
      // Sign-ups started before the username was sent at create() stall on it.
      if (attempt?.status === "missing_requirements" && attempt.missingFields?.includes("username")) {
        attempt = await signUp.update({ username: makeUsername(email) });
      }
      if (attempt?.status === "complete" && attempt.createdSessionId) {
        setVerifyStatus("success");
        // Profile setup runs during the check-mark animation; navigation waits for it.
        const animation = new Promise((r) => setTimeout(r, 1500));
        try {
          await finalizeSession(attempt.createdSessionId, email, setActive, undefined, animation);
        } catch (err) {
          console.warn("[SignUp] verified but finalize failed:", err?.message);
          setError("You're verified. Sign in to finish setting up.");
          router.replace("/signin");
        }
        return;
      }
      setVerifyStatus("error");
      const missing = attempt?.missingFields ?? [];
      console.warn("[SignUp] not complete:", attempt?.status, missing, attempt?.unverifiedFields);
      if (missing.length > 0) {
        setError(`Your email is verified, but sign-up still needs: ${missing.join(", ")}. Please contact support.`);
      } else {
        setError("That code didn't work. Please try again.");
      }
    };
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });
      await finishOrExplain(result);
    } catch (err) {
      const errCode = err?.errors?.[0]?.code;
      if (errCode === "verification_already_verified" || errCode === "form_identifier_exists") {
        try {
          await finishOrExplain(signUp);
          return;
        } catch {}
      }
      console.warn("[SignUp] verify failed:", errCode, JSON.stringify(err?.errors || err?.message));
      setVerifyStatus("error");
      setCode("");
      setError(err?.errors?.[0]?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fromWelcome && !emailMode && step === "form") {
    return (
      <SaveAccount
        role={selectedRole}
        insets={insets}
        error={error}
        appleLoading={appleLoading}
        googleLoading={googleLoading}
        onApple={handleAppleSignUp}
        onGoogle={handleGoogleSignUp}
        onEmail={() => setEmailMode(true)}
        onBack={() => router.back()}
        onTerms={() => Linking.openURL("https://collabnb.com/terms.html")}
        onPrivacy={() => router.push("/privacy-policy")}
      />
    );
  }

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle()} />
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={8}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.6)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowLeft color={colors.ink} size={20} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {step === "verify" ? (
            <>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink, textAlign: "center", marginBottom: 4 }}>
                Check your email
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, textAlign: "center", marginBottom: 28 }}>
                We sent a code to {email.trim()}
              </Text>
              <CodeBoxes value={code} onChange={onCodeChange} status={verifyStatus} />
              {error ? <View style={{ marginTop: 16 }}><ErrorText>{error}</ErrorText></View> : null}
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 28 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => router.push("/signin")}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.slate }}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
          <>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Create your account
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.sage,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            Join Collabnb as a creator or a host
          </Text>

          <Glass variant="card" contentStyle={{ padding: 24 }}>
            {(
              <>
                <RoleToggle selectedRole={selectedRole} onChange={setSelectedRole} />

                {Platform.OS === "ios" && (
                  <AppleButton onPress={handleAppleSignUp} loading={appleLoading} />
                )}

                <TouchableOpacity
                  onPress={handleGoogleSignUp}
                  disabled={googleLoading}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.6)",
                    borderWidth: 1,
                    borderColor: colors.hairline,
                    borderRadius: radii.md,
                    paddingVertical: 14,
                    marginBottom: 20,
                    opacity: googleLoading ? 0.7 : 1,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>
                    {googleLoading ? "Opening Google…" : "Continue with Google"}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 12,
                      color: colors.sage,
                      marginHorizontal: 12,
                    }}
                  >
                    or
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
                </View>

                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  focused={emailFocused}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="your@email.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <PasswordField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  focused={passwordFocused}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  visible={showPassword}
                  onToggleVisible={() => setShowPassword((v) => !v)}
                />

                <TouchableOpacity
                  onPress={() => setPrivacyConsent(!privacyConsent)}
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      marginRight: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: privacyConsent ? colors.slate : colors.bone,
                      borderWidth: 1,
                      borderColor: privacyConsent ? colors.slate : colors.stone,
                    }}
                  >
                    {privacyConsent ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          backgroundColor: colors.surface,
                        }}
                      />
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, flex: 1 }}>
                    I agree to the{" "}
                    <Text
                      style={{ fontFamily: fonts.bodySemibold, color: colors.slate }}
                      onPress={() => Linking.openURL("https://collabnb.com/terms.html")}
                    >
                      Terms of Service
                    </Text>
                    {" "}and{" "}
                    <Text
                      style={{ fontFamily: fonts.bodySemibold, color: colors.slate }}
                      onPress={() => router.push("/privacy-policy")}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>

                {error ? <ErrorText>{error}</ErrorText> : null}

                <PrimaryButton
                  onPress={handleSignUp}
                  disabled={loading || !isLoaded}
                  label={loading ? "Creating account…" : "Sign Up"}
                />
              </>
            )}
          </Glass>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/signin")}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate }}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AtmosphericBackground>
  );
}

function SaveAccount({ role, insets, error, appleLoading, googleLoading, onApple, onGoogle, onEmail, onBack, onTerms, onPrivacy }) {
  const pill = { borderRadius: 999, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bone, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }}>
      <StatusBar style="dark" />
      <TouchableOpacity onPress={onBack} hitSlop={10} style={{ marginLeft: 20, marginTop: 8, width: 40, height: 40, justifyContent: "center" }}>
        <ArrowLeft color={colors.ink} size={22} />
      </TouchableOpacity>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View entering={FadeInDown.springify().damping(14)}>
          <View
            style={{
              width: 210,
              height: 250,
              borderRadius: 30,
              backgroundColor: "#E4DED3",
              overflow: "hidden",
              transform: [{ rotate: "-4deg" }],
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Image
                source={role === "host" ? require("../../assets/images/empty-collabs.png") : require("../../assets/images/empty-explore.png")}
                style={{ width: 150, height: 150 }}
                contentFit="contain"
              />
            </View>
            <View style={{ backgroundColor: colors.slate, paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.bone }}>You</Text>
            </View>
          </View>
          <Animated.View
            entering={ZoomIn.delay(450).springify().damping(10)}
            style={{
              position: "absolute",
              right: -34,
              bottom: 26,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.surface,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 10,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink }}>Day 1 of 30</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(200)} style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 36, color: colors.ink, textAlign: "center", letterSpacing: -0.9 }}>
          Save your account
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.sage, textAlign: "center", marginTop: 8, marginBottom: 32 }}>
          {role === "host" ? "So creators can find your stay." : "So your free month follows you to any phone."}
        </Text>

        {error ? <ErrorText>{error}</ErrorText> : null}

        {Platform.OS === "ios" ? (
          <TouchableOpacity onPress={onApple} disabled={appleLoading} activeOpacity={0.85} style={[pill, { backgroundColor: "#1C1B1A", marginBottom: 12, opacity: appleLoading ? 0.7 : 1 }]}>
            <Ionicons name="logo-apple" size={20} color="#fff" style={{ marginTop: -2 }} />
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 17, color: "#fff" }}>{appleLoading ? "Opening Apple…" : "Continue with Apple"}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onGoogle} disabled={googleLoading} activeOpacity={0.85} style={[pill, { backgroundColor: colors.surface, opacity: googleLoading ? 0.7 : 1 }]}>
          <Ionicons name="logo-google" size={18} color="#4285F4" />
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.ink }}>{googleLoading ? "Opening Google…" : "Continue with Google"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEmail} hitSlop={8} style={{ paddingVertical: 18 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.ink, textAlign: "center" }}>Continue with email</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, textAlign: "center" }}>
          By continuing you agree to our{" "}
          <Text onPress={onTerms} style={{ fontFamily: fonts.bodySemibold, color: colors.slate }}>Terms</Text>
          {" & "}
          <Text onPress={onPrivacy} style={{ fontFamily: fonts.bodySemibold, color: colors.slate }}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

function RoleToggle({ selectedRole, onChange }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.bone,
          borderRadius: radii.lg,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.stone,
        }}
      >
        {["creator", "host"].map((role) => {
          const active = selectedRole === role;
          return (
            <TouchableOpacity
              key={role}
              onPress={() => onChange(role)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderRadius: radii.md,
                backgroundColor: active ? colors.mint : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 15,
                  color: colors.ink,
                }}
              >
                {role === "creator" ? "Creator" : "Host"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.sage,
          textAlign: "center",
          marginTop: 12,
          lineHeight: 18,
        }}
      >
        {selectedRole === "creator"
          ? "Build your portfolio and collaborate on stays."
          : "Post opportunities and work with creators."}
      </Text>
    </View>
  );
}

function ErrorText({ children }) {
  return (
    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#B3261E", marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function PrimaryButton({ onPress, disabled, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: colors.ink,
        paddingVertical: 16,
        borderRadius: radii.md,
        alignItems: "center",
        marginTop: 4,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Field({ label, focused, containerStyle, ...inputProps }) {
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: colors.ink,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.sage}
        style={{
          backgroundColor: "rgba(255,255,255,0.6)",
          borderWidth: 1,
          borderColor: focused ? colors.slate : colors.hairline,
          borderRadius: radii.md,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontFamily: fonts.body,
          fontSize: 16,
          color: colors.ink,
        }}
        {...inputProps}
      />
    </View>
  );
}

function PasswordField({ label, value, onChangeText, focused, onFocus, onBlur, visible, onToggleVisible, containerStyle }) {
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginBottom: 8 }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.6)",
          borderWidth: 1,
          borderColor: focused ? colors.slate : colors.hairline,
          borderRadius: radii.md,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="••••••••"
          placeholderTextColor={colors.sage}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, paddingVertical: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink }}
        />
        <TouchableOpacity onPress={onToggleVisible} hitSlop={8}>
          {visible ? <EyeOff color={colors.sage} size={19} /> : <Eye color={colors.sage} size={19} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
