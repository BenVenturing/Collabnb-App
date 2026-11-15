import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Instagram, Camera, Youtube, MapPin } from "lucide-react-native";
import { colors, radii, shadows } from "@/config/theme";
import { Chip, Body, Display, EyebrowLabel } from "@/components/ui";

const COLLAB_CARD_WIDTH = 220;

export function buildSocialLinks(profile) {
  const links = [];
  if (profile.instagram_handle) {
    links.push({
      platform: "Instagram",
      username: `@${profile.instagram_handle.replace(/^@/, "")}`,
      url: `https://instagram.com/${profile.instagram_handle.replace(/^@/, "")}`,
      icon: Instagram,
    });
  }
  if (profile.tiktok_handle) {
    links.push({
      platform: "TikTok",
      username: `@${profile.tiktok_handle.replace(/^@/, "")}`,
      url: `https://tiktok.com/@${profile.tiktok_handle.replace(/^@/, "")}`,
      icon: Camera,
    });
  }
  if (profile.youtube_handle) {
    links.push({
      platform: "YouTube",
      username: `@${profile.youtube_handle.replace(/^@/, "")}`,
      url: `https://youtube.com/@${profile.youtube_handle.replace(/^@/, "")}`,
      icon: Youtube,
    });
  }
  return links;
}

// Web's own past-collab card, not the marketplace ListingCard: shorter image
// with the location burnt into a bottom scrim, then name, dates, status.
//
// Status is a plain mint chip. Web tints it amber/blue/green per stage, but
// those values aren't in the palette yet — see COMPONENT-SPEC.md §3.
export function PastCollabCard({ collab, sample = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: COLLAB_CARD_WIDTH,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...shadows.sm,
      })}
    >
      <View style={{ height: 140, backgroundColor: colors.stone }}>
        {collab.image ? (
          <Image
            source={{ uri: collab.image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            blurRadius={sample ? 4 : 0}
          />
        ) : null}
        <LinearGradient
          colors={["transparent", "rgba(25,37,36,0.45)"]}
          locations={[0.45, 1]}
          style={{ position: "absolute", inset: 0 }}
        />
        {sample ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(25,37,36,0.65)",
              borderRadius: 4,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <EyebrowLabel size={9} color={colors.bone}>
              Sample
            </EyebrowLabel>
          </View>
        ) : null}
        {collab.location ? (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              right: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MapPin size={11} color="rgba(239,236,233,0.9)" />
            <Body size={11} weight="medium" color="rgba(239,236,233,0.9)" numberOfLines={1}>
              {collab.location}
            </Body>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14, gap: 4 }}>
        <Display size={14} numberOfLines={2}>
          {collab.property_name || "Collab"}
        </Display>
        {collab.dates ? (
          <Body size={11} color={colors.sage}>
            {collab.dates}
          </Body>
        ) : null}
        <Chip
          label={collab.status_text || collab.status}
          style={{ alignSelf: "flex-start", marginTop: 4, paddingVertical: 4 }}
        />
      </View>
    </Pressable>
  );
}
