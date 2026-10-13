// Vertical stage stepper for a collaboration (the web page lays it out
// horizontally; a column reads better on a phone). `steps` comes from
// utils/collabTimeline.js buildTimeline().

import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { colors, fonts, radii, shadows } from "@/config/theme";

// A soft ring that breathes out from the current step. Still under reduced motion.
function PulseRing() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: reduced ? 0 : 0.35 * (1 - t.value), transform: [{ scale: 1 + 0.7 * t.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: colors.slate }, style]}
    />
  );
}

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
              <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                {current && !terminated && <PulseRing />}
              <View
                style={{
                  width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
                  backgroundColor: stopped ? colors.danger : done ? colors.slate : current ? colors.mint : colors.bone,
                  borderWidth: current ? 2 : 0, borderColor: colors.slate,
                }}
              >
                {done && <Check color={colors.surface} size={14} strokeWidth={3} />}
              </View>
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
