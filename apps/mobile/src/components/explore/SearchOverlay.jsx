// Airbnb-style search: tapping "Start your search" opens stacked Where / When /
// What cards. One card is open at a time; the others collapse to a summary row.
// Scrolling the Where suggestions grows that card to fill the screen and tucks
// the other two away, like Airbnb's destination picker.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Search } from "lucide-react-native";
import * as haptic from "@/utils/haptics";
import { colors, fonts, radii, shadows } from "@/config/theme";
import { Body, Display, Chip } from "@/components/ui";
import { BlurView } from "expo-blur";
import PlaceIcon, { FlexiblePin } from "./PlaceIcon";
import { COUNTRY_ICONS } from "@/config/places";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

const ease = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));

export const WHEN_OPTIONS = ["Any time", "This month", "Next month", "Next 3 months", "Next 6 months"];
export const WHAT_OPTIONS = ["UGC Video", "Instagram Reels", "TikTok", "Photography", "YouTube Vlog", "Blog Post", "Full Package"];

const POPULAR = ["France", "Italy", "Japan", "Thailand", "Greece", "Egypt", "Australia", "Mexico"];

function Card({ children, style }) {
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radii.xl, marginHorizontal: 16, ...shadows.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function CollapsedRow({ label, value, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 18 }}>
        <Body size={14} color={colors.sage}>
          {label}
        </Body>
        <Body size={14} weight="semibold">
          {value}
        </Body>
      </Card>
    </Pressable>
  );
}

