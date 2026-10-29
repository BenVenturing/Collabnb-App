import { View, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Home, ArrowLeft } from "lucide-react-native";
import { Image } from "expo-image";
import { AtmosphericBackground, Display, Body } from "@/components/ui";
import { colors } from "@/config/theme";

export default function HostComingSoonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <AtmosphericBackground style={{ paddingTop: insets.top }}>
      <StatusBar style={statusBarStyle()} />

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
        <Display size={28} style={{ textAlign: "center", marginBottom: 12 }}>
          Host Mode
        </Display>

        {/* Body */}
        <Body size={16} color={colors.slate} style={{ textAlign: "center", lineHeight: 24, marginBottom: 40 }}>
          Host onboarding is being finalized. You can explore as a creator in
          the meantime and switch to host mode when it's ready.
        </Body>

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
          onPress={() => router.replace("/explore")}
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
          <Body size={16} weight="semibold" color={colors.bone}>
            Go to Explore
          </Body>
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: insets.bottom + 20 }}>
        <Body size={13} color={colors.sage} style={{ textAlign: "center" }}>
          Need help? Contact support@collabnb.com
        </Body>
      </View>
    </AtmosphericBackground>
  );
}
