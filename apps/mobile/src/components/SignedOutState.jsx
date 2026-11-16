import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { statusBarStyle } from "@/utils/ColorModeStore";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import FloatingArt from "@/components/FloatingArt";
import { colors, fonts, tracking, track } from "@/config/theme";

// Same layout and muted-green button as the Saved and Collabs signed-out screens.
export default function SignedOutState({ art, title, body }) {
  const router = useRouter();
  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle()} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        {art ? <FloatingArt source={art} /> : null}
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: 18,
            color: colors.ink,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: track(18, tracking.display),
          }}
        >
          {title}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.slate, textAlign: "center", marginBottom: 24 }}>
          {body}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/signin")}
          style={{ backgroundColor: colors.slate, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </AtmosphericBackground>
  );
}
