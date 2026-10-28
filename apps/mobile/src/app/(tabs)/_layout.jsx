import { Tabs, useSegments } from "expo-router";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
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
import { useConversations } from "@/hooks/useConversations";

// GlassTabBar's own height: 64pt pill + 6pt top pad + bottom inset.
const BAR_H = 70;
const SPRING = { damping: 18, stiffness: 180 };

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
  const pillStyle = useAnimatedStyle(() => ({
    bottom: withSpring(hidden ? Math.max(insets.bottom, 8) + 12 : barH + 12, SPRING),
  }));

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
            <Glass variant="small" style={{ borderRadius: 999 }} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 18, paddingVertical: 11 }}>
              {mapOpen ? <List color={colors.ink} size={17} /> : <MapIcon color={colors.ink} size={17} />}
              <Body size={14} weight="semibold">{mapOpen ? "List" : "Map"}</Body>
            </Glass>
          </Pressable>
        </Animated.View>
      )}
    </ThemedBackground>
  );
}
