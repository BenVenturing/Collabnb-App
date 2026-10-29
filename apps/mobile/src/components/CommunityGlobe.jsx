// The website's "Our Global Community" globe, drawn in Skia instead of three.js:
// an orthographic projection rebuilt on the UI thread each frame, so it spins
// without touching JS. Swipe sideways to fling it; it idles slowly otherwise.
// Only animates while `active` (the Profile tab is focused).

import { useEffect, useMemo } from "react";
import { View, Dimensions } from "react-native";
import { Canvas, Circle, Path, Group, RadialGradient, BlurMask, vec, usePathValue } from "@shopify/react-native-skia";
import { useSharedValue, useFrameCallback, useDerivedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors } from "@/config/theme";
import { isDark } from "@/utils/ColorModeStore";
import { Body, Display } from "@/components/ui";
import {
  CONTINENT_POLYS,
  FALLBACK_CREATORS,
  FALLBACK_HOSTS,
  countGlobeStats,
  getCityCoords,
  isInternalProfile,
} from "@/utils/globeData";

const SIZE = Math.min(Dimensions.get("window").width - 40, 340);
const C = SIZE / 2;
const R = C * 0.8;
const TILT = 0.15;
const LIGHT_GLOBE = {
  shadow: "rgba(25,37,36,0.10)",
  halo: ["rgba(209,235,219,0.6)", "rgba(209,235,219,0.6)", "rgba(209,235,219,0)"],
  ocean: "rgba(220,228,224,0.92)",
  grid: "rgba(149,157,144,0.3)",
  land: "rgba(130,150,135,0.72)",
  coast: "rgba(100,125,110,0.55)",
  light: ["rgba(255,255,255,0.32)", "rgba(255,255,255,0)", "rgba(25,37,36,0.12)"],
  rim: ["rgba(255,255,255,0)", "rgba(255,255,255,0.45)"],
};
// Night side: a near-black ocean, pale slate land, and a thin cool-blue
// atmosphere in place of the white halo. The terminator darkens the lower right.
const DARK_GLOBE = {
  shadow: "rgba(0,0,0,0)",
  halo: ["rgba(90,130,200,0.28)", "rgba(90,130,200,0.28)", "rgba(90,130,200,0)"],
  ocean: "rgba(8,14,26,0.97)",
  grid: "rgba(150,175,215,0.16)",
  land: "rgba(120,140,170,0.55)",
  coast: "rgba(170,195,230,0.55)",
  light: ["rgba(150,180,230,0.18)", "rgba(0,0,0,0)", "rgba(0,0,0,0.55)"],
  rim: ["rgba(120,160,230,0)", "rgba(120,160,230,0.35)"],
};
const CREATOR = "#22c55e";
const HOST = "#ef4444";

function unit(lat, lng) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

// Long polygon edges are split so they bow with the sphere instead of cutting
// straight chords across it.
function densify(coords, step = 4) {
  const out = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const [la1, ln1] = coords[i];
    const [la2, ln2] = coords[i + 1];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(la2 - la1), Math.abs(ln2 - ln1)) / step));
    for (let k = 0; k < n; k++) out.push(unit(la1 + ((la2 - la1) * k) / n, ln1 + ((ln2 - ln1) * k) / n));
  }
  return out;
}

const LAND = CONTINENT_POLYS.map((p) => densify(p));
const GRID = [];
for (let lat = -80; lat <= 80; lat += 20) {
  const line = [];
  for (let lng = -180; lng <= 180; lng += 5) line.push(unit(lat, lng));
  GRID.push(line);
}
for (let lng = -180; lng < 180; lng += 20) {
  const line = [];
  for (let lat = -90; lat <= 90; lat += 5) line.push(unit(lat, lng));
  GRID.push(line);
}

function project(v, cosY, sinY) {
  "worklet";
  const x = v[0] * cosY + v[2] * sinY;
  const z1 = -v[0] * sinY + v[2] * cosY;
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  return [x, v[1] * ct - z1 * st, v[1] * st + z1 * ct];
}

function addPins(path, pins, rot, radius) {
  "worklet";
  const cosY = Math.cos(rot);
  const sinY = Math.sin(rot);
  for (let i = 0; i < pins.length; i++) {
    const p = project(pins[i], cosY, sinY);
    if (p[2] > 0.05) path.addCircle(C + p[0] * R, C - p[1] * R, radius);
  }
}

function jitteredPins(profiles) {
  const visible = (profiles || []).filter(
    (p) => !isInternalProfile(p) && (p.role === "creator" || p.role === "host"),
  );
  if (visible.length === 0) {
    return {
      creators: FALLBACK_CREATORS.map(([a, b]) => unit(a, b)),
      hosts: FALLBACK_HOSTS.map(([a, b]) => unit(a, b)),
    };
  }
  const creators = [];
  const hosts = [];
  visible.forEach((p) => {
    const { lat, lng } = getCityCoords(p.city);
    const v = unit(lat + (Math.random() - 0.5) * 0.8, lng + (Math.random() - 0.5) * 0.8);
    (p.role === "creator" ? creators : hosts).push(v);
  });
  return { creators, hosts };
}

