import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { X, ChevronRight } from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, shadows, tracking, track } from "@/config/theme";
import {
  setTheme as setStoreTheme,
  getTheme,
  THEMES,
} from "@/utils/ThemeStore";
import { useRoleSwitch } from "@/hooks/useRoleSwitch";
import { useVerification } from "@/hooks/useVerification";

const SAMPLE_CREATOR = {
  name: "Benjamin",
  handle: "@ben.venturing",
  photo: {
    uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
  },
};

export default function CreatorSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState("sand");
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
      <StatusBar style="dark" />

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
                source={SAMPLE_CREATOR.photo}
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
                {SAMPLE_CREATOR.name}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.sage,
                  marginTop: 2,
                }}
              >
                {SAMPLE_CREATOR.handle}
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
                justifyContent: "space-evenly",
                alignItems: "center",
                paddingHorizontal: 8,
                paddingTop: 14,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(60,87,89,0.06)",
              }}
            >
              {THEMES.map((theme) => (
                <View
                  key={theme.id}
                  style={{ alignItems: "center", width: 44 }}
                >
                  <TouchableOpacity
                    onPress={() => handleThemeSelect(theme.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        {
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          overflow: "hidden",
                        },
                        selectedTheme === theme.id && {
                          transform: [{ scale: 1.18 }],
                          shadowColor: colors.ink,
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.2,
                          shadowRadius: 10,
                          elevation: 8,
                        },
                      ]}
                    >
                      {theme.id === "white" ? (
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: colors.surface,
                            borderWidth: 1.5,
                            borderColor: colors.stone,
                          }}
                        />
                      ) : (
                        <LinearGradient
                          colors={theme.colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontFamily: selectedTheme === theme.id ? fonts.bodySemibold : fonts.bodyMedium,
                      fontSize: 8,
                      color: selectedTheme === theme.id ? colors.ink : colors.sage,
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    {theme.label}
                  </Text>
                </View>
              ))}
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
              label: "Notifications",
              onPress: () => router.push("/settings/notifications"),
            },
            {
              label: "App Store Prep",
              onPress: () => router.push("/settings/app-store-prep"),
            },
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
                🏡 Host Mode
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
      </ScrollView>
    </AtmosphericBackground>
  );
}
