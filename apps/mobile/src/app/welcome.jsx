import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ArrowLeft, Check, MapPin, Camera, Home, Sparkles } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { colors, fonts, radii } from "@/config/theme";

export const WELCOME_SEEN_KEY = "@collabnb:welcome_seen";
export const WELCOME_PREFS_KEY = "@collabnb:welcome_prefs";

const { width: W } = Dimensions.get("window");
const STEPS = 5;

const ART = [
  require("../../assets/images/empty-explore.png"),
  require("../../assets/images/empty-collabs.png"),
  require("../../assets/images/empty-saved.png"),
];

const CREATOR_VIBES = ["Beach", "Jungle", "Mountains", "City", "Desert", "Lake", "Island", "Countryside"];
const HOST_TYPES = ["Boutique hotel", "Villa", "Cabin", "Glamping", "Resort", "Guesthouse", "Apartment", "Retreat"];

const SHOTS = {
  creator: [require("../../assets/images/welcome-shot-03.jpg"), require("../../assets/images/welcome-shot-04.jpg")],
  host: [require("../../assets/images/welcome-shot-02.jpg"), require("../../assets/images/welcome-shot-05.jpg")],
};

const firstImage = (l) => {
  const img = l?.images?.[0];
  return typeof img === "string" ? img : img?.url ?? null;
};

const tap = () => Haptics.selectionAsync().catch(() => {});

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(null);
  const [picks, setPicks] = useState([]);

  const listings = useQuery(api.listings.getAll, {});
  const photos = useMemo(
    () => (listings ?? []).map(firstImage).filter(Boolean).slice(0, 6),
    [listings],
  );

  const markSeen = () => AsyncStorage.setItem(WELCOME_SEEN_KEY, "1").catch(() => {});

  const skip = async () => {
    await markSeen();
    router.replace("/explore");
  };

  const next = () => {
    tap();
    setStep((s) => Math.min(s + 1, STEPS - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const start = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await markSeen();
    await AsyncStorage.setItem(WELCOME_PREFS_KEY, JSON.stringify({ role, picks })).catch(() => {});
    router.push({ pathname: "/signup", params: { role: role ?? "creator", welcome: "1" } });
  };

  const togglePick = (p) => {
    tap();
    if (role === "host") setPicks([p]);
    else setPicks((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };

  const canContinue = step === 1 ? !!role : step === 3 ? picks.length > 0 : true;

  const cta =
    step === 0 ? "Get started"
    : step === 4 ? "Start my 30 days"
    : "Continue";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style="dark" />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          height: insets.top + 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {step > 0 ? (
          <TouchableOpacity onPress={back} hitSlop={10} style={{ width: 40 }}>
            <ArrowLeft color={colors.ink} size={22} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        {step > 0 ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Array.from({ length: STEPS - 1 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: i + 1 === step ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i + 1 <= step ? colors.ink : colors.stone,
                }}
              />
            ))}
          </View>
        ) : null}
        <TouchableOpacity onPress={skip} hitSlop={10} style={{ width: 40, alignItems: "flex-end" }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.sage }}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {step === 0 && <IntroStep photos={photos} />}
        {step === 1 && <RoleStep role={role} onPick={(r) => { tap(); setRole(r); setPicks([]); }} />}
        {step === 2 && (role === "host" ? <HostPayoff photos={photos} /> : <CreatorPayoff photos={photos} />)}
        {step === 3 && (
          <PicksStep
            title={role === "host" ? "What kind of place\ndo you host?" : "Where do you\nlove to create?"}
            sub={role === "host" ? "We'll match you with creators who fit." : "Pick a few. We'll tailor your feed."}
            options={role === "host" ? HOST_TYPES : CREATOR_VIBES}
            picks={picks}
            onToggle={togglePick}
          />
        )}
        {step === 4 && <GiftStep photos={photos} role={role} />}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, gap: 14 }}>
        {step === 4 ? (
          <Animated.View entering={FadeIn.delay(500)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Check color={colors.ink} size={18} strokeWidth={2.5} />
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink }}>No card needed</Text>
          </Animated.View>
        ) : null}
        <TouchableOpacity
          onPress={step === 4 ? start : next}
          disabled={!canContinue}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.ink,
            borderRadius: 999,
            paddingVertical: 18,
            alignItems: "center",
            opacity: canContinue ? 1 : 0.35,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 17, color: colors.bone }}>{cta}</Text>
        </TouchableOpacity>
        {step === 0 ? (
          <TouchableOpacity onPress={async () => { await markSeen(); router.push("/signin"); }} hitSlop={8}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink, textAlign: "center" }}>
              I already have an account
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Headline({ title, sub, delay = 0 }) {
  return (
    <View style={{ paddingHorizontal: 28 }}>
      <Animated.Text
        entering={FadeInDown.delay(delay).duration(500)}
        style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink, textAlign: "center", letterSpacing: -0.8 }}
      >
        {title}
      </Animated.Text>
      {sub ? (
        <Animated.Text
          entering={FadeInDown.delay(delay + 120).duration(500)}
          style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.sage, textAlign: "center", marginTop: 10 }}
        >
          {sub}
        </Animated.Text>
      ) : null}
    </View>
  );
}

