// Floating glass tab bar for expo-router's <Tabs tabBar={...}>.
//
// Behaviour, after WhatsApp / the Bible app's bar:
//  * A glass "bubble" sits behind the active tab. Changing tabs slides it: the
//    leading edge races ahead on a fast spring while the trailing edge lags on
//    a slow one, so the bubble stretches mid-move then condenses on arrival.
//  * Slide a finger across the bar (or press and slide): the bubble grows into a lens
//    that follows your finger, icons under it swell, and the tab changes as
//    the lens crosses each one (with a light haptic). Lift to settle.
//  * Reduced-motion users get short fades instead of springs, and no lens.
//  * Scrolling a tab's content down shrinks the bar to icons only (Revolut);
//    scrolling back up restores the labels. Driven by utils/tabBarScroll.
//    The bar's layout shrinks; glass corner radii stay fixed (animating them
//    makes expo-glass-effect rebuild corners and the glass drops out) and no
//    transform sits above the glass (a scaled ancestor kills the native lens).
//
// Bubble geometry (left/right/center) is in tab units, so the bar can change
// width without re-measuring.
//
// The lens is a scale-up of the bubble and the icons beneath it, not a true
// optical magnifier — RN has no backdrop distortion.

import { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  useDerivedValue,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as haptic from "@/utils/haptics";
import Glass from "@/components/Glass";
import { colors, fonts, shadows } from "@/config/theme";
import { isDark } from "@/utils/ColorModeStore";
import { tabBarCollapse, resetTabBar } from "@/utils/tabBarScroll";

const PAD = 6;
const BAR_H = 64;
const SIDE = 16;
const MINI_H = 52;
const SHRINK = 34; // extra side inset per edge when collapsed
const LABEL_H = 13;
const LABEL_GAP = 3;
// Collapsed, the icon slides down by this much to sit in the bar's centre.
// Radii sized for the full bar; iOS clamps them to a capsule when it's shorter.
const BAR_R = BAR_H / 2;
const BUBBLE_R = (BAR_H - 4) / 2;
const ICON_SHIFT = (LABEL_H + LABEL_GAP) / 2;
// The bubble is WhatsApp-sized: nearly the bar's full height and a little
// wider than its slot.
const BUBBLE_INSET = 2;
const BUBBLE_FLARE = 5;
const FAST = { damping: 17, stiffness: 300, mass: 0.7 };
const SLOW = { damping: 20, stiffness: 110, mass: 1 };
// 0 / undefined hides the badge; large counts read "9+".
const formatBadge = (n) => (n == null || n === 0 || n === "" ? null : typeof n === "number" ? (n > 9 ? "9+" : String(n)) : String(n));

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedGlass = Animated.createAnimatedComponent(GlassView);
const clamp = (v, lo, hi) => {
  "worklet";
  return Math.min(Math.max(v, lo), hi);
};

function TabItem({ index, label, icon, active, badge, center, lens, collapse, onPress }) {
  // Icons swell as the lens centre passes over them.
  const style = useAnimatedStyle(() => {
    const dist = Math.abs(center.value - (index + 0.5));
    const swell = interpolate(dist, [0, 1], [0.3, 0], Extrapolation.CLAMP);
    return { transform: [{ scale: 1 + swell * lens.value }] };
  });
  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ICON_SHIFT * collapse.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={groupStyle}>
      <Animated.View style={[{ alignItems: "center", gap: LABEL_GAP }, style]}>
        <View>
          {icon(active ? colors.ink : isDark() ? colors.ink + "B3" : colors.sage)}
          {!!badge && (
            <View
              style={{
                position: "absolute", top: -7, right: -12, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
                backgroundColor: colors.slate, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface,
                ...shadows.sm,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.surface }}>{badge}</Text>
            </View>
          )}
        </View>
        <AnimatedText
          numberOfLines={1}
          style={[{ fontFamily: active ? fonts.bodySemibold : fonts.bodyMedium, fontSize: 10.5, lineHeight: LABEL_H, color: active ? colors.ink : isDark() ? colors.ink + "B3" : colors.sage }, labelStyle]}
        >
          {label}
        </AnimatedText>
      </Animated.View>
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

  const fullW = useSharedValue(0);
  const collapse = tabBarCollapse;
  const tabW = useDerivedValue(() =>
    fullW.value > 0 ? (fullW.value - SHRINK * 2 * collapse.value - PAD * 2) / n : 0,
  );
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const lens = useSharedValue(0);
  const center = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastIdx = useSharedValue(activeIdx);
  const placed = useRef(false);

  useEffect(() => {
    resetTabBar();
  }, [activeIdx]);

  useEffect(() => {
    if (dragging.value) return;
    const L = activeIdx;
    const R = L + 1;
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
    // Magnifier pulse while it travels: the bubble swells and the icons it
    // crosses grow, then it settles — like WhatsApp's tab lens.
    lens.value = withSequence(
      withTiming(0.6, { duration: 140 }),
      withSpring(0, { damping: 15, stiffness: 170 }),
    );
  }, [activeIdx, n, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

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
    .activeOffsetX([-6, 6])
    .failOffsetY([-30, 30])
    .minPointers(1)
    .onStart(() => {
      dragging.value = true;
      lens.value = withSpring(1, { damping: 14, stiffness: 220 });
      runOnJS(haptic.tap)();
    })
    .onUpdate((e) => {
      const tw = tabW.value;
      if (!tw) return;
      const c = clamp((e.x - PAD) / tw, 0.5, n - 0.5);
      center.value = c;
      left.value = c - 0.5;
      right.value = c + 0.5;
      const idx = clamp(Math.floor(c), 0, n - 1);
      if (idx !== lastIdx.value) {
        lastIdx.value = idx;
        runOnJS(haptic.select)();
      }
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      runOnJS(haptic.settle)();
      runOnJS(go)(lastIdx.value, false);
      lens.value = withSpring(0, { damping: 16, stiffness: 200 });
      const L = lastIdx.value;
      left.value = withSpring(L, FAST);
      right.value = withSpring(L + 1, FAST);
      center.value = withSpring(L + 0.5, FAST);
    });

  const barH = useDerivedValue(() => BAR_H - (BAR_H - MINI_H) * collapse.value);

  const bubble = useAnimatedStyle(() => {
    const tw = tabW.value;
    return {
      left: PAD + left.value * tw - BUBBLE_FLARE,
      width: Math.max((right.value - left.value) * tw + BUBBLE_FLARE * 2, 0),
      height: barH.value - BUBBLE_INSET * 2,
      transform: [{ scale: 1 + 0.22 * lens.value }],
      opacity: tw ? 1 : 0,
    };
  });

  // Bottom edge stays put; the bar shrinks up and in from it.
  const barStyle = useAnimatedStyle(() => ({
    height: barH.value,
    marginHorizontal: SHRINK * collapse.value,
  }));

  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => {
        fullW.value = e.nativeEvent.layout.width - SIDE * 2;
      }}
      style={{ paddingHorizontal: SIDE, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6, backgroundColor: "transparent" }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ borderRadius: BAR_R, ...shadows.lg }, barStyle]}>
          {native ? (
            // iOS 26+: real Liquid Glass. GlassContainer lets the bubble and the
            // bar merge/morph like the system tab bar; isInteractive gives the
            // bubble Apple's native touch response.
            <GlassContainer spacing={12} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
              <GlassView
                glassEffectStyle="regular"
                colorScheme={isDark() ? "dark" : "light"}
                tintColor={isDark() ? "rgba(8,14,26,0.72)" : undefined}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: BAR_R }}
              />
              <AnimatedGlass
                glassEffectStyle="clear"
                isInteractive
                colorScheme={isDark() ? "dark" : "light"}
                tintColor={isDark() ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.35)"}
                style={[{ position: "absolute", top: BUBBLE_INSET, borderRadius: BUBBLE_R }, bubble]}
              />
            </GlassContainer>
          ) : (
            <>
          {/* Frosted pill. Separate layer so the bubble can overflow it when it becomes a lens. */}
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
              <Glass variant="regular" style={{ flex: 1, borderRadius: BAR_R }} contentStyle={{ flex: 1 }} />
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  top: BUBBLE_INSET,
                  borderRadius: BUBBLE_R,
                  backgroundColor: isDark() ? "rgba(255,255,255,0.12)" : "rgba(25,37,36,0.07)",
                  borderWidth: 1,
                  borderColor: isDark() ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.95)",
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
                  center={center}
                  lens={lens}
                  collapse={collapse}
                  onPress={() => go(i, true)}
                />
              );
            })}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
