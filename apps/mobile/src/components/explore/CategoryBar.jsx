// Airbnb-style category strip: icon over label, active one inked with an
// underline. Each button sinks in on press and springs back on release.

import { useRef } from "react";
import { View, ScrollView, Pressable, Animated } from "react-native";
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

function CategoryButton({ label, Icon, active, onPress }) {
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
      style={{ alignItems: "center", minWidth: 56 }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          gap: 6,
          paddingTop: 4,
          opacity: active ? 1 : 0.72,
          transform: [
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
            { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] }) },
          ],
        }}
      >
        <Icon color={color} size={24} strokeWidth={active ? 2 : 1.6} />
        <Body size={12} weight={active ? "semibold" : "medium"} color={color}>
          {label}
        </Body>
      </Animated.View>
      <View
        style={{
          marginTop: 10,
          height: 2,
          alignSelf: "stretch",
          borderRadius: 1,
          backgroundColor: active ? colors.ink : "transparent",
        }}
      />
    </Pressable>
  );
}

export default function CategoryBar({ value, onChange }) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}
      >
        {CATEGORIES.map((c) => (
          <CategoryButton
            key={c.label}
            label={c.label}
            Icon={c.Icon}
            active={value === c.label}
            onPress={() => onChange(c.label)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