function Photo({ uri, fallback, style }) {
  return uri ? (
    <Image source={{ uri }} style={[{ width: "100%", height: "100%" }, style]} contentFit="cover" transition={250} />
  ) : (
    <View style={[{ flex: 1, backgroundColor: "#E4DED3", alignItems: "center", justifyContent: "center" }, style]}>
      <Image source={fallback ?? ART[0]} style={{ width: "70%", height: "70%" }} contentFit="contain" />
    </View>
  );
}

/* ── Step 0: postcards fan out ─────────────────────────────────────────── */

function Postcard({ uri, art, index, rotate, x, y }) {
  const p = useSharedValue(0);
  const float = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(200 + index * 160, withSpring(1, { damping: 13, stiffness: 90 }));
    float.value = withDelay(
      1200 + index * 300,
      withRepeat(withSequence(
        withTiming(-6, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ), -1),
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(p.value * 1.6, 1),
    transform: [
      { translateX: x * p.value },
      { translateY: y * p.value + (1 - p.value) * 80 + float.value },
      { rotate: `${rotate * p.value}deg` },
      { scale: 0.85 + 0.15 * p.value },
    ],
  }));
  const w = Math.min(W * 0.5, 210);
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: w,
          height: w * 1.25,
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: 8,
          paddingBottom: 30,
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        style,
      ]}
    >
      <View style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}>
        <Photo uri={uri} fallback={art} />
      </View>
    </Animated.View>
  );
}

function IntroStep({ photos }) {
  return (
    <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: 12 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Postcard index={0} uri={photos[2]} art={ART[2]} rotate={-14} x={-W * 0.2} y={10} />
        <Postcard index={1} uri={photos[1]} art={ART[1]} rotate={12} x={W * 0.2} y={0} />
        <Postcard index={2} uri={photos[0]} art={ART[0]} rotate={-2} x={0} y={-20} />
      </View>
      <Headline
        delay={700}
        title={"Stay somewhere beautiful.\nCreate something worth posting."}
        sub="Collabnb connects creators with boutique stays."
      />
    </View>
  );
}

/* ── Step 1: role ──────────────────────────────────────────────────────── */

function RoleCard({ active, dimmed, icon: Icon, title, sub, onPress, delay }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withSpring(active ? 1.03 : dimmed ? 0.97 : 1, { damping: 14 });
  }, [active, dimmed]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(450)}>
     <Animated.View style={style}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          backgroundColor: active ? colors.ink : colors.surface,
          borderRadius: 24,
          padding: 22,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          opacity: dimmed ? 0.55 : 1,
          shadowColor: "#000",
          shadowOpacity: active ? 0.18 : 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: active ? "rgba(255,255,255,0.12)" : colors.bone,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon color={active ? colors.bone : colors.ink} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: active ? colors.bone : colors.ink }}>{title}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: active ? "rgba(239,236,233,0.75)" : colors.sage, marginTop: 2 }}>
            {sub}
          </Text>
        </View>
        {active ? (
          <Animated.View entering={ZoomIn.springify()}>
            <Check color={colors.bone} size={22} strokeWidth={2.5} />
          </Animated.View>
        ) : null}
      </TouchableOpacity>
     </Animated.View>
    </Animated.View>
  );
}

