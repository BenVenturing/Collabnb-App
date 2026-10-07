import { Tabs, useSegments } from "expo-router";
import { View, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Briefcase,
  MessageCircle,
  User,
  Heart,
  Map as MapIcon,
  ChevronUp,
} from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";
import BulgeTabBarBackground, { BULGE_RISE, BULGE_RADIUS } from "@/components/BulgeTabBarBackground";
import useMapViewStore from "@/utils/MapViewStore";

const ROW_HEIGHT = 49;

// "Liquid glass" tab bar whose top edge arcs up into a semicircle on Explore.
// The map toggle lives inside that arc rather than floating above the bar.
// While the map is open the whole bar slides down until only the arc is left
// on screen, so it doubles as the pull-tab that brings the bar back up.
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { mapOpen, hasMapPoints, setMapOpen } = useMapViewStore();

  // segments is ["(tabs)"] on Explore itself, ["(tabs)", "saved"] elsewhere.
  const onExplore = segments[segments.length - 1] === "(tabs)";
  const showBulge = onExplore && hasMapPoints;

  const barHeight = ROW_HEIGHT + BULGE_RISE + insets.bottom;
  // Slid down far enough that only the arc band still shows.
  const slide = showBulge && mapOpen ? barHeight - BULGE_RISE : 0;
  // Distance from the screen's bottom edge to the middle of the arc.
  const arcCenterFromBottom = barHeight - slide - BULGE_RISE / 2;

  return (
    <ThemedBackground style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            height: barHeight,
            paddingTop: BULGE_RISE,
            paddingBottom: insets.bottom,
            elevation: 0,
            transform: [{ translateY: slide }],
          },
          tabBarBackground: () => (
            <BulgeTabBarBackground height={barHeight} withBulge={showBulge} />
          ),
          tabBarActiveTintColor: "#192524",
          tabBarInactiveTintColor: "#959D90",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="index"
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
            tabBarIcon: ({ color, size }) => (
              <MessageCircle color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
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

      {/* Touch target for the arc. The arc itself is drawn as part of the
          bar's silhouette (BulgeTabBarBackground); tabBarBackground isn't
          interactive, so the press handling lives here. */}
      {showBulge && (
        <TouchableOpacity
          onPress={() => setMapOpen(!mapOpen)}
          hitSlop={10}
          activeOpacity={0.7}
          style={{
            position: "absolute",
            alignSelf: "center",
            bottom: arcCenterFromBottom - BULGE_RISE / 2,
            width: BULGE_RADIUS * 2,
            height: BULGE_RISE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mapOpen ? (
            <ChevronUp color="#192524" size={20} />
          ) : (
            <MapIcon color="#192524" size={19} />
          )}
        </TouchableOpacity>
      )}
    </ThemedBackground>
  );
}
