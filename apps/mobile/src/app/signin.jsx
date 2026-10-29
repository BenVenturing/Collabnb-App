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
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { AtmosphericBackground } from "@/components/ui";
import Glass from "@/components/Glass";
import { colors, fonts, radii } from "@/config/theme";

export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signInWithGoogle } = useGoogleAuth();

  // "signin" | "forgot" | "reset" — forgot/reset use Clerk's own
  // reset_password_email_code strategy via the same signIn resource, not a
  // separate auth system.
  const [mode, setMode] = useState("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [secondFactor, setSecondFactor] = useState(null);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: activateSSO } = await signInWithGoogle();
      if (createdSessionId && activateSSO) {
        await activateSSO({ session: createdSessionId });
        router.replace("/explore");
      }
    } catch (err) {
      console.error("[GoogleAuth] sign-in failed:", err?.message, JSON.stringify(err?.errors || err));
      setError(err?.errors?.[0]?.message || err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const SIGN_IN_STATUS_MESSAGES = {
    needs_first_factor:
      "This account has no password set. Use Continue with Google, or tap Forgot password to create one.",
    needs_second_factor:
      "Two-factor authentication is on for this account. Use Continue with Google to sign in.",
    needs_identifier: "Enter the email address for your account.",
    needs_new_password: "Your password must be reset. Tap Forgot password to continue.",
  };

  const handleSignIn = async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/explore");
      } else if (result.status === "needs_second_factor") {
        await startSecondFactor(result);
      } else {
        // Clerk returns a non-complete status rather than throwing when the
        // password alone can't finish sign-in. Naming the case matters:
        // needs_first_factor on a password attempt means the account has no
        // password (Google-created), which "additional verification" hid.
        setError(SIGN_IN_STATUS_MESSAGES[result.status] ?? `Sign-in needs another step (${result.status}).`);
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // phone_code has to be requested before it can be attempted; totp and
  // backup_code are already in the user's possession, so they go straight to
  // the code screen.
  const startSecondFactor = async (result) => {
    const supported = result.supportedSecondFactors ?? [];
    const pick =
      supported.find((f) => f.strategy === "totp") ??
      supported.find((f) => f.primary) ??
      supported[0];

    if (!pick) {
      setError("This account needs a second factor, but none is available on this device.");
      return;
    }

    // Anything Clerk delivers (SMS, email) has to be requested first or the
    // attempt fails with verification_not_sent. Only totp and backup_code,
    // which the user already holds, skip this.
    if (pick.strategy === "phone_code") {
      await signIn.prepareSecondFactor({
        strategy: "phone_code",
        phoneNumberId: pick.phoneNumberId,
      });
    } else if (pick.strategy === "email_code") {
      await signIn.prepareSecondFactor({
        strategy: "email_code",
        emailAddressId: pick.emailAddressId,
      });
    }

    setSecondFactor(pick);
    setTwoFactorCode("");
    setError("");
    setMode("2fa");
  };

  const handleVerifySecondFactor = async () => {
    if (!isLoaded || !twoFactorCode.trim() || !secondFactor) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: secondFactor.strategy,
        code: twoFactorCode.trim(),
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/explore");
      } else {
        setError(`Couldn't finish sign-in (${result.status}).`);
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "That code didn't work. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async () => {
    if (!isLoaded || !email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setMode("reset");
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Couldn't send a reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded || !resetCode.trim() || !newPassword.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/explore");
      } else {
        setError("That code didn't work. Please try again.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Couldn't reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "forgot"
      ? "Reset your password"
      : mode === "reset"
        ? "Check your email"
        : mode === "2fa"
          ? "Two-factor authentication"
          : "Welcome back";
  const subheading =
    mode === "forgot"
      ? "We'll email you a code to reset it"
      : mode === "reset"
        ? `We sent a code to ${email.trim()}`
        : mode === "2fa"
          ? secondFactor?.strategy === "phone_code"
            ? `We texted a code to ${secondFactor.safeIdentifier ?? "your phone"}`
            : secondFactor?.strategy === "email_code"
              ? `We emailed a code to ${secondFactor.safeIdentifier ?? email.trim()}`
              : secondFactor?.strategy === "backup_code"
                ? "Enter one of your backup codes"
                : "Enter the code from your authenticator app"
          : "Sign in to continue your collaborations";

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, textAlign: "center", marginBottom: 8 }}>
            {heading}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, textAlign: "center", marginBottom: 32 }}>
            {subheading}
          </Text>

          <Glass variant="card" contentStyle={{ padding: 24 }}>
            {mode === "signin" && (
              <>
                <TouchableOpacity
                  onPress={handleGoogleSignIn}
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
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginHorizontal: 12 }}>or</Text>
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
                  containerStyle={{ marginBottom: 4 }}
                />

                <TouchableOpacity onPress={() => { setMode("forgot"); setError(""); }} style={{ alignSelf: "flex-end", marginBottom: 12 }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate }}>Forgot password?</Text>
                </TouchableOpacity>

                {error ? <ErrorText>{error}</ErrorText> : null}

                <PrimaryButton label={loading ? "Signing in…" : "Sign In"} onPress={handleSignIn} disabled={loading || !isLoaded} />
              </>
            )}

            {mode === "forgot" && (
              <>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoFocus
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <PrimaryButton label={loading ? "Sending…" : "Send reset code"} onPress={handleSendResetCode} disabled={loading || !isLoaded} />
                <TouchableOpacity onPress={() => { setMode("signin"); setError(""); }} style={{ alignItems: "center", marginTop: 16 }}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.slate }}>Back to sign in</Text>
                </TouchableOpacity>
              </>
            )}

            {mode === "2fa" && (
              <>
                <Field
                  label={secondFactor?.strategy === "backup_code" ? "Backup code" : "Verification code"}
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  placeholder={secondFactor?.strategy === "backup_code" ? "xxxxxxxx" : "123456"}
                  keyboardType={secondFactor?.strategy === "backup_code" ? "default" : "number-pad"}
                  autoFocus
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <PrimaryButton
                  label={loading ? "Verifying…" : "Verify"}
                  onPress={handleVerifySecondFactor}
                  disabled={loading || !isLoaded}
                />
                <TouchableOpacity
                  onPress={() => { setMode("signin"); setError(""); setTwoFactorCode(""); }}
                  style={{ alignItems: "center", marginTop: 16 }}
                >
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate }}>
                    Back to sign in
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {mode === "reset" && (
              <>
                <Field
                  label="Reset code"
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoFocus
                />
                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  visible={showNewPassword}
                  onToggleVisible={() => setShowNewPassword((v) => !v)}
                  containerStyle={{ marginBottom: 4 }}
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <PrimaryButton
                  label={loading ? "Resetting…" : "Reset password"}
                  onPress={handleResetPassword}
                  disabled={loading || !isLoaded}
                />
              </>
            )}
          </Glass>

          {mode === "signin" && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.replace("/signup")}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate }}>Sign up</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AtmosphericBackground>
  );
}

function ErrorText({ children }) {
  return (
    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#B3261E", marginBottom: 12 }}>{children}</Text>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: colors.ink,
        paddingVertical: 16,
        borderRadius: radii.md,
        alignItems: "center",
        marginTop: 12,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, focused, containerStyle, ...inputProps }) {
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginBottom: 8 }}>{label}</Text>
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
