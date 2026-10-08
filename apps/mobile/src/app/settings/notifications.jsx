import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { ChevronLeft, Bell } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, tracking, track } from "@/config/theme";

const DEFAULT_PREFS = {
  messages: true,
  contractUpdates: true,
  newListings: false,
  collabReminders: true,
  marketing: false,
};

const notificationOptions = [
  {
    key: "messages",
    title: "Messages",
    description: "New messages and replies in your inbox",
  },
  {
    key: "contractUpdates",
    title: "Contract Updates",
    description: "When a contract is signed, updated, or needs action",
  },
  {
    key: "newListings",
    title: "New Listings",
    description: "Properties that match your preferences",
  },
  {
    key: "collabReminders",
    title: "Collab Reminders",
    description: "Upcoming deadlines and pending deliverables",
  },
  {
    key: "marketing",
    title: "Marketing Updates",
    description: "News, tips, and special offers from Collabnb",
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const updateProfileMutation = useMutation(api.profiles.updateProfile);

  const profileId = profile?._id ? String(profile._id) : null;
  const settings = { ...DEFAULT_PREFS, ...profile?.notification_prefs };

  const updateSetting = (key, value) => {
    if (!profileId) return;
    updateProfileMutation({
      profileId,
      updates: { notification_prefs: { ...settings, [key]: value } },
    }).catch((error) => {
      console.error("Failed to save notification settings:", error);
    });
  };

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.stone,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ChevronLeft color={colors.slate} size={28} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              color: colors.ink,
              letterSpacing: track(20, tracking.display),
            }}
          >
            Notifications
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Bell color={colors.slate} size={40} />
          </View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 24,
              color: colors.ink,
              letterSpacing: track(24, tracking.display),
              marginBottom: 8,
            }}
          >
            Stay Updated
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.slate,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Choose what notifications you'd like to receive
          </Text>
        </View>

        <Glass variant="small">
          {notificationOptions.map((option, index) => (
            <View
              key={option.key}
              style={{
                paddingVertical: 18,
                paddingHorizontal: 20,
                borderBottomWidth:
                  index < notificationOptions.length - 1 ? 1 : 0,
                // colors.sage at 20% opacity
                borderBottomColor: "rgba(149, 157, 144, 0.2)",
                opacity: profileId ? 1 : 0.5,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 16,
                      color: colors.ink,
                      marginBottom: 4,
                    }}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.slate,
                      lineHeight: 18,
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
                <Switch
                  value={settings[option.key]}
                  onValueChange={(value) => updateSetting(option.key, value)}
                  trackColor={{ false: colors.stone, true: colors.mint }}
                  thumbColor={settings[option.key] ? colors.slate : colors.sage}
                  disabled={!profileId}
                />
              </View>
            </View>
          ))}
        </Glass>

        <Glass
          variant="small"
          style={{
            // colors.mint at 40% opacity — preserved as an emphasis tint distinct from the panel above
            backgroundColor: "rgba(209, 235, 219, 0.4)",
            marginTop: 16,
          }}
        >
          <View style={{ padding: 16 }}>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.ink,
                lineHeight: 20,
                textAlign: "center",
              }}
            >
              💡 Enable push notifications in your device settings for real-time
              alerts
            </Text>
          </View>
        </Glass>
      </ScrollView>
    </AtmosphericBackground>
  );
}
