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

import { StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Canvas,
  Rect,
  Group,
  RadialGradient,
  FractalNoise,
  Image as SkiaImage,
  useImage,
  vec,
} from "@shopify/react-native-skia";
import { backdrop } from "@/config/theme";

const CLOUDS = require("../../assets/images/bg-clouds-hazy.png");

export default function AtmosphericBackground({ children, style }) {
  const { width, height } = useWindowDimensions();
  const clouds = useImage(CLOUDS);

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

        {clouds && (
          <Group opacity={cloudCfg.opacity} blendMode="multiply">
            <SkiaImage
              image={clouds}
              x={0}
              y={0}
              width={width}
              height={height}
              fit="cover"
            />
          </Group>
        )}

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

      {children}
    </View>
  );
}