function GlobeCanvas({ profiles, active }) {
  const rot = useSharedValue(-1.6);
  const vel = useSharedValue(0);
  const dragging = useSharedValue(false);
  const clock = useSharedValue(0);
  const pins = useSharedValue({ creators: [], hosts: [] });

  useEffect(() => {
    pins.value = jitteredPins(profiles);
  }, [profiles, pins]);

  const frame = useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame ?? 16;
    clock.value += dt / 1000;
    if (dragging.value) return;
    vel.value *= 0.95;
    rot.value += vel.value + dt * 0.00005;
  }, false);

  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      dragging.value = true;
      vel.value = 0;
    })
    .onChange((e) => {
      rot.value += e.changeX * 0.008;
    })
    .onFinalize((e) => {
      dragging.value = false;
      vel.value = (e.velocityX * 0.008) / 60;
    });

  const grid = usePathValue((path) => {
    "worklet";
    const cosY = Math.cos(rot.value);
    const sinY = Math.sin(rot.value);
    for (let l = 0; l < GRID.length; l++) {
      let drawing = false;
      for (let i = 0; i < GRID[l].length; i++) {
        const p = project(GRID[l][i], cosY, sinY);
        if (p[2] <= 0) {
          drawing = false;
          continue;
        }
        if (drawing) path.lineTo(C + p[0] * R, C - p[1] * R);
        else path.moveTo(C + p[0] * R, C - p[1] * R);
        drawing = true;
      }
    }
  });

  // Vertices on the far side are pinned to the limb, so a continent wrapping
  // round the edge is clipped along the globe's outline.
  const land = usePathValue((path) => {
    "worklet";
    const cosY = Math.cos(rot.value);
    const sinY = Math.sin(rot.value);
    for (let k = 0; k < LAND.length; k++) {
      const poly = LAND[k];
      const pts = [];
      let anyFront = false;
      for (let i = 0; i < poly.length; i++) {
        const p = project(poly[i], cosY, sinY);
        if (p[2] < 0) {
          const m = Math.sqrt(p[0] * p[0] + p[1] * p[1]) || 1;
          pts.push(p[0] / m, p[1] / m);
        } else {
          anyFront = true;
          pts.push(p[0], p[1]);
        }
      }
      if (!anyFront) continue;
      path.moveTo(C + pts[0] * R, C - pts[1] * R);
      for (let i = 2; i < pts.length; i += 2) path.lineTo(C + pts[i] * R, C - pts[i + 1] * R);
      path.close();
    }
  });

  const creatorDots = usePathValue((path) => {
    "worklet";
    addPins(path, pins.value.creators, rot.value, 2.6);
  });
  const hostDots = usePathValue((path) => {
    "worklet";
    addPins(path, pins.value.hosts, rot.value, 2.6);
  });
  const creatorGlow = usePathValue((path) => {
    "worklet";
    addPins(path, pins.value.creators, rot.value, 5 * (1 + 0.18 * Math.sin(clock.value * 1.5)));
  });
  const hostGlow = usePathValue((path) => {
    "worklet";
    addPins(path, pins.value.hosts, rot.value, 5 * (1 + 0.18 * Math.sin(clock.value * 1.5 + Math.PI)));
  });
  const creatorGlowOpacity = useDerivedValue(() => 0.2 + 0.16 * Math.sin(clock.value * 1.5));
  const hostGlowOpacity = useDerivedValue(() => 0.2 + 0.16 * Math.sin(clock.value * 1.5 + Math.PI));

  const G = isDark() ? DARK_GLOBE : LIGHT_GLOBE;
  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ width: SIZE, height: SIZE }}>
        <Circle cx={C} cy={C + R * 0.1} r={R * 0.96} color={G.shadow}>
          <BlurMask blur={22} style="normal" />
        </Circle>
        <Circle cx={C} cy={C} r={R * 1.13}>
          <RadialGradient
            c={vec(C, C)}
            r={R * 1.13}
            colors={G.halo}
            positions={[0, 0.86, 1]}
          />
        </Circle>
        <Circle cx={C} cy={C} r={R} color={G.ocean} />
        <Path path={grid} style="stroke" strokeWidth={0.6} color={G.grid} />
        <Path path={land} color={G.land} />
        <Path path={land} style="stroke" strokeWidth={0.8} color={G.coast} />
        <Circle cx={C} cy={C} r={R}>
          <RadialGradient
            c={vec(C - R * 0.35, C - R * 0.4)}
            r={R * 1.7}
            colors={G.light}
            positions={[0, 0.45, 1]}
          />
        </Circle>
        <Circle cx={C} cy={C} r={R}>
          <RadialGradient
            c={vec(C, C)}
            r={R}
            colors={G.rim}
            positions={[0.78, 1]}
          />
        </Circle>
        <Group>
          <Path path={creatorGlow} color={CREATOR} opacity={creatorGlowOpacity} />
          <Path path={hostGlow} color={HOST} opacity={hostGlowOpacity} />
          <Path path={creatorDots} color={CREATOR} />
          <Path path={hostDots} color={HOST} />
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

function StatChip({ dot, value, label }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: isDark() ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
        borderWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Body size={12} weight="semibold" color={colors.ink}>
        {value || "—"}
      </Body>
      <Body size={12} color={colors.slate}>
        {label}
      </Body>
    </View>
  );
}

export default function CommunityGlobe({ active = true }) {
  const profiles = useQuery(api.profiles.getPublicGlobeProfiles);
  const stats = useMemo(() => countGlobeStats(profiles), [profiles]);

  return (
    <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
      <Display size={20} style={{ textAlign: "center" }}>
        Our Global Community
      </Display>
      <Body size={13} color={colors.sage} style={{ textAlign: "center", marginTop: 4, marginBottom: 6 }}>
        Creators and hosts connecting across the world
      </Body>
      <GlobeCanvas profiles={profiles} active={active} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 6 }}>
        <StatChip dot={CREATOR} value={stats.creators} label="Creators" />
        <StatChip dot={HOST} value={stats.hosts} label="Hosts" />
        <StatChip dot={isDark() ? "#A6ABB2" : "#D0D5CE"} value={stats.countries} label="Countries" />
      </View>
    </View>
  );
}
