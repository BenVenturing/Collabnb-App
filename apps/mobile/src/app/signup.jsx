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
import { api } from "@/convex/_generated/api";
import useRoleStore from "@/utils/RoleStore";
import { colors, fonts, radii, shadows } from "@/config/theme";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { setRole } = useRoleStore();
  const getOrCreateProfile = useMutation(api.profiles.getOrCreate);

  const [step, setStep] = useState("form"); // "form" | "verify"
  const [selectedRole, setSelectedRole] = useState("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const finalizeSession = async (createdSessionId) => {
    await setActive({ session: createdSessionId });
    const profile = await getOrCreateProfile({
      email: email.trim(),
      full_name: email.trim().split("@")[0],
      role: selectedRole,
    });
    await setRole(profile?.role || selectedRole);
    router.replace(
      (profile?.role || selectedRole) === "host"
        ? "/host-onboarding/property"
        : "/creator-onboarding/basic-info",
    );
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
        await finalizeSession(result.createdSessionId);
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
        await finalizeSession(result.createdSessionId);
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
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style="dark" />
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

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.hairline,
              padding: 24,
              ...shadows.md,
            }}
          >
            {step === "form" ? (
              <>
                <RoleToggle selectedRole={selectedRole} onChange={setSelectedRole} />

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
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  focused={passwordFocused}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  secureTextEntry
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
          </View>

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
          backgroundColor: colors.bone,
          borderWidth: 1,
          borderColor: focused ? colors.slate : colors.stone,
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
