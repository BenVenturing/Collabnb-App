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
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import useRoleStore from "@/utils/RoleStore";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAppleAuth } from "@/hooks/useAppleAuth";
import AppleButton from "@/components/AppleButton";
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

  const [step, setStep] = useState("form"); // "form" | "verify"
  const [selectedRole, setSelectedRole] = useState("creator");
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
      const { createdSessionId, setActive: activateSSO, signUp: ssoSignUp } =
        await signInWithGoogle();
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
      const { createdSessionId, setActive: activateSSO, signUp: ssoSignUp } =
        await signInWithApple();
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
