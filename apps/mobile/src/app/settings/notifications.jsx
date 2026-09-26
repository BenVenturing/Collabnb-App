import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { ChevronLeft, Bell } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { api } from "@/convex/_generated/api";

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
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ChevronLeft color="#3C5759" size={28} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
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
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Bell color="#3C5759" size={40} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Stay Updated
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Choose what notifications you'd like to receive
          </Text>
        </View>

        <BlurView
          intensity={60}
          tint="light"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.5)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
          }}
        >
          {notificationOptions.map((option, index) => (
            <View
              key={option.key}
              style={{
                paddingVertical: 18,
                paddingHorizontal: 20,
                borderBottomWidth:
                  index < notificationOptions.length - 1 ? 1 : 0,
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
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#192524",
                      marginBottom: 4,
                    }}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#3C5759",
                      lineHeight: 18,
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
                <Switch
                  value={settings[option.key]}
                  onValueChange={(value) => updateSetting(option.key, value)}
                  trackColor={{ false: "#D0D5CE", true: "#D1EBDB" }}
                  thumbColor={settings[option.key] ? "#3C5759" : "#959D90"}
                  disabled={!profileId}
                />
              </View>
            </View>
          ))}
        </BlurView>

        <BlurView
          intensity={60}
          tint="light"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.5)",
            backgroundColor: "rgba(209, 235, 219, 0.4)",
            marginTop: 16,
          }}
        >
          <View style={{ padding: 16 }}>
            <Text
              style={{
                fontSize: 14,
                color: "#192524",
                lineHeight: 20,
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              💡 Enable push notifications in your device settings for real-time
              alerts
            </Text>
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
}
