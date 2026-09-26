import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Mail, Copy, ExternalLink } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import appStoreDraft from "@/data/appStoreDraft";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, tracking, track } from "@/config/theme";

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
    <AtmosphericBackground>
      <StatusBar style="dark" />

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
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
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
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Mail color={colors.slate} size={40} />
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
            Support Draft
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
          <Glass key={item.title} variant="small" style={{ marginBottom: 14 }}>
            <View style={{ padding: 18 }}>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 15,
                  color: colors.ink,
                  marginBottom: 8,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.slate,
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
                    backgroundColor: colors.slate,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <ExternalLink color={colors.bone} size={16} />
                  <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone }}>
                    {item.primaryLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => copyValue(item.title, item.value)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    borderWidth: 1,
                    borderColor: colors.stone,
                  }}
                >
                  <Copy color={colors.slate} size={16} />
                  <Text style={{ fontFamily: fonts.bodySemibold, color: colors.slate }}>
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Glass>
        ))}

        <Glass
          variant="small"
          style={{
            // colors.mint at 40% opacity — preserved as an emphasis tint distinct from the panels above
            backgroundColor: "rgba(209, 235, 219, 0.4)",
          }}
        >
          <View style={{ padding: 16 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 21 }}>
              App Store Connect will not accept this screen as your support URL. You still need a public webpage later, but this keeps the final contact copy inside the mobile app for review.
            </Text>
          </View>
        </Glass>
      </ScrollView>
    </AtmosphericBackground>
  );
}
