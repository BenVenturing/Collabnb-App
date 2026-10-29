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

import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Animated, Easing, AccessibilityInfo, useWindowDimensions } from "react-native";
import {
  Canvas,
  Rect,
  Group,
  RadialGradient,
  LinearGradient,
  Circle,
  FractalNoise,
  vec,
} from "@shopify/react-native-skia";
import { backdrop } from "@/config/theme";
import { isDark } from "@/utils/ColorModeStore";
import { getTheme, subscribeToTheme, THEMES } from "@/utils/ThemeStore";

const CLOUDS = require("../../assets/images/bg-clouds-hazy.png");
// Image is this much wider than the screen; the drift pans across the overhang.
const OVERHANG = 0.6;
const DRIFT_MS = 40000;

// Dark mode swaps the hazy clouds for a night sky: a deep navy gradient, a
// soft moonlit glow rising from the horizon, and a fixed field of stars. The
// field is seeded so it is identical on every screen and every launch.
const STAR_COUNT = 260;
const TWINKLE_COUNT = 8;

function seeded(i, salt) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function NightSky({ width, height }) {
  const stars = useRef(
    Array.from({ length: STAR_COUNT }, (_, i) => {
      // Two thirds of the stars crowd along the diagonal Milky Way band.
      const inBand = i % 3 !== 0;
      const t = seeded(i, 1);
      const spread = (seeded(i, 5) + seeded(i, 6) - 1) * width * 0.32;
      const x = inBand ? t * width * 1.3 - width * 0.15 + spread * 0.5 : t * width;
      const y = inBand ? height * (0.12 + t * 0.7) + spread : seeded(i, 2) * height;
      const bright = seeded(i, 7) > 0.93;
      return {
        x,
        y,
        r: bright ? 1.2 + seeded(i, 3) * 0.6 : 0.3 + seeded(i, 3) * 0.7,
        o: bright ? 0.9 : 0.15 + seeded(i, 4) * 0.55,
        tint: seeded(i, 8) > 0.8 ? "#FFE9D0" : seeded(i, 8) < 0.2 ? "#CFE0FF" : "#FFFFFF",
      };
    }),
  ).current;
  const twinkles = useRef(
    Array.from({ length: TWINKLE_COUNT }, (_, i) => ({
      x: seeded(i + 200, 1) * width,
      y: seeded(i + 200, 2) * height * 0.7,
      size: 2.5 + seeded(i + 200, 3) * 1.5,
      delay: seeded(i + 200, 4) * 3000,
      v: new Animated.Value(0.2),
    })),
  ).current;

  useEffect(() => {
    let cancelled = false;
    const loops = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || cancelled) return;
      twinkles.forEach((t) => {
        const leg = (to, ms) =>
          Animated.timing(t.v, { toValue: to, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
        const loop = Animated.loop(Animated.sequence([Animated.delay(t.delay), leg(1, 1600), leg(0.15, 1800)]));
        loops.push(loop);
        loop.start();
      });
    });
    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [twinkles]);

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={["#000000", "#02040A", "#050A14"]}
            positions={[0, 0.6, 1]}
          />
        </Rect>
        {/* Milky Way: a tilted, stretched soft core with a violet-blue halo. */}
        <Group origin={vec(width * 0.55, height * 0.45)} transform={[{ rotate: -0.62 }, { scaleY: 0.22 }]}>
          <Rect x={-width} y={-height} width={width * 3} height={height * 3}>
            <RadialGradient
              c={vec(width * 0.55, height * 0.45)}
              r={width * 1.1}
              colors={["rgba(150,160,210,0.34)", "rgba(80,70,140,0.14)", "rgba(0,0,0,0)"]}
              positions={[0, 0.45, 1]}
            />
          </Rect>
        </Group>
        <Group origin={vec(width * 0.4, height * 0.58)} transform={[{ rotate: -0.62 }, { scaleY: 0.1 }]}>
          <Rect x={-width} y={-height} width={width * 3} height={height * 3}>
            <RadialGradient
              c={vec(width * 0.4, height * 0.58)}
              r={width * 0.9}
              colors={["rgba(235,215,190,0.22)", "rgba(0,0,0,0)"]}
            />
          </Rect>
        </Group>
        {/* Faint nebula tints, off to the sides so the centre stays black. */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient c={vec(width * 0.05, height * 0.2)} r={width * 0.6} colors={["rgba(70,40,120,0.16)", "rgba(0,0,0,0)"]} />
        </Rect>
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient c={vec(width * 0.95, height * 0.8)} r={width * 0.7} colors={["rgba(30,80,110,0.16)", "rgba(0,0,0,0)"]} />
        </Rect>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={s.tint} opacity={s.o} />
        ))}
      </Canvas>
      {twinkles.map((t, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: t.x,
            top: t.y,
            width: t.size,
            height: t.size,
            borderRadius: t.size / 2,
            backgroundColor: "#FFFFFF",
            opacity: t.v,
            shadowColor: "#BFD8FF",
            shadowOpacity: 0.9,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ))}
    </>
  );
}

export default function AtmosphericBackground({ children, style }) {
  const { width, height } = useWindowDimensions();
  const drift = useRef(new Animated.Value(0)).current;
  const [themeId, setThemeId] = useState("white");

  useEffect(() => {
    getTheme().then((id) => id && setThemeId(id));
    return subscribeToTheme(setThemeId);
  }, []);

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

  if (isDark()) {
    return (
      <View style={[{ flex: 1, backgroundColor: "#000000" }, style]}>
        <NightSky width={width} height={height} />
        {children}
      </View>
    );
  }

  const { glow, grain, clouds: cloudCfg } = backdrop;
  const vibe = themeId === "white" ? null : THEMES.find((t) => t.id === themeId);
  const baseColor = vibe ? vibe.colors[1] : backdrop.base;
  const glowColor = vibe ? vibe.colors[2] : glow.color;
  const glowFade = vibe ? vibe.colors[2] + "00" : "rgba(209,235,219,0)";
  const cx = width * glow.centerX;
  const cy = height * glow.centerY;
  const r = width * glow.radiusX;
  // Skia radial gradients are circular, so the CSS ellipse (90% x 60%) is a
  // circle of radiusX scaled down on Y about the gradient's own centre.
  const yScale = (height * glow.radiusY) / r;

  return (
    // The base colour lives on a plain View, not in the Canvas, so a Skia
    // failure degrades to bone rather than to white.
    <View style={[{ flex: 1, backgroundColor: baseColor }, style]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group origin={vec(cx, cy)} transform={[{ scaleY: yScale }]}>
          <Rect x={0} y={-height} width={width} height={height * 2}>
            {/* Fading to a transparent *mint* rather than to "transparent"
                keeps the ramp from drifting grey mid-gradient. */}
            <RadialGradient
              c={vec(cx, cy)}
              r={r}
              colors={[glowColor, glowFade]}
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
