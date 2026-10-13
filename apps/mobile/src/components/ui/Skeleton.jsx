// Loading placeholders (PRODUCT.md: "honest states"). A calm shimmer in the
// brand's own tones instead of a spinner, shaped like the content that is
// about to arrive so the screen doesn't jump. Reduced-motion users get the
// still shapes with no pulse.

import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, shadows, motion } from "@/config/theme";

export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.bezier(...motion.easeOutQuart) }), -1, true);
    return undefined;
  }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const pulse = useAnimatedStyle(() => ({ opacity: reduced ? 0.7 : 0.45 + 0.4 * t.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.stone }, pulse, style]}
    />
  );
}

// ── Shaped presets ────────────────────────────────────────────────────────

export function ListingCardSkeleton() {
  return (
    <View style={{ borderRadius: radii.lg, backgroundColor: colors.surface, overflow: "hidden", ...shadows.md }}>
      <Skeleton height={200} radius={0} />
      <View style={{ padding: 16, gap: 10 }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="75%" height={18} />
        <Skeleton width="30%" height={16} />
      </View>
    </View>
  );
}

export function CollabCardSkeleton() {
  return (
    <View style={{ borderRadius: radii.lg, backgroundColor: colors.surface, overflow: "hidden", marginHorizontal: 20, marginBottom: 16, ...shadows.md }}>
      <View style={{ flexDirection: "row" }}>
        <Skeleton width={120} height={120} radius={0} />
        <View style={{ flex: 1, padding: 12, gap: 10 }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={12} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.bone }}>
        <Skeleton width={110} height={28} radius={radii.md} />
      </View>
    </View>
  );
}

export function ThreadRowSkeleton() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingVertical: 12 }}>
      <Skeleton width={54} height={54} radius={27} />
      <View style={{ flex: 1, marginLeft: 14, marginRight: 16, gap: 9 }}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="85%" height={12} />
      </View>
    </View>
  );
}
