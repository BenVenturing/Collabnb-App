import { Tabs, useSegments } from "expo-router";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import {
  Search,
  Briefcase,
  MessageCircle,
  Heart,
  Map as MapIcon,
  List,
} from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";
import GlassTabBar from "@/components/GlassTabBar";
import TabAvatar from "@/components/TabAvatar";
import Glass from "@/components/Glass";
import { Body } from "@/components/ui";
import { colors, shadows } from "@/config/theme";
import useMapViewStore from "@/utils/MapViewStore";
import { tabBarCollapse } from "@/utils/tabBarScroll";
import { useConversations } from "@/hooks/useConversations";

// GlassTabBar's own height: 64pt pill + 6pt top pad + bottom inset.
const BAR_H = 70;
const SPRING = { damping: 18, stiffness: 180 };
// How far GlassTabBar's top edge drops when it collapses (64pt → 52pt).
const COLLAPSE_DROP = 12;
// Map pill: full is icon + "Map"; collapsed (while scrolling) is an icon circle.
const PILL_H = 42;
const PILL_ICON = 17;
const PILL_GAP = 7;
const PILL_PAD = 18;
const PILL_MINI_PAD = (PILL_H - PILL_ICON) / 2;

// Floating Liquid Glass tab bar (same as host mode). On Explore a glass
// Map/List pill floats above it; opening the map tucks the bar away so the
// pill is the only chrome left on screen.
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useConversations(); // drives the Inbox tab badge
  const segments = useSegments();
  const { mapOpen, hasMapPoints, setMapOpen } = useMapViewStore();

  // segments is ["(tabs)", "explore"] on Explore, ["(tabs)", "saved"] elsewhere.
  const onExplore = segments[segments.length - 1] === "explore";
  const showMapToggle = onExplore && hasMapPoints;
  const barH = BAR_H + Math.max(insets.bottom, 8);
  const hidden = showMapToggle && mapOpen;

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(hidden ? barH + 20 : 0, SPRING) }],
  }));
  const pillTarget = hidden ? Math.max(insets.bottom, 8) + 12 : barH + 12;
  const pillBase = useSharedValue(pillTarget);
  useEffect(() => {
    pillBase.value = withSpring(pillTarget, SPRING);
  }, [pillTarget]); // eslint-disable-line react-hooks/exhaustive-deps
  const pillStyle = useAnimatedStyle(() => ({
    bottom: pillBase.value - (hidden ? 0 : COLLAPSE_DROP * tabBarCollapse.value),
    transform: [{ scale: 1 - 0.05 * tabBarCollapse.value }],
  }));
  // Only width/padding change on the pill's glass, never its radius.
  const [labelW, setLabelW] = useState(0);
  const pillPadStyle = useAnimatedStyle(() => ({
    paddingHorizontal: PILL_PAD - (PILL_PAD - PILL_MINI_PAD) * tabBarCollapse.value,
  }));
  const pillLabelStyle = useAnimatedStyle(() => {
    const c = tabBarCollapse.value;
    return {
      width: labelW ? labelW * (1 - c) : undefined,
      marginLeft: PILL_GAP * (1 - c),
      opacity: interpolate(c, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <ThemedBackground style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (
          <Animated.View
            pointerEvents="box-none"
            style={[{ position: "absolute", left: 0, right: 0, bottom: 0 }, barStyle]}
          >
            <GlassTabBar {...props} />
          </Animated.View>
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => <Search color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="collaborations"
          options={{
            title: "Collabs",
            tabBarIcon: ({ color, size }) => (
              <Briefcase color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: "Saved",
            tabBarIcon: ({ color, size }) => <Heart color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarIcon: ({ color, size }) => (
              <MessageCircle color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => <TabAvatar color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="conversation"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile-edit"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* While the map is open its results sheet carries its own Map pill. */}
      {showMapToggle && !mapOpen && (
        <Animated.View style={[{ position: "absolute", alignSelf: "center", ...shadows.md }, pillStyle]}>
          <Pressable
            onPress={() => setMapOpen(!mapOpen)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={mapOpen ? "Show list" : "Show map"}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <Glass variant="small" style={{ borderRadius: 999 }}>
              <Animated.View style={[{ height: PILL_H, flexDirection: "row", alignItems: "center", justifyContent: "center" }, pillPadStyle]}>
                {mapOpen ? <List color={colors.ink} size={PILL_ICON} /> : <MapIcon color={colors.ink} size={PILL_ICON} />}
                <Animated.View style={[{ overflow: "hidden" }, pillLabelStyle]}>
                  <Body
                    size={14}
                    weight="semibold"
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    style={labelW ? { width: labelW } : undefined}
                    onLayout={(e) => !labelW && setLabelW(Math.ceil(e.nativeEvent.layout.width))}
                  >
                    {mapOpen ? "List" : "Map"}
                  </Body>
                </Animated.View>
              </Animated.View>
            </Glass>
          </Pressable>
        </Animated.View>
      )}
    </ThemedBackground>
  );
}
