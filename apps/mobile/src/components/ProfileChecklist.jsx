// Mirrors the web's OnboardingChecklist (creator steps) so a profile counts as
// "done" by the same rules on both. Hidden once every step is complete.

import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, ChevronRight } from "lucide-react-native";
import Glass from "@/components/Glass";
import { colors, fonts } from "@/config/theme";

// Same rule as web Layout.jsx hasPayoutConnected.
const hasPayout = (p) =>
  (p?.payout_method === "stripe_connect" && p?.stripe_connect_payouts_enabled === true) ||
  (p?.payout_method === "wise" && !!p?.wise_recipient_id);

export default function ProfileChecklist({ profile }) {
  const router = useRouter();
  if (!profile || profile.role !== "creator") return null;

  const edit = () => router.push("/(tabs)/profile-edit");
  // Payouts are creator earnings (not a purchase), set up on the web dashboard.
  const payout = () => WebBrowser.openBrowserAsync("https://collabnb.com/profile?open=payout");

  const steps = [
    { label: "Add a profile photo", done: !!profile.avatar_url, onPress: edit },
    { label: "Write your bio", done: !!profile.bio && profile.bio.length > 10, onPress: edit },
    { label: "Add your content niches", done: Array.isArray(profile.niches) && profile.niches.length > 0, onPress: edit },
    { label: "Connect a social account", done: !!(profile.instagram_handle || profile.tiktok_handle || profile.youtube_handle), onPress: edit },
    { label: "Connect your payout method", done: hasPayout(profile), onPress: payout },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Glass variant="regular" style={{ marginBottom: 20 }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>Finish your profile</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>
            {doneCount}/{steps.length}
          </Text>
        </View>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.hairline, marginBottom: 8, overflow: "hidden" }}>
          <View style={{ width: `${(doneCount / steps.length) * 100}%`, height: "100%", backgroundColor: colors.slate }} />
        </View>
        {steps.map((s) => (
          <TouchableOpacity
            key={s.label}
            disabled={s.done}
            onPress={s.onPress}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 }}
          >
            <View
              style={{
                width: 20, height: 20, borderRadius: 10,
                borderWidth: s.done ? 0 : 1.5, borderColor: colors.sage,
                backgroundColor: s.done ? colors.slate : "transparent",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {s.done && <Check size={12} color={colors.surface} strokeWidth={3} />}
            </View>
            <Text
              style={{
                flex: 1, fontFamily: fonts.body, fontSize: 14,
                color: s.done ? colors.sage : colors.ink,
                textDecorationLine: s.done ? "line-through" : "none",
              }}
            >
              {s.label}
            </Text>
            {!s.done && <ChevronRight size={16} color={colors.sage} />}
          </TouchableOpacity>
        ))}
      </View>
    </Glass>
  );
}
