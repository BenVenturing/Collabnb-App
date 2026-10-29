import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { normalizeListing } from "@/utils/listingHelpers";
import { colors, fonts } from "@/config/theme";

const CYCLE_MS = 4200;
const FADE_MS = 450;

export default function SavedInspirationCard() {
  const router = useRouter();
  const all = useQuery(api.listings.getAll, {});
  const samples = useQuery(api.listings.getSamples);

  const listings = useMemo(() => {
    const published = (all || []).filter(
      (l) => l.status === "published" && (l.image || l.gallery_images?.length),
    );
    const seen = new Set(published.map((l) => String(l._id)));
    const fill = (samples || []).filter(
      (l) => (l.image || l.gallery_images?.length) && !seen.has(String(l._id)),
    );
    const pool = published.length >= 3 ? published : [...published, ...fill];
    return pool.slice(0, 10).map(normalizeListing);
  }, [all, samples]);

  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (listings.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % listings.length);
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      });
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [listings.length, opacity]);

  if (!listings.length) return null;
  const listing = listings[idx % listings.length];

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View style={{ opacity, width: 220 }}>
        <Pressable
          onPress={() => router.push({ pathname: "/listing-detail", params: { id: listing.id } })}
          style={{
            height: 150,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: colors.stone,
            shadowColor: "#192524",
            shadowOpacity: 0.16,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Image source={{ uri: listing.image }} style={{ position: "absolute", inset: 0 }} contentFit="cover" />
          <LinearGradient
            colors={["rgba(15,22,21,0)", "rgba(15,22,21,0.78)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }}
          />
          <View style={{ position: "absolute", left: 12, right: 12, bottom: 10 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.displaySemibold, fontSize: 15, color: "#fff" }}>
              {listing.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
              <MapPin size={11} color="rgba(255,255,255,0.85)" />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body, fontSize: 11.5, color: "rgba(255,255,255,0.9)" }}>
                {listing.location}
              </Text>
              {listing.compensation ? (
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11.5, color: "#fff" }}>{listing.compensation}</Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {listings.length > 1 && (
        <View style={{ flexDirection: "row", gap: 5, marginTop: 12 }}>
          {listings.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === idx ? 16 : 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: i === idx ? colors.ink : "rgba(25,37,36,0.18)",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
