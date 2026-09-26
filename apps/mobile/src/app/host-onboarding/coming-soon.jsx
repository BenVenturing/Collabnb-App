import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Home, ArrowLeft } from "lucide-react-native";
import { Image } from "expo-image";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

export default function HostComingSoonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <AtmosphericBackground style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.mint,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <Home color={colors.ink} size={56} />
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 28,
            color: colors.ink,
            letterSpacing: track(28, tracking.display),
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Host Mode
        </Text>

        {/* Body */}
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 16,
            color: colors.slate,
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 40,
          }}
        >
          Host onboarding is being finalized. You can explore as a creator in
          the meantime and switch to host mode when it's ready.
        </Text>

        {/* Logo */}
        <Image
          source={{
            uri: "https://ucarecdn.com/9deddd9f-ada6-48b1-9614-1a97c13cfe69/",
          }}
          style={{ width: 80, height: 80, opacity: 0.6, marginBottom: 40 }}
          contentFit="contain"
          transition={200}
        />

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.slate,
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderRadius: 16,
          }}
        >
          <ArrowLeft color={colors.bone} size={20} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>
            Go to Explore
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: insets.bottom + 20 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, textAlign: "center" }}>
          Need help? Contact support@collabnb.com
        </Text>
      </View>
    </AtmosphericBackground>
  );
}