function RoleStep({ role, onPick }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 36 }}>
      <Headline title="Which one are you?" sub="You can switch later." />
      <View style={{ paddingHorizontal: 24, gap: 14 }}>
        <RoleCard
          delay={150}
          icon={Camera}
          title="I create content"
          sub="Stay free at beautiful places in exchange for content."
          active={role === "creator"}
          dimmed={role === "host"}
          onPress={() => onPick("creator")}
        />
        <RoleCard
          delay={260}
          icon={Home}
          title="I host a stay"
          sub="Get scroll-stopping content from vetted creators."
          active={role === "host"}
          dimmed={role === "creator"}
          onPress={() => onPick("host")}
        />
      </View>
    </View>
  );
}

/* ── Step 2: payoff ────────────────────────────────────────────────────── */

const PINS = [
  { x: 0.18, y: 0.3 },
  { x: 0.62, y: 0.18 },
  { x: 0.42, y: 0.55 },
  { x: 0.78, y: 0.6 },
  { x: 0.25, y: 0.75 },
];

function CreatorPayoff({ photos }) {
  const mapW = W - 48;
  const mapH = mapW * 0.95;
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 32 }}>
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{
          width: mapW,
          height: mapH,
          alignSelf: "center",
          borderRadius: 28,
          backgroundColor: "#E6E9E1",
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", left: -20, right: -20, top: mapH * 0.42, height: 10, backgroundColor: "#F4F3EF", transform: [{ rotate: "-12deg" }] }} />
        <View style={{ position: "absolute", top: -20, bottom: -20, left: mapW * 0.55, width: 8, backgroundColor: "#F4F3EF", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", right: -40, bottom: -40, width: mapW * 0.55, height: mapW * 0.55, borderRadius: 999, backgroundColor: "#CFDCDD" }} />
        {PINS.map((pin, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.delay(250 + i * 220).springify().damping(9)}
            style={{ position: "absolute", left: pin.x * mapW - 22, top: pin.y * mapH - 44, alignItems: "center" }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: colors.surface, overflow: "hidden", backgroundColor: colors.stone }}>
              <Photo uri={photos[i % Math.max(photos.length, 1)]} fallback={ART[i % 3]} />
            </View>
            <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: colors.surface, marginTop: -1 }} />
          </Animated.View>
        ))}
        <Animated.View
          entering={SlideInRight.delay(1500).springify().damping(14)}
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 14,
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden" }}>
            <Photo uri={photos[0]} fallback={ART[0]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink }}>3 nights · free stay</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>For 1 reel + 5 stories</Text>
          </View>
          <View style={{ backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.bone }}>Apply</Text>
          </View>
        </Animated.View>
      </Animated.View>
      <Headline delay={300} title={"Free stays.\nYou bring the content."} sub="Find boutique hotels, villas and retreats that want to host you." />
    </View>
  );
}

function Counter({ to, delay = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let id;
    const t = setTimeout(() => {
      id = setInterval(() => setN((v) => (v >= to ? (clearInterval(id), v) : v + 1)), 90);
    }, delay);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [to, delay]);
  return <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, fontVariant: ["tabular-nums"] }}>{n}</Text>;
}

function HostPayoff({ photos }) {
  const tileW = (W - 48 - 20) / 3;
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 28 }}>
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 24 }}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            entering={SlideInRight.delay(200 + i * 180).springify().damping(15)}
            style={{
              width: tileW,
              height: tileW * 1.75,
              borderRadius: 18,
              overflow: "hidden",
              marginTop: i === 1 ? 0 : 24,
              backgroundColor: colors.stone,
            }}
          >
            <Photo uri={photos[i + 1] ?? photos[i]} fallback={ART[i]} />
            <View style={{ position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Sparkles color="#fff" size={11} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: "#fff" }}>{["48K", "120K", "22K"][i]}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
      <Animated.View
        entering={FadeInUp.delay(800).duration(450)}
        style={{
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.surface,
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Counter to={12} delay={1000} />
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>creators applied{"\n"}to stay with you</Text>
      </Animated.View>
      <Headline delay={300} title={"Creators who'll film\nyour place."} sub="Swap a few nights for content that brings in bookings." />
    </View>
  );
}

