import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Mail, Copy, ExternalLink } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import appStoreDraft from "@/data/appStoreDraft";

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const copyValue = async (label, value) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  const openMail = async (email) => {
    const url = `mailto:${email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Unavailable", "No mail app is configured on this device.");
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

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
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <ChevronLeft color="#3C5759" size={28} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
            Support
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
            <Mail color="#3C5759" size={40} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Support Draft
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Store the support contact details here while the public support page is still pending.
          </Text>
        </View>

        {[
          {
            title: "Support Email",
            value: appStoreDraft.supportEmail,
            onPrimary: () => openMail(appStoreDraft.supportEmail),
            primaryLabel: "Email",
          },
          {
            title: "Privacy Email",
            value: appStoreDraft.privacyEmail,
            onPrimary: () => openMail(appStoreDraft.privacyEmail),
            primaryLabel: "Email",
          },
          {
            title: "Planned Support URL",
            value: appStoreDraft.supportUrl,
            onPrimary: () => copyValue("Support URL", appStoreDraft.supportUrl),
            primaryLabel: "Copy",
          },
        ].map((item) => (
          <BlurView
            key={item.title}
            intensity={60}
            tint="light"
            style={{
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.5)",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              marginBottom: 14,
            }}
          >
            <View style={{ padding: 18 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 8,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: "#3C5759",
                  marginBottom: 14,
                }}
              >
                {item.value}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={item.onPrimary}
                  style={{
                    flex: 1,
                    backgroundColor: "#3C5759",
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <ExternalLink color="#EFECE9" size={16} />
                  <Text style={{ color: "#EFECE9", fontWeight: "600" }}>
                    {item.primaryLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => copyValue(item.title, item.value)}
                  style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                  }}
                >
                  <Copy color="#3C5759" size={16} />
                  <Text style={{ color: "#3C5759", fontWeight: "600" }}>
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        ))}

        <BlurView
          intensity={60}
          tint="light"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.5)",
            backgroundColor: "rgba(209, 235, 219, 0.4)",
          }}
        >
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 14, color: "#192524", lineHeight: 21 }}>
              App Store Connect will not accept this screen as your support URL. You still need a public webpage later, but this keeps the final contact copy inside the mobile app for review.
            </Text>
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
}
