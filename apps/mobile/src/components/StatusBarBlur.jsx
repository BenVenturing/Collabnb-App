// Frosted strip behind the status bar so the clock and battery stay legible
// once content scrolls under the notch. The blur is full strength over the
// status bar and feathers out over FEATHER points below it, so there's no hard
// edge. Pass an Animated scrollY to fade it in only after `fadeStart` (e.g.
// past a hero image); without one it's always on.

import { Animated, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FEATHER = 22;

export default function StatusBarBlur({ scrollY, fadeStart = 0, fadeLength = 40 }) {
  const insets = useSafeAreaInsets();
  const height = insets.top + FEATHER;
  const solidUntil = insets.top / height;
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
      style={{ position: "absolute", top: 0, left: 0, right: 0, height, zIndex: 50, opacity }}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={["#000", "#000", "rgba(0,0,0,0.5)", "transparent"]}
            locations={[0, solidUntil * 0.85, solidUntil + (1 - solidUntil) * 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(239,236,233,0.7)", "rgba(239,236,233,0.25)"]}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
    </Animated.View>
  );
}
