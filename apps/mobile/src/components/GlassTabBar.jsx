// Floating glass tab bar for expo-router's <Tabs tabBar={...}>.
//
// Behaviour, after WhatsApp / the Bible app's bar:
//  * A glass "bubble" sits behind the active tab. Changing tabs slides it: the
//    leading edge races ahead on a fast spring while the trailing edge lags on
//    a slow one, so the bubble stretches mid-move then condenses on arrival.
//  * Press and hold, then slide across the bar: the bubble grows into a lens
//    that follows your finger, icons under it swell, and the tab changes as
//    the lens crosses each one (with a light haptic). Lift to settle.
//  * Reduced-motion users get short fades instead of springs, and no lens.
//
// The lens is a scale-up of the bubble and the icons beneath it, not a true
// optical magnifier — RN has no backdrop distortion.

import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as haptic from "@/utils/haptics";
import Glass from "@/components/Glass";
import { colors, fonts, shadows } from "@/config/theme";

const PAD = 6;
const BAR_H = 64;
const FAST = { damping: 17, stiffness: 300, mass: 0.7 };
const SLOW = { damping: 20, stiffness: 110, mass: 1 };
// 0 / undefined hides the badge; large counts read "9+".
const formatBadge = (n) => (n == null || n === 0 || n === "" ? null : typeof n === "number" ? (n > 9 ? "9+" : String(n)) : String(n));

const AnimatedGlass = Animated.createAnimatedComponent(GlassView);
const clamp = (v, lo, hi) => {
  "worklet";
  return Math.min(Math.max(v, lo), hi);
};

function TabItem({ index, label, icon, active, badge, tabW, center, lens, onPress }) {
  // Icons swell as the lens centre passes over them.
  const style = useAnimatedStyle(() => {
    const dist = Math.abs(center.value - (index + 0.5) * tabW.value);
    const swell = interpolate(dist, [0, tabW.value], [0.3, 0], Extrapolation.CLAMP);
    return { transform: [{ scale: 1 + swell * lens.value }] };
  });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={[{ alignItems: "center", gap: 3 }, style]}>
        <View>
          {icon(active ? colors.ink : colors.sage)}
          {!!badge && (
            <View
              style={{
                position: "absolute", top: -6, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
                backgroundColor: colors.slate, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10.5, color: colors.surface }}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontFamily: active ? fonts.bodySemibold : fonts.bodyMedium, fontSize: 10.5, color: active ? colors.ink : colors.sage }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const native = isLiquidGlassAvailable();

  // Routes hidden with href:null (sub-screens) don't get a slot. expo-router
  // strips `href` before we see it and leaves display:none in its place.
  const routes = state.routes.filter((r) => {
    const o = descriptors[r.key].options;
    return o.href !== null && o.tabBarItemStyle?.display !== "none";
  });
  const n = routes.length;
  const activeIdx = Math.max(routes.findIndex((r) => r.key === state.routes[state.index]?.key), 0);

  const [width, setWidth] = useState(0);
  const tabW = useSharedValue(0);
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const lens = useSharedValue(0);
  const center = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastIdx = useSharedValue(activeIdx);
  const placed = useRef(false);

  useEffect(() => {
    const tw = width > 0 ? (width - PAD * 2) / n : 0;
    tabW.value = tw;
    if (!tw || dragging.value) return;
    const L = activeIdx * tw;
    const R = L + tw;
    lastIdx.value = activeIdx;
    center.value = (L + R) / 2;
    if (!placed.current || reduced) {
      // First layout (or reduced motion): no travel animation.
      placed.current = true;
      left.value = reduced ? withTiming(L, { duration: 120 }) : L;
      right.value = reduced ? withTiming(R, { duration: 120 }) : R;
      return;
    }
    const goingRight = L > left.value;
    left.value = withSpring(L, goingRight ? SLOW : FAST);
    right.value = withSpring(R, goingRight ? FAST : SLOW);
  }, [activeIdx, width, n, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (i, withHaptic) => {
      const route = routes[i];
      if (!route) return;
      if (withHaptic) haptic.select();
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (state.routes[state.index]?.key !== route.key && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    },
    [routes, navigation, state],
  );

  const pan = Gesture.Pan()
    .enabled(!reduced)
    .activateAfterLongPress(220)
    .onStart(() => {
      dragging.value = true;
      lens.value = withSpring(1, { damping: 14, stiffness: 220 });
      runOnJS(haptic.tap)();
    })
    .onUpdate((e) => {
      const tw = tabW.value;
      if (!tw) return;
      const c = clamp(e.x - PAD, tw / 2, n * tw - tw / 2);
      center.value = c;
      left.value = c - tw / 2;
      right.value = c + tw / 2;
      const idx = clamp(Math.floor(c / tw), 0, n - 1);
      if (idx !== lastIdx.value) {
        lastIdx.value = idx;
        runOnJS(go)(idx, true);
      }
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      runOnJS(haptic.settle)();
      lens.value = withSpring(0, { damping: 16, stiffness: 200 });
      const L = lastIdx.value * tabW.value;
      left.value = withSpring(L, FAST);
      right.value = withSpring(L + tabW.value, FAST);
      center.value = withSpring(L + tabW.value / 2, FAST);
    });

  const bubble = useAnimatedStyle(() => ({
    left: PAD + left.value,
    width: Math.max(right.value - left.value, 0),
    transform: [{ scale: 1 + 0.22 * lens.value }],
    opacity: tabW.value ? 1 : 0,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6, backgroundColor: "transparent" }}
    >
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: BAR_H, borderRadius: BAR_H / 2, ...shadows.lg }}
        >
          {native ? (
            // iOS 26+: real Liquid Glass. GlassContainer lets the bubble and the
            // bar merge/morph like the system tab bar; isInteractive gives the
            // bubble Apple's native touch response.
            <GlassContainer spacing={12} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
              <GlassView
                glassEffectStyle="regular"
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: BAR_H / 2 }}
              />
              <AnimatedGlass
                glassEffectStyle="clear"
                isInteractive
                tintColor="rgba(255,255,255,0.35)"
                style={[{ position: "absolute", top: PAD, height: BAR_H - PAD * 2, borderRadius: (BAR_H - PAD * 2) / 2 }, bubble]}
              />
            </GlassContainer>
          ) : (
            <>
          {/* Frosted pill. Separate layer so the bubble can overflow it when it becomes a lens. */}
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
              <Glass variant="regular" style={{ borderRadius: BAR_H / 2 }} contentStyle={{ height: BAR_H }} />
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  top: PAD,
                  height: BAR_H - PAD * 2,
                  borderRadius: (BAR_H - PAD * 2) / 2,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.95)",
                  ...shadows.md,
                },
                bubble,
              ]}
            />
            </>
          )}

          <View style={{ flex: 1, flexDirection: "row", paddingHorizontal: PAD }}>
            {routes.map((route, i) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;
              return (
                <TabItem
                  key={route.key}
                  index={i}
                  label={label}
                  active={i === activeIdx}
                  badge={formatBadge(options.tabBarBadge)}
                  icon={(color) => options.tabBarIcon?.({ color, size: 22, focused: i === activeIdx })}
                  tabW={tabW}
                  center={center}
                  lens={lens}
                  onPress={() => go(i, true)}
                />
              );
            })}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}
