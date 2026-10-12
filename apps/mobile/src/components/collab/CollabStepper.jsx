// Vertical stage stepper for a collaboration (the web page lays it out
// horizontally; a column reads better on a phone). `steps` comes from
// utils/collabTimeline.js buildTimeline().

import { View, Text } from "react-native";
import { Check } from "lucide-react-native";
import { colors, fonts, radii, shadows } from "@/config/theme";

export default function CollabStepper({ steps, terminated = false }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, ...shadows.sm }}>
      {steps.map((s, i) => {
        const done = s.state === "done";
        const current = s.state === "current";
        const stopped = s.state === "stopped";
        const last = i === steps.length - 1;
        return (
          <View key={s.key} style={{ flexDirection: "row" }}>
            <View style={{ alignItems: "center", width: 28 }}>
              <View
                style={{
                  width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
                  backgroundColor: stopped ? colors.danger : done ? colors.slate : current ? colors.mint : colors.bone,
                  borderWidth: current ? 2 : 0, borderColor: colors.slate,
                }}
              >
                {done && <Check color="#fff" size={14} strokeWidth={3} />}
              </View>
              {!last && <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: done ? colors.slate : colors.stone }} />}
            </View>
            <View style={{ flex: 1, marginLeft: 12, paddingBottom: last ? 0 : 16 }}>
              <Text style={{ fontFamily: current || stopped ? fonts.bodySemibold : fonts.bodyMedium, fontSize: 15, color: s.state === "upcoming" ? colors.sage : colors.ink }}>
                {s.label}
                {s.date ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>{`  ·  ${s.date}`}</Text> : null}
              </Text>
              {(current || stopped) && !terminated && (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginTop: 2 }}>{s.hint}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
