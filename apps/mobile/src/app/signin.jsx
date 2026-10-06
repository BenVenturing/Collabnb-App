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
import { useSignIn } from "@clerk/clerk-expo";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { colors, fonts, radii, shadows } from "@/config/theme";

export default function SigninScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signInWithGoogle } = useGoogleAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: activateSSO } = await signInWithGoogle();
      if (createdSessionId && activateSSO) {
        await activateSSO({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
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
        router.replace("/(tabs)");
      } else {
        setError("Additional verification is required for this account.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || "Invalid email or password.");
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
            Welcome back
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
            Sign in to continue your collaborations
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
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.bone,
                borderWidth: 1,
                borderColor: colors.stone,
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
              <View style={{ flex: 1, height: 1, backgroundColor: colors.stone }} />
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
              <View style={{ flex: 1, height: 1, backgroundColor: colors.stone }} />
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
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              focused={passwordFocused}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="••••••••"
              secureTextEntry
              containerStyle={{ marginBottom: 8 }}
            />

            {error ? (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: "#B3261E",
                  marginBottom: 12,
                }}
              >
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading || !isLoaded}
              style={{
                backgroundColor: colors.ink,
                paddingVertical: 16,
                borderRadius: radii.md,
                alignItems: "center",
                marginTop: 12,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  color: colors.bone,
                  fontSize: 16,
                }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/signup")}>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.slate,
                }}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
