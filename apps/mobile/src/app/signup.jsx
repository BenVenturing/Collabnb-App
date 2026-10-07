import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import useRoleStore from "@/utils/RoleStore";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { AtmosphericBackground } from "@/components/ui";
import Glass from "@/components/Glass";
import { colors, fonts, radii } from "@/config/theme";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { setRole } = useRoleStore();
  const { signInWithGoogle } = useGoogleAuth();
  const getOrCreateProfile = useMutation(api.profiles.getOrCreate);

  const [step, setStep] = useState("form"); // "form" | "verify"
  const [selectedRole, setSelectedRole] = useState("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const finalizeSession = async (createdSessionId, finalEmail, activate = setActive) => {
    await activate({ session: createdSessionId });
    const profile = await getOrCreateProfile({
      email: finalEmail.trim(),
      full_name: finalEmail.trim().split("@")[0],
      role: selectedRole,
    });
    await setRole(profile?.role || selectedRole);
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

  const handleSignUp = async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    if (!privacyConsent) {
      setError("Please agree to the Privacy Policy to continue.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: { role: selectedRole },
      });

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

  const handleVerify = async () => {
    if (!isLoaded || !code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });
      if (result.status === "complete") {
        await finalizeSession(result.createdSessionId, email);
      } else {
        setError("That code didn't work. Please try again.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />
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
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {step === "form" ? "Create your account" : "Check your email"}
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
            {step === "form"
              ? "Join Collabnb as a creator or a host"
              : `We sent a code to ${email.trim()}`}
          </Text>

          <Glass variant="card" contentStyle={{ padding: 24 }}>
            {step === "form" ? (
              <>
                <RoleToggle selectedRole={selectedRole} onChange={setSelectedRole} />

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
            ) : (
              <>
                <Field
                  label="Verification code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoFocus
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <PrimaryButton
                  onPress={handleVerify}
                  disabled={loading || !isLoaded}
                  label={loading ? "Verifying…" : "Verify"}
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
