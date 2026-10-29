// Landmark line-icons for the Where search, drawn in the same 24px / 1.5 stroke
// language as the lucide category strip. Each one pops in with a little spring
// and tilt; the "I'm flexible" pin drops and bounces on a loop.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";
import {
  Castle, Landmark, Church, Mountain, MountainSnow, TreePalm, TreePine, Pyramid,
  BrickWall, Sailboat, Shell, Turtle, Drama, Building2, MapPin,
} from "lucide-react-native";
import { colors } from "@/config/theme";
import { iconForLocation } from "@/config/places";

const draw = (...ds) => ({ color, size, strokeWidth }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {ds.map((d, i) => (typeof d === "string" ? <Path key={i} d={d} /> : d))}
  </Svg>
);

const CUSTOM = {
  eiffel: draw("M12 2v3M10.8 5h2.4M10.8 5 9 12M13.2 5 15 12M8 12h8M9 12 6.5 21M15 12l2.5 9M9.8 16.5h4.4M9.3 21c.4-2.6 1.4-4 2.7-4s2.3 1.4 2.7 4"),
  pisa: draw("M8 21 11 5.5M14 21 17 5.5M11 5.5h6M12 5.5l.6-2h3.8l.6 2M8.8 17.5h6M9.6 13.5h6M10.3 9.5h6M5 21h14"),
  torii: draw("M3 6.5c3 1.2 15 1.2 18 0M5 9.5h14M7 7.5V21M17 7.5V21M12 9.5v3"),
  windmill: draw("M9 21l1.5-10.5h3L15 21zM8 21h8M6 3l12 12M18 3 6 15"),
  clocktower: draw("M12 2v2M10 4h4l1 3H9zM9 7h6v14H9zM8 21h8", <Circle key="c" cx="12" cy="11.5" r="2" />, "M12 10.4v1.2l.8.6"),
  opera: draw("M3 20c0-6 4-10 8-11-1 3-1 7-1 11zM11.5 20c0-5 2-8 5-9-.5 3-.5 6-.5 9zM17 20c0-3 1.3-5 4-5.5-.5 2-.8 3.5-.8 5.5zM2 20h20"),
  cactus: draw("M10 21V6a2 2 0 0 1 4 0v15M10 14H8a2 2 0 0 1-2-2V9M14 12h2a2 2 0 0 0 2-2V8M7 21h10"),
  mosque: draw("M7 21v-4a5 5 0 0 1 10 0v4M12 12V9M4 21V9l1-2 1 2v12M18 21V9l1-2 1 2v12M2 21h20"),
  pagoda: draw("M12 2v2M9.5 8l2.5-4 2.5 4zM7 13l3-5h4l3 5zM4.5 19l3.5-6h8l3.5 6zM3 21h18"),
  acacia: draw("M3 10c2-4 16-4 18 0-4 2-14 2-18 0zM12 12v9M9 21h6"),
  twin: draw("M6 21V8l2-3 2 3v13M14 21V8l2-3 2 3v13M10 14h4M8 5V3M16 5V3M5 21h14"),
  lighthouse: draw("M10 21 11 8h2l1 13zM9.5 8h5l-.5-2h-4zM12 6V3M10.5 3h3M10 13h4M10 17h4M7 21h10M16 5l4-1.5M8 5 4 3.5"),
  liberty: draw("M12 21v-8M8 21h8M9 13h6l-1-3.5h-4zM10 9.5 8.5 7M12 9.5V6.5M14 9.5 15.5 7M16.5 9l2-5M17.3 2.6h2.4"),
  maple: draw("M12 21v-4M12 17l-5-1.5 1-2.5-3-1.5 2.5-2L6.5 7l3 1L12 3l2.5 5 3-1-1 3.5 2.5 2-3 1.5 1 2.5z"),
  burj: draw("M12 2l1 7 1 6 1.5 6h-7L10 15l1-6zM6 21h12"),
};

const LUCIDE = {
  castle: Castle, landmark: Landmark, church: Church, mountain: Mountain, mountainSnow: MountainSnow,
  palm: TreePalm, pine: TreePine, pyramid: Pyramid, wall: BrickWall, sailboat: Sailboat, shell: Shell,
  turtle: Turtle, drama: Drama, building: Building2, pin: MapPin,
};

export function PlaceGlyph({ icon, size = 22, color = colors.ink, strokeWidth = 1.5 }) {
  const Custom = CUSTOM[icon];
  if (Custom) return <Custom color={color} size={size} strokeWidth={strokeWidth} />;
  const Lucide = LUCIDE[icon] ?? MapPin;
  return <Lucide color={color} size={size} strokeWidth={strokeWidth} />;
}

// Spring-in with a tilt; `index` staggers a list so rows land one after another.
export default function PlaceIcon({ location, icon, index = 0, size = 24 }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, delay: Math.min(index, 8) * 45, damping: 9, stiffness: 140, useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={{
        opacity: pop.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
        transform: [
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ["-14deg", "0deg"] }) },
        ],
      }}
    >
      <PlaceGlyph icon={icon ?? iconForLocation(location)} size={size} />
    </Animated.View>
  );
}

// Dropped-pin for "I'm flexible": falls, squashes its shadow, hops, settles, rests.
export function FlexiblePin({ size = 24 }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 520, easing: Easing.bounce, useNativeDriver: true }),
        Animated.delay(1700),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={{ width: size, height: size + 4, alignItems: "center", justifyContent: "flex-end" }}>
      <Svg width={size} height={4} viewBox="0 0 24 4" style={{ position: "absolute", bottom: 0 }}>
        <Ellipse cx="12" cy="2" rx="5" ry="1.4" fill={colors.ink} opacity={0.14} />
      </Svg>
      <Animated.View style={{ position: "absolute", top: 0, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 20s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z" />
          <Circle cx="12" cy="10" r="2.2" />
        </Svg>
      </Animated.View>
    </View>
  );
}
