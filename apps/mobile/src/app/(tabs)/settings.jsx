import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from "react-native";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, ChevronRight } from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, shadows, tracking, track } from "@/config/theme";
import {
  setTheme as setStoreTheme,
  getTheme,
  THEMES,
} from "@/utils/ThemeStore";
import { COLOR_MODES, getColorMode, setColorMode, useColorMode } from "@/utils/ColorModeStore";
import { useRoleSwitch } from "@/hooks/useRoleSwitch";
import { useVerification } from "@/hooks/useVerification";

const SAMPLE_CREATOR = {
  name: "Benjamin",
  handle: "@ben.venturing",
};

export default function CreatorSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode: colorMode } = useColorMode();
  const [selectedTheme, setSelectedTheme] = useState("white");
  const [vibeExpanded, setVibeExpanded] = useState(false);

  const { attemptRoleSwitch } = useRoleSwitch();
  const { signOut: clerkSignOut } = useClerkAuth();
  const { isVerified, isLoading: verificationLoading, requestVerification } = useVerification();

  useEffect(() => {
    getTheme().then((id) => {
      if (id) setSelectedTheme(id);
    });
  }, []);

  const handleThemeSelect = async (themeId) => {
    setSelectedTheme(themeId);
    if (themeId !== "white" && getColorMode() !== "light") setColorMode("light");
    await setStoreTheme(themeId);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "You'll be signed out on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await clerkSignOut();
            await AsyncStorage.multiRemove([
              "@role",
              "@host_draft",
              "@creator_draft",
              "@profile_photo_uri",
              "@notifications_settings",
              "@verification_status",
            ]);
            router.replace("/signin");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  const { user } = useUser();
  const deleteEmail = user?.primaryEmailAddress?.emailAddress;
  const { isAuthenticated: convexAuthed } = useConvexAuth();
  const deleteProfile = useQuery(api.profiles.getByEmail, deleteEmail && convexAuthed ? { email: deleteEmail } : "skip");
  const deleteAccount = useAction(api.profiles.deleteAccount);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    if (!deleteProfile?._id) {
      Alert.alert("Error", "Your profile isn't loaded yet. Please try again in a moment.");
      return;
    }
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, listings, messages and collaborations. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount({ profileId: deleteProfile._id });
            } catch (error) {
              console.error("Delete account error:", error);
              setDeleting(false);
              Alert.alert("Error", error?.message || "Couldn't delete your account. Please try again.");
              return;
            }
            try {
              await clerkSignOut();
            } catch {}
            await AsyncStorage.multiRemove([
              "@role",
              "@host_draft",
              "@creator_draft",
              "@profile_photo_uri",
              "@notifications_settings",
              "@verification_status",
            ]);
            router.replace("/signin");
          },
        },
      ],
    );
  };

  const handleVerification = () => {
    if (verificationLoading) return;
    Alert.alert(
      "Account Verification",
      isVerified
        ? "Your account is verified."
        : "Submit a re-verification request. Your current verified status (if any) will remain active during review.",
      [
        { text: "Cancel", style: "cancel" },
        isVerified
          ? null
          : {
              text: "Request",
              onPress: async () => {
                try {
                  await requestVerification();
                  Alert.alert(
                    "Request Submitted",
                    "Re-verification request sent — the Collabnb team will review your account.",
                  );
                } catch (error) {
                  Alert.alert("Error", "Couldn't send that request. Please try again.");
                }
              },
            },
      ].filter(Boolean),
    );
  };

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle()} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(60,87,89,0.08)",
        }}
      >
        <Text
          style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink, letterSpacing: track(20, tracking.display) }}
        >
          Settings
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(60,87,89,0.08)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X color={colors.slate} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE section */}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Profile
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/profile-edit")}
          style={{ marginHorizontal: 20, ...shadows.sm }}
        >
          <Glass
            variant="small"
            contentStyle={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.8)",
              }}
            >
              <Image
                source={{ uri: deleteProfile?.avatar_url || user?.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 16,
                  color: colors.ink,
                  letterSpacing: track(16, tracking.display),
                }}
              >
                {deleteProfile?.full_name || user?.fullName || user?.firstName || "Your profile"}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.sage,
                  marginTop: 2,
                }}
              >
                {deleteProfile?.username ? `@${deleteProfile.username}` : deleteProfile?.instagram_handle ? `@${deleteProfile.instagram_handle.replace(/^@/, "")}` : ""}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  color: colors.stone,
                  marginTop: 3,
                }}
              >
                Tap to edit profile
              </Text>
            </View>
            <ChevronRight color={colors.stone} size={18} />
          </Glass>
        </TouchableOpacity>

        {/* APPEARANCE section */}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Appearance
        </Text>
        <View style={{ marginHorizontal: 20, ...shadows.sm }}>
          <Glass variant="small">
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
              Color mode
            </Text>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
                {COLOR_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => {
                      if (m.id === "dark" && selectedTheme !== "white") {
                        Alert.alert("Dark mode", "Dark mode needs the Plain White vibe. Pick Plain White under Your Vibe first.");
                        return;
                      }
                      setColorMode(m.id);
                    }}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 9,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colorMode === m.id ? colors.ink : colors.stone,
                      backgroundColor: colorMode === m.id ? colors.ink : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 13,
                        color: colorMode === m.id ? colors.bone : colors.ink,
                      }}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            <View style={{ height: 1, backgroundColor: colors.hairline }} />
          <TouchableOpacity
            onPress={() => setVibeExpanded(!vibeExpanded)}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 15,
                  color: colors.ink,
                }}
              >
                Your Vibe
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: colors.sage,
                  marginTop: 2,
                }}
              >
                Changes background theme
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: colors.stone }}>
              {vibeExpanded ? "∨" : "›"}
            </Text>
          </TouchableOpacity>

          {vibeExpanded && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
              }}
            >
              {THEMES.map((theme) => {
                const on = selectedTheme === theme.id;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    onPress={() => handleThemeSelect(theme.id)}
                    activeOpacity={0.7}
                    accessibilityLabel={theme.label}
                    accessibilityState={{ selected: on }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1.5,
                      borderColor: on ? colors.ink : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: theme.id === "white" ? "#FFFFFF" : undefined,
                        borderWidth: theme.id === "white" ? 1 : 0,
                        borderColor: colors.stone,
                      }}
                    >
                      {theme.id !== "white" && (
                        <LinearGradient
                          colors={theme.colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          </Glass>
        </View>

        {/* ACCOUNT section */}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Account
        </Text>
        <View style={{ marginHorizontal: 20, ...shadows.sm }}>
          <Glass variant="small">
          {[
            {
              label: "Privacy & Security",
              onPress: () => router.push("/settings/privacy"),
            },
            {
              label: "Support",
              onPress: () => router.push("/settings/support"),
            },
            {
              label: "Privacy Policy",
              onPress: () => router.push("/privacy-policy"),
            },
            {
              label: "Terms of Service",
              onPress: () => Linking.openURL("https://collabnb.com/terms.html"),
            },
            {
              label: "Notifications",
              onPress: () => router.push("/settings/notifications"),
            },
            ...(__DEV__
              ? [
                  { label: "App Store Prep", onPress: () => router.push("/settings/app-store-prep") },
                  { label: "Replay welcome", onPress: () => router.push("/welcome") },
                ]
              : []),
            { label: "Verification", onPress: handleVerification },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <TouchableOpacity
                onPress={row.onPress}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                >
                  {row.label}
                </Text>
                <ChevronRight color={colors.stone} size={18} />
              </TouchableOpacity>
              {i < arr.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: "rgba(60,87,89,0.06)",
                    marginLeft: 16,
                  }}
                />
              )}
            </View>
          ))}
          </Glass>
        </View>

        {/* MODE section */}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Mode
        </Text>
        <View style={{ marginHorizontal: 20, ...shadows.md }}>
          <Glass
            variant="small"
            contentStyle={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 15,
                  color: colors.ink,
                  letterSpacing: track(15, tracking.display),
                }}
              >
                Host Mode
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: colors.sage,
                  marginTop: 2,
                }}
              >
                Switch to your host dashboard
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => attemptRoleSwitch("host")}
              style={{
                backgroundColor: colors.slate,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 13,
                  color: colors.bone,
                }}
              >
                Switch ›
              </Text>
            </TouchableOpacity>
          </Glass>
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 40,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: "rgba(200,104,104,0.08)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(200,104,104,0.2)",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 15,
              color: "#C86868",
            }}
          >
            Log Out
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deleting}
          style={{
            marginHorizontal: 20,
            marginTop: -24,
            marginBottom: 40,
            paddingVertical: 14,
            alignItems: "center",
            opacity: deleting ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 14,
              color: "#C86868",
            }}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AtmosphericBackground>
  );
}