/* ── Step 3: picks ─────────────────────────────────────────────────────── */

function Chip({ label, active, onPress, delay }) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const press = () => {
    s.value = withSequence(withTiming(0.9, { duration: 70 }), withSpring(1, { damping: 6, stiffness: 260 }));
    onPress();
  };
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(12)}>
     <Animated.View style={style}>
      <TouchableOpacity
        onPress={press}
        activeOpacity={0.9}
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: active ? colors.ink : colors.surface,
          borderWidth: 1,
          borderColor: active ? colors.ink : colors.stone,
        }}
      >
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: active ? colors.bone : colors.ink }}>{label}</Text>
      </TouchableOpacity>
     </Animated.View>
    </Animated.View>
  );
}

function PicksStep({ title, sub, options, picks, onToggle }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 32 }}>
      <Headline title={title} sub={sub} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, paddingHorizontal: 24 }}>
        {options.map((o, i) => (
          <Chip key={o} label={o} delay={150 + i * 50} active={picks.includes(o)} onPress={() => onToggle(o)} />
        ))}
      </View>
    </View>
  );
}

/* ── Step 4: the gift ──────────────────────────────────────────────────── */

function Phone({ uri, art, shot, rotate, x, y, delay, label }) {
  const w = Math.min(W * 0.42, 180);
  const f = useSharedValue(0);
  useEffect(() => {
    f.value = withDelay(delay + 600, withRepeat(withSequence(
      withTiming(-7, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
    ), -1));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: f.value }] }));
  return (
    <View style={{ position: "absolute", transform: [{ translateX: x }, { translateY: y }, { rotate: `${rotate}deg` }] }}>
     <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)}>
      <Animated.View
        style={[
          {
            width: w,
            height: w * 2.05,
            borderRadius: 30,
            backgroundColor: "#1C1C1E",
            padding: 6,
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 14 },
          },
          style,
        ]}
      >
        <View style={{ flex: 1, borderRadius: 25, overflow: "hidden", backgroundColor: colors.bone }}>
          {shot ? (
            <Image source={shot} style={{ flex: 1 }} contentFit="cover" contentPosition="top" />
          ) : (
          <>
          <View style={{ height: "62%" }}>
            <Photo uri={uri} fallback={art} />
          </View>
          <View style={{ padding: 10, gap: 5 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.ink }}>{label}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <MapPin color={colors.sage} size={9} />
              <View style={{ height: 5, width: "55%", borderRadius: 3, backgroundColor: colors.stone }} />
            </View>
            <View style={{ height: 5, width: "80%", borderRadius: 3, backgroundColor: colors.stone }} />
            <View style={{ marginTop: 6, alignSelf: "flex-start", backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.bone }}>View stay</Text>
            </View>
          </View>
          </>
          )}
          <View style={{ position: "absolute", top: 8, alignSelf: "center", width: 46, height: 14, borderRadius: 7, backgroundColor: "#1C1C1E" }} />
        </View>
      </Animated.View>
     </Animated.View>
    </View>
  );
}

function GiftStep({ photos, role }) {
  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <Animated.View entering={FadeIn.duration(400)} style={{ alignSelf: "center", backgroundColor: "#E4DED3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 18 }}>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>Collabnb Founding Access</Text>
      </Animated.View>
      <Headline
        delay={100}
        title={"Your first 30 days\nare on us"}
        sub={role === "host" ? "List your stay and start meeting creators." : "Browse every stay and apply to as many as you like."}
      />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Phone uri={photos[3] ?? photos[0]} art={ART[1]} shot={SHOTS[role === "host" ? "host" : "creator"][0]} rotate={-9} x={-W * 0.16} y={-6} delay={300} label="Cliffside Villa" />
        <Phone uri={photos[4] ?? photos[1]} art={ART[0]} shot={SHOTS[role === "host" ? "host" : "creator"][1]} rotate={7} x={W * 0.16} y={22} delay={450} label="Jungle Treehouse" />
      </View>
    </View>
  );
}
