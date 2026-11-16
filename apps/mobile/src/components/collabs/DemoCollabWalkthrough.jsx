import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Mail, Handshake, Upload, CheckCircle2 } from "lucide-react-native";
import { colors, fonts, radii, shadows } from "@/config/theme";

const KEY = "collabnb.demoCollabDismissed.v1";

const ICONS = [Mail, Handshake, Upload, CheckCircle2];
const STAGES = ["Application", "Accepted", "Content", "Completed"];

// Same fake collab (Maya x Casa Alma) told from each side, so the two roles
// see mirror images of one story.
const STEPS = {
  creator: [
    { title: "You apply", body: "You send Casa Alma a short pitch for a 3-night stay in exchange for 2 Reels and 8 photos.", action: "Waiting on host reply" },
    { title: "The host accepts", body: "Casa Alma says yes. You review and sign the contract together, then the dates lock in.", action: "Review the contract" },
    { title: "You create and upload", body: "Enjoy your stay, shoot the content, and upload it for the host to review.", action: "Upload content · 3 days left" },
    { title: "Review and rate", body: "The host approves your content and you each leave a rating. That's a completed collab.", action: "Completed · leave a rating" },
  ],
  host: [
    { title: "A creator applies", body: "Maya sends a pitch to stay 3 nights at Casa Alma in exchange for 2 Reels and 8 photos.", action: "Review application" },
    { title: "You accept", body: "You approve Maya and sign the contract together. Dates lock in and she's notified.", action: "Sign the contract" },
    { title: "She uploads content", body: "After her stay, Maya uploads the content. You can approve it or request changes.", action: "Review her content" },
    { title: "Review and rate", body: "You approve the content and you each leave a rating. That's a completed collab.", action: "Completed · leave a rating" },
  ],
};

export function useDemoCollabDismissed() {
  const [dismissed, setDismissed] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setDismissed(v === "1")).catch(() => setDismissed(false));
  }, []);
  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(KEY, "1").catch(() => {});
  };
  return [dismissed, dismiss];
}

export default function DemoCollabWalkthrough({ role = "creator", onDismiss }) {
  const [step, setStep] = useState(0);
  const steps = STEPS[role] || STEPS.creator;
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 4 }}>
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.sage, marginBottom: 10 }}>
        No collabs yet. Here's how one works.
      </Text>
      <View style={{ borderRadius: radii.lg, backgroundColor: colors.surface, overflow: "hidden", ...shadows.md }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.bone }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink }}>Casa Alma</Text>
            <View style={{ backgroundColor: colors.bone, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.slate }}>Sample</Text>
            </View>
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
            {role === "host" ? "Maya · 2 Reels, 8 photos" : "Tulum, Mexico · 2 Reels, 8 photos"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, gap: 6 }}>
          {STAGES.map((label, i) => {
            const Icon = ICONS[i];
            const done = i <= step;
            return (
              <TouchableOpacity key={label} onPress={() => setStep(i)} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <View style={{ height: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: done ? colors.slate : colors.bone }} />
                <Icon size={16} color={done ? colors.slate : colors.sage} />
                <Text style={{ fontFamily: fonts.body, fontSize: 10, color: done ? colors.ink : colors.sage }} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink, marginBottom: 6 }}>
            {step + 1}. {s.title}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.slate, marginBottom: 12 }}>{s.body}</Text>
          <View style={{ alignSelf: "flex-start", backgroundColor: colors.bone, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>{s.action}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.bone }}>
          <TouchableOpacity
            onPress={onDismiss}
            style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: colors.bone }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate }}>Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (last ? onDismiss?.() : setStep(step + 1))}
            style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: colors.slate }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.surface }}>{last ? "Got it" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
