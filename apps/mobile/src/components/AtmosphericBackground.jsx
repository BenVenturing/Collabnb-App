// The web app's hazy background, ported from the .bg-* layers in
// Collabnb Website/app/src/index.css. Four layers, in this order:
//
//   1. bone base          .bg-base
//   2. mint radial glow   .bg-gradient  radial-gradient(ellipse 90% 60% at 50% 0%)
//   3. hazy clouds        .bg-clouds    opacity .18, mix-blend-mode multiply
//   4. grain              .bg-grain     opacity .03, feTurbulence baseFrequency .9
//
// Use this at the root of every full screen. A flat backgroundColor is not a
// substitute — that flatness is the main reason mobile read cheaper than web.
//
// The clouds drift slowly sideways. They live outside the Skia canvas on
// purpose: animating them inside it would redraw the glow and grain every
// frame on every mounted screen. As a plain image moved by a native-driver
// transform, the drift is a compositor shift with no redraw and no JS per frame.
// That costs web's multiply blend — normal blend at the same low opacity reads
// the same on bone. Reduce Motion keeps them still.

import { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing, AccessibilityInfo, useWindowDimensions } from "react-native";
import {
  Canvas,
  Rect,
  Group,
  RadialGradient,
  FractalNoise,
  vec,
} from "@shopify/react-native-skia";
import { backdrop } from "@/config/theme";

const CLOUDS = require("../../assets/images/bg-clouds-hazy.png");
// Image is this much wider than the screen; the drift pans across the overhang.
const OVERHANG = 0.6;
const DRIFT_MS = 40000;

export default function AtmosphericBackground({ children, style }) {
  const { width, height } = useWindowDimensions();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || cancelled) return;
      const leg = (to) =>
        Animated.timing(drift, { toValue: to, duration: DRIFT_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
      loop = Animated.loop(Animated.sequence([leg(1), leg(0)]));
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [drift]);

  const { glow, grain, clouds: cloudCfg } = backdrop;
  const cx = width * glow.centerX;
  const cy = height * glow.centerY;
  const r = width * glow.radiusX;
  // Skia radial gradients are circular, so the CSS ellipse (90% x 60%) is a
  // circle of radiusX scaled down on Y about the gradient's own centre.
  const yScale = (height * glow.radiusY) / r;

  return (
    // The base colour lives on a plain View, not in the Canvas, so a Skia
    // failure degrades to bone rather than to white.
    <View style={[{ flex: 1, backgroundColor: backdrop.base }, style]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group origin={vec(cx, cy)} transform={[{ scaleY: yScale }]}>
          <Rect x={0} y={-height} width={width} height={height * 2}>
            {/* Fading to a transparent *mint* rather than to "transparent"
                keeps the ramp from drifting grey mid-gradient. */}
            <RadialGradient
              c={vec(cx, cy)}
              r={r}
              colors={[glow.color, "rgba(209,235,219,0)"]}
              positions={[0, glow.stop]}
            />
          </Rect>
        </Group>

        <Group opacity={grain.opacity}>
          <Rect x={0} y={0} width={width} height={height}>
            <FractalNoise
              freqX={grain.baseFrequency}
              freqY={grain.baseFrequency}
              octaves={1}
            />
          </Rect>
        </Group>
      </Canvas>

      <Animated.Image
        source={CLOUDS}
        pointerEvents="none"
        resizeMode="cover"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: width * (1 + OVERHANG),
          height,
          opacity: cloudCfg.opacity,
          transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -width * OVERHANG] }) }],
        }}
      />

      {children}
    </View>
  );
}
