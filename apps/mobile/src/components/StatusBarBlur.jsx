// Frosted strip behind the status bar so the clock and battery stay legible
// once content scrolls under the notch. Pass an Animated scrollY to fade it in
// only after `fadeStart` (e.g. past a hero image); without one it's always on.

import { Animated, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StatusBarBlur({ scrollY, fadeStart = 0, fadeLength = 40 }) {
  const insets = useSafeAreaInsets();
  const opacity = scrollY
    ? scrollY.interpolate({
        inputRange: [fadeStart, fadeStart + fadeLength],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : 1;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 8, zIndex: 50, opacity }}
    >
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(239,236,233,0.75)", "rgba(239,236,233,0)"]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
