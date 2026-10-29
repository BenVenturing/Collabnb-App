// The web app's glass system, ported from .glass / .glass-sm / .glass-card in
// Collabnb Website/app/src/index.css.
//
// On iOS 26+ it renders the system's native Liquid Glass (expo-glass-effect);
// everywhere else it falls back to the BlurView stack below.
//
// This component exists because two things in that CSS have no React Native
// equivalent, and hand-rolling a BlurView gets both wrong:
//
//   inset 0 1px 0 rgba(255,255,255,.6)   a lit top edge. RN has no inset
//                                        shadow, so it's drawn as a hairline.
//   backdrop-filter: ... saturate(140%)  expo-blur cannot saturate, so a mint
//                                        tint overlay stands in for the
//                                        colour lift. Without it glass reads
//                                        grey instead of luminous.

import { View } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { colors, glass } from "@/config/theme";
import { isDark } from "@/utils/ColorModeStore";

export default function Glass({
  variant = "regular",
  style,
  contentStyle,
  children,
}) {
  const v = glass[variant] ?? glass.regular;

  // iOS 26+: hand the surface to the system's real Liquid Glass (refraction,
  // specular edge, adaptive contrast) instead of imitating it. `card` stays on
  // the opaque-ish blur path — it's the near-solid web .glass-card.
  if (isLiquidGlassAvailable() && variant !== "card") {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isDark() ? "dark" : "light"}
        tintColor={isDark() ? "rgba(15,25,38,0.35)" : "rgba(209,235,219,0.18)"}
        style={[{ borderRadius: v.radius, overflow: "hidden" }, style]}
      >
        <View style={contentStyle}>{children}</View>
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: v.radius,
          borderWidth: 1,
          borderColor: v.border,
          overflow: "hidden",
          backgroundColor: v.background,
        },
        style,
      ]}
    >
      <BlurView
        intensity={v.blur}
        tint={isDark() ? "dark" : "light"}
        style={{ borderRadius: v.radius }}
      >
        {/* Stands in for saturate() — a whisper of brand mint over the blur.
            Derived from the variant's own blur so heavier glass lifts more. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.mint,
            opacity: (v.saturate - 1) * 0.12,
          }}
        />

        {/* The inset top highlight. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: v.insetTop,
          }}
        />

        {v.insetBottom && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: v.insetBottom,
            }}
          />
        )}

        <View style={contentStyle}>{children}</View>
      </BlurView>
    </View>
  );
}
