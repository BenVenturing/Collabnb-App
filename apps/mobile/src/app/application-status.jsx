// Mobile twin of the web's pending-approval views (WaitlistPreview /welcome +
// AccessGate PendingApprovalScreen): same copy, same gate (api.gates.getMyAccess
// reports "pending" until an admin approves the profile).

import { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { X, Clock } from "lucide-react-native";
import { colors, fonts, shadows } from "@/config/theme";
import { api } from "@/convex/_generated/api";
import useAccessGate from "@/hooks/useAccessGate";

const CREATOR_STEPS = [
  "Your social accounts and portfolio are reviewed",
  "Your follower count and engagement are verified",
  "Your experience and professionalism are assessed",
  "You may receive a request for a brief interview",
  "You'll be assigned a track (UGC or Influencer) and tier",
  "If approved, you get full marketplace access",
];

export default function ApplicationStatusScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const access = useAccessGate(profile);

  useEffect(() => {
    if (access.canAccess) router.back();
  }, [access.canAccess, router]);

  const isHost = profile?.role === "host";
  const firstName = profile?.full_name?.split(" ")[0];
  const applicationIncomplete =
    !!profile &&
    !isHost &&
    (!profile.avatar_url || !(profile.instagram_handle || profile.tiktok_handle || profile.youtube_handle));

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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 12, paddingBottom: insets.bottom + 40, alignItems: "center" }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Clock color={colors.ink} size={26} strokeWidth={1.5} />
        </View>
        <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 24, color: colors.ink, textAlign: "center", marginBottom: 10 }}>
          You're on the list!
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate, textAlign: "center" }}>
          Welcome to Collabnb{firstName ? `, ${firstName}` : ""}. Your application is being reviewed. We'll email you at{" "}
          <Text style={{ fontFamily: fonts.bodySemibold, color: colors.ink }}>{email || "your inbox"}</Text> once you're approved.
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, textAlign: "center", marginTop: 6 }}>
          Usually within 1–2 business days.
        </Text>

        {applicationIncomplete && (
          <TouchableOpacity
            onPress={() => router.push("/creator-onboarding/basic-info")}
            style={{ marginTop: 22, backgroundColor: colors.slate, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22 }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.surface }}>Finish your application</Text>
          </TouchableOpacity>
        )}

        {!isHost && (
          <View style={{ alignSelf: "stretch", backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginTop: 26 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink, marginBottom: 10 }}>What happens next:</Text>
            {CREATOR_STEPS.map((s) => (
              <View key={s} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: colors.sage, fontSize: 13 }}>•</Text>
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate }}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ alignSelf: "stretch", borderWidth: 1, borderColor: colors.mint, borderRadius: 18, padding: 18, marginTop: 18, alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, letterSpacing: 1.2, color: colors.slate, marginBottom: 6 }}>
            REVIEW IN PROGRESS
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate, textAlign: "center" }}>
            Once approved, you'll unlock full access to browse, apply to collabs, and message hosts.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
