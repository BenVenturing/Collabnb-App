// Long-press preview of an Explore tile, like iOS's peek: the page blurs and
// the card lifts into a larger version with a few more details. Tap outside to
// drop it, or "View stay" to open the full listing.

import { useEffect, useRef, useState } from "react";
import { Modal, View, Pressable, Animated, Dimensions, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Heart, MapPin, ArrowUpRight } from "lucide-react-native";
import * as haptic from "@/utils/haptics";
import { colors, radii, shadows } from "@/config/theme";
import { Body, Display, PhotoPager } from "@/components/ui";

const CARD_W = Dimensions.get("window").width - 48;
const PHOTO_H = CARD_W * 0.78;

function Tag({ label }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: "rgba(209,235,219,0.55)" }}>
      <Body size={12} weight="medium" color={colors.ink}>
        {label}
      </Body>
    </View>
  );
}

export default function ListingPeek({ listing, saved, onToggleSave, onOpen, onClose }) {
  const t = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(listing);

  useEffect(() => {
    if (listing) {
      setShown(listing);
      haptic.press();
      t.setValue(0);
      Animated.spring(t, { toValue: 1, damping: 16, stiffness: 220, mass: 0.8, useNativeDriver: true }).start();
    } else if (shown) {
      Animated.timing(t, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setShown(null));
    }
  }, [listing]);

  if (!shown) return null;
  const tags = [shown.property_type, shown.collab_type].filter(Boolean);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: t }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(25,37,36,0.18)" }]} />
        </Pressable>
      </Animated.View>

      <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            width: CARD_W,
            borderRadius: radii.lg + 6,
            backgroundColor: colors.surface,
            overflow: "hidden",
            ...shadows.lg,
            opacity: t,
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
          }}
        >
          <View>
            <PhotoPager images={shown.images} width={CARD_W} height={PHOTO_H} redacted={shown._redacted === true} onPress={onOpen} />
            <Pressable
              onPress={onToggleSave}
              hitSlop={10}
              style={{ position: "absolute", top: 12, right: 12 }}
            >
              <Heart size={24} color="#FFFFFF" fill={saved ? colors.ink : "rgba(25,37,36,0.35)"} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={{ padding: 16, gap: 8 }}>
            <Display size={20} numberOfLines={2}>
              {shown._redacted ? "Members-only stay" : shown.title}
            </Display>
            {shown.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MapPin size={14} color={colors.sage} />
                <Body size={13} color={colors.sage} numberOfLines={1} style={{ flex: 1 }}>
                  {shown.location}
                </Body>
              </View>
            ) : null}
            {tags.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {tags.map((l) => (
                  <Tag key={l} label={l} />
                ))}
              </View>
            ) : null}
            {shown.description && !shown._redacted ? (
              <Body size={13} color={colors.slate} numberOfLines={3}>
                {shown.description}
              </Body>
            ) : null}
            {shown.deliverables ? (
              <Body size={13} color={colors.slate} numberOfLines={1}>
                <Body size={13} weight="semibold">
                  Deliverables:{" "}
                </Body>
                {shown.deliverables}
              </Body>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
              <Body size={15} weight="semibold">
                {shown.compensation}{" "}
                <Body size={14} color={colors.sage}>
                  collab
                </Body>
              </Body>
              <Pressable
                onPress={onOpen}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: colors.ink,
                  borderRadius: radii.pill,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Body size={14} weight="semibold" color={colors.surface}>
                  View stay
                </Body>
                <ArrowUpRight size={16} color={colors.surface} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
