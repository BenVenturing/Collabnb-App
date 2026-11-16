// Membership is billed only on the web (Stripe), Netflix/Spotify style.
// App Store guideline 3.1.1 forbids prices, purchase buttons, or links/
// calls to action toward outside payment here, so this screen only explains
// the account state and closes itself once Convex reports access.

import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { X } from "lucide-react-native";
import { colors, fonts, shadows } from "@/config/theme";
import { api } from "@/convex/_generated/api";
import useAccessGate from "@/hooks/useAccessGate";

const TERMS_OF_USE_URL = "https://collabnb.com/terms";

export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const access = useAccessGate(profile);

  useEffect(() => {
    if (access.canAccess) router.back();
  }, [access.canAccess, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style={statusBarStyle()} />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, alignItems: "flex-end" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadows.sm }}
        >
          <X color={colors.ink} size={18} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: 8 }}>
          Your trial has ended
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, lineHeight: 20 }}>
          This account doesn't have an active Collabnb membership, so browsing collaborations and messaging hosts are paused.
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, lineHeight: 20, marginTop: 12 }}>
          If your account already has a membership, it unlocks here automatically.
        </Text>
        {email ? (
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginTop: 20 }}>
            Signed in as {email}
          </Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 20 }}>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(TERMS_OF_USE_URL)}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.sage, textDecorationLine: "underline" }}>Terms of Use</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/privacy-policy")}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.sage, textDecorationLine: "underline" }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
