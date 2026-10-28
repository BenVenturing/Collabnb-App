// Airbnb-style category strip: icon over label. The active one is filled
// solid ink and scrolled fully into view; every button sinks on press.

import { useEffect, useRef } from "react";
import { View, ScrollView, Pressable, Animated, Dimensions } from "react-native";
import { Sparkles, TreePine, TreePalm, Trees, Tent, Mountain, Castle, House } from "lucide-react-native";
import * as haptic from "@/utils/haptics";
import { colors } from "@/config/theme";
import { Body } from "@/components/ui";

export const CATEGORIES = [
  { label: "All", Icon: Sparkles },
  { label: "Cabin", Icon: TreePine },
  { label: "Villa", Icon: TreePalm },
  { label: "Treehouse", Icon: Trees },
  { label: "Glamping", Icon: Tent },
  { label: "Lodge", Icon: Mountain },
  { label: "Estate", Icon: Castle },
  { label: "Cottage", Icon: House },
];

function CategoryButton({ label, Icon, active, onPress, onLayout }) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v) => Animated.spring(press, { toValue: v, damping: 12, stiffness: 320, useNativeDriver: true }).start();
  const color = active ? colors.ink : colors.sage;
  return (
    <Pressable
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onLayout={onLayout}
      style={{ alignItems: "center", minWidth: 56 }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          gap: 5,
          paddingTop: 6,
          paddingBottom: 5,
          marginBottom: 10,
          paddingHorizontal: 10,
          opacity: active ? 1 : 0.72,
          transform: [
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
            { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] }) },
          ],
        }}
      >
        <Icon color={color} fill={active ? colors.ink : "none"} size={20} strokeWidth={active ? 1.8 : 1.5} />
        <Body size={11} weight={active ? "semibold" : "medium"} color={color}>
          {label}
        </Body>
      </Animated.View>
    </Pressable>
  );
}

const SCREEN_W = Dimensions.get("window").width;

export default function CategoryBar({ value, onChange }) {
  const scroller = useRef(null);
  const frames = useRef({});

  // Centre the active category so ones near the edge (Lodge, Estate) never sit
  // half off-screen once picked.
  useEffect(() => {
    const f = frames.current[value];
    if (!f) return;
    scroller.current?.scrollTo({ x: Math.max(0, f.x + f.width / 2 - SCREEN_W / 2), animated: true });
  }, [value]);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      >
        {CATEGORIES.map((c) => (
          <CategoryButton
            key={c.label}
            label={c.label}
            Icon={c.Icon}
            active={value === c.label}
            onPress={() => onChange(c.label)}
            onLayout={(e) => {
              frames.current[c.label] = e.nativeEvent.layout;
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}