export default function SearchOverlay({ visible, onClose, listings = [], initial, onApply }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState("where");
  const [whereFull, setWhereFull] = useState(false);
  const [where, setWhere] = useState(initial?.where ?? "");
  const [when, setWhen] = useState(initial?.when ?? "");
  const [what, setWhat] = useState(initial?.what ?? null);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setOpen("where");
    setWhereFull(false);
    setWhere(initial?.where ?? "");
    setWhen(initial?.when ?? "");
    setWhat(initial?.what ?? null);
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 170, useNativeDriver: true }).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Distinct locations from the catalogue, busiest first, filtered by the query.
  const places = useMemo(() => {
    const counts = new Map();
    for (const l of listings) {
      if (!l.location) continue;
      counts.set(l.location, (counts.get(l.location) ?? 0) + 1);
    }
    const q = where.trim().toLowerCase();
    return [...counts.entries()]
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [listings, where]);

  const countries = useMemo(() => {
    const q = where.trim().toLowerCase();
    const list = q
      ? COUNTRY_ICONS.filter((c) => [c.name, ...(c.aliases ?? [])].some((n) => n.toLowerCase().includes(q)))
      : POPULAR.map((n) => COUNTRY_ICONS.find((c) => c.name === n));
    return list.slice(0, q ? 12 : 8);
  }, [where]);

  const switchTo = (key) => {
    haptic.select();
    ease();
    setWhereFull(false);
    setOpen(key);
  };

  const growWhere = (e) => {
    if (!whereFull && e.nativeEvent.contentOffset.y > 8) {
      ease();
      setWhereFull(true);
    }
  };

  const pickPlace = (name) => {
    haptic.select();
    setWhere(name);
    switchTo("when");
  };

  const clearAll = () => {
    haptic.tap();
    ease();
    setWhere("");
    setWhen("");
    setWhat(null);
    setWhereFull(false);
    setOpen("where");
  };

  const apply = () => {
    haptic.tap();
    onApply?.({ where, when, what });
    onClose();
  };

  const rise = (i) => ({
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-30 - i * 12, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
  });

  const showOthers = !(open === "where" && whereFull);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/* Explore stays visible behind a heavy frost, like Airbnb's search. */}
      <BlurView intensity={55} tint="light" style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(239,236,233,0.45)" }} />
        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel="Close search"
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.hairline }}
          >
            <X color={colors.ink} size={18} />
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: 12 }}>
          {/* Where */}
          <Animated.View style={[rise(0), open === "where" && whereFull ? { flex: 1 } : null]}>
            {open === "where" ? (
              <Card style={[{ paddingTop: 22 }, whereFull ? { flex: 1 } : { maxHeight: 420 }]}>
                <Display size={24} style={{ paddingHorizontal: 20, marginBottom: 14 }}>
                  Where to?
                </Display>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginHorizontal: 20,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: radii.md,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 8,
                  }}
                >
                  <Search color={colors.ink} size={17} style={{ marginRight: 10 }} />
                  <TextInput
                    value={where}
                    onChangeText={setWhere}
                    onFocus={() => {
                      if (!whereFull) {
                        ease();
                        setWhereFull(true);
                      }
                    }}
                    placeholder="Search destinations"
                    placeholderTextColor={colors.sage}
                    returnKeyType="search"
                    onSubmitEditing={() => switchTo("when")}
                    style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
                  />
                  {where ? (
                    <Pressable onPress={() => setWhere("")} hitSlop={8}>
                      <X color={colors.sage} size={16} />
                    </Pressable>
                  ) : null}
                </View>
                <ScrollView
                  onScroll={growWhere}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
                >
                  {!where ? (
                    <PlaceRow icon={<FlexiblePin />} name="I'm flexible" sub="Every stay, anywhere" onPress={() => pickPlace("")} />
                  ) : null}
                  {places.map((p, i) => (
                    <PlaceRow
                      key={p.name}
                      icon={<PlaceIcon location={p.name} index={i} />}
                      name={p.name}
                      sub={`${p.count} collab${p.count === 1 ? "" : "s"}`}
                      onPress={() => pickPlace(p.name)}
                    />
                  ))}
                  {countries.length > 0 ? (
                    <Body size={11} weight="semibold" color={colors.sage} style={{ marginTop: 10, marginBottom: 2, letterSpacing: 0.8 }}>
                      {where ? "COUNTRIES" : "POPULAR DESTINATIONS"}
                    </Body>
                  ) : null}
                  {countries.map((c, i) => (
                    <PlaceRow key={c.name} icon={<PlaceIcon icon={c.icon} index={i} />} name={c.name} sub="Explore stays" onPress={() => pickPlace(c.name)} />
                  ))}
                  {where && places.length === 0 && countries.length === 0 ? (
                    <Body size={13} color={colors.sage} style={{ paddingVertical: 12 }}>
                      No stays there yet
                    </Body>
                  ) : null}
                </ScrollView>
              </Card>
            ) : (
              <CollapsedRow label="Where" value={where || "I'm flexible"} onPress={() => switchTo("where")} />
            )}
          </Animated.View>

          {showOthers ? (
            <>
              {/* When */}
              <Animated.View style={rise(1)}>
                {open === "when" ? (
                  <Card style={{ padding: 20 }}>
                    <Display size={24} style={{ marginBottom: 14 }}>
                      When?
                    </Display>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {WHEN_OPTIONS.map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          active={(when || "Any time") === opt}
                          onPress={() => {
                            setWhen(opt === "Any time" ? "" : opt);
                            switchTo("what");
                          }}
                        />
                      ))}
                    </View>
                  </Card>
                ) : (
                  <CollapsedRow label="When" value={when || "Any time"} onPress={() => switchTo("when")} />
                )}
              </Animated.View>

              {/* What */}
              <Animated.View style={rise(2)}>
                {open === "what" ? (
                  <Card style={{ padding: 20 }}>
                    <Display size={24} style={{ marginBottom: 14 }}>
                      What kind of collab?
                    </Display>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {WHAT_OPTIONS.map((opt) => (
                        <Chip key={opt} label={opt} active={what === opt} onPress={() => setWhat(what === opt ? null : opt)} />
                      ))}
                    </View>
                  </Card>
                ) : (
                  <CollapsedRow label="What" value={what || "Any type"} onPress={() => switchTo("what")} />
                )}
              </Animated.View>
            </>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: insets.bottom + 12,
            backgroundColor: "transparent",
          }}
        >
          <Pressable onPress={clearAll} hitSlop={8}>
            <Body size={15} weight="semibold" style={{ textDecorationLine: "underline" }}>
              Clear all
            </Body>
          </Pressable>
          <Pressable
            onPress={apply}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.ink,
              borderRadius: radii.md,
              paddingHorizontal: 22,
              paddingVertical: 13,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Search color={colors.surface} size={17} />
            <Body size={15} weight="semibold" color={colors.surface}>
              Search
            </Body>
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
}

function PlaceRow({ icon, name, sub, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.bone, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Body size={15} weight="medium" numberOfLines={1}>
          {name}
        </Body>
        <Body size={13} color={colors.sage}>
          {sub}
        </Body>
      </View>
    </Pressable>
  );
}
