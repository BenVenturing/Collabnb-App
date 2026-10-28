// Cards and grids. See COMPONENT-SPEC.md §5, §7, §8.

import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Heart, Lock } from "lucide-react-native";
import { colors, radii, shadows } from "@/config/theme";
import { Body, Display, EyebrowLabel } from "./Text";
import { Chip, RoundButton } from "./Chip";
import Glass from "../Glass";

// 2xN grid of value-over-label cells split by full-bleed hairlines.
// Collabs / Followers / Profile ER / Content ER, and the contract's
// LOCATION / DATES / PROPERTY / DELIVERABLES / PAYMENT / USAGE.
//
// Web renders an em-dash for an empty cell, never "0" and never blank —
// `value` of null is deliberately distinct from a real zero.
// `comingSoon` blurs a placeholder figure for stats we can't source yet.
export function StatGrid({ items, columns = 2, footer, eyebrowLabels = false, style }) {
  const rows = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));

  return (
    <Glass variant="card" style={style}>
      <View style={{ paddingVertical: 4 }}>
        {rows.map((row, r) => (
          <View
            key={r}
            style={{
              flexDirection: "row",
              borderTopWidth: r === 0 ? 0 : 1,
              borderTopColor: colors.hairline,
            }}
          >
            {row.map((item, c) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 20,
                  paddingHorizontal: columns >= 3 ? 6 : 12,
                  borderLeftWidth: c === 0 ? 0 : 1,
                  borderLeftColor: colors.hairline,
                }}
              >
                {eyebrowLabels ? (
                  <>
                    <EyebrowLabel
                      size={10}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={{ textAlign: "center" }}
                    >
                      {item.label}
                    </EyebrowLabel>
                    <Display size={17} style={{ marginTop: 6 }}>
                      {item.value ?? "—"}
                    </Display>
                  </>
                ) : (
                  <>
                    {item.comingSoon ? (
                      // Text-shadow blur: a soft smudge of a figure with no
                      // frosted box around it.
                      <Display
                        size={26}
                        color="transparent"
                        style={{ textShadowColor: "rgba(60,87,89,0.55)", textShadowRadius: 9, textShadowOffset: { width: 0, height: 0 } }}
                      >
                        {item.placeholder ?? "4.8%"}
                      </Display>
                    ) : (
                      <Display size={26}>{item.value ?? "—"}</Display>
                    )}
                    <Body size={13} color={colors.sage} style={{ marginTop: 4 }}>
                      {item.label}
                    </Body>
                  </>
                )}
              </View>
            ))}
            {/* Keep the last row aligned when it's short of a full set. */}
            {row.length < columns
              ? Array.from({ length: columns - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ flex: 1 }} />
                ))
              : null}
          </View>
        ))}
        {footer ? (
          <View style={{ alignItems: "center", paddingBottom: 14, paddingTop: 2 }}>
            {typeof footer === "string" ? (
              <Body size={12} color={colors.sage}>
                {footer}
              </Body>
            ) : (
              footer
            )}
          </View>
        ) : null}
      </View>
    </Glass>
  );
}

// Airbnb-style tile: one rounded cover photo, a few lines of small text
// underneath, no card chrome and no host. Used on Explore.
export function ListingTile({
  image,
  title,
  location,
  price,
  deliverables,
  featured = false,
  badge,
  saved = false,
  redacted = false,
  onPress,
  onToggleSave,
  width,
  style,
}) {
  const pill = badge || (featured ? "Featured" : null);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      <View style={{ aspectRatio: 1, borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.stone }}>
        <Image
          source={image ? { uri: image } : null}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          blurRadius={redacted ? 25 : 0}
          transition={150}
        />
        {redacted ? (
          <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }}>
            <Lock color={colors.surface} size={22} />
          </View>
        ) : null}
        {pill ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(255,255,255,0.92)",
              borderRadius: radii.pill,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Body size={11} weight="semibold">
              {pill}
            </Body>
          </View>
        ) : null}
        {onToggleSave ? (
          <Pressable onPress={onToggleSave} hitSlop={10} style={{ position: "absolute", top: 10, right: 10 }}>
            <Heart
              size={22}
              color={colors.surface}
              fill={saved ? colors.ink : "rgba(25,37,36,0.35)"}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={{ paddingTop: 8, gap: 1 }}>
        <Body size={14} weight="semibold" numberOfLines={1}>
          {redacted ? "Members-only stay" : title}
        </Body>
        {location ? (
          <Body size={13} color={colors.sage} numberOfLines={1}>
            {location}
          </Body>
        ) : null}
        {deliverables ? (
          <Body size={13} color={colors.sage} numberOfLines={1}>
            {deliverables}
          </Body>
        ) : null}
        {price ? (
          <Body size={13} weight="semibold" style={{ marginTop: 2 }}>
            {price}{" "}
            <Body size={13} color={colors.sage}>
              collab
            </Body>
          </Body>
        ) : null}
      </View>
    </Pressable>
  );
}

// The marketplace card. Image with overlays on top, near-opaque body below.
// Field order is web's, which differs from mobile's old card: title first,
// then location, then the price line — see COMPONENT-SPEC.md §7.
//
// `redacted` is the trial-ended state: the image blurs behind a lock and the
// listing's text dims, but the price stays legible because it's the hook that
// sells the subscription.
export function ListingCard({
  image,
  title,
  location,
  price,
  deliverables,
  dates,
  tag,
  authorName,
  authorAvatar,
  featured = false,
  badge,
  saved = false,
  redacted = false,
  onPress,
  onToggleSave,
  width,
  imageHeight = 200,
  style,
}) {
  const source = typeof image === "string" ? { uri: image } : image;
  const dim = redacted ? 0.35 : 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          overflow: "hidden",
          transform: [{ scale: pressed ? 0.99 : 1 }],
          ...shadows.md,
        },
        style,
      ]}
    >
      <View>
        {image ? (
          <Image
            source={source}
            style={{ width: "100%", height: imageHeight }}
            contentFit="cover"
            transition={200}
            blurRadius={redacted ? 18 : 0}
          />
        ) : null}

        {redacted ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(25,37,36,0.25)",
            }}
          >
            <Lock color={colors.surface} size={20} style={{ marginBottom: 6, opacity: 0.85 }} />
            <Body size={12} weight="semibold" color={colors.surface} style={{ opacity: 0.85 }}>
              Apply to view
            </Body>
          </View>
        ) : null}

        {featured ? (
          <Chip label="Featured" eyebrow style={{ position: "absolute", top: 12, left: 12 }} />
        ) : badge ? (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radii.pill,
              backgroundColor: "rgba(255,255,255,0.92)",
            }}
          >
            <Body size={11} weight="semibold" color={colors.sage}>
              {badge}
            </Body>
          </View>
        ) : null}

        <RoundButton onPress={onToggleSave} size={36} style={{ position: "absolute", top: 12, right: 12 }}>
          <Heart size={18} color={colors.ink} fill={saved ? colors.ink : "transparent"} />
        </RoundButton>
      </View>

      <View style={{ padding: 16, gap: 3 }}>
        <Display size={17} numberOfLines={2} style={{ opacity: dim }}>
          {title}
        </Display>
        {location ? (
          <Body size={14} color={colors.sage} numberOfLines={1} style={{ opacity: dim }}>
            {location}
          </Body>
        ) : null}
        {price ? (
          <Body size={15} weight="semibold" style={{ marginTop: 6 }}>
            {price}
          </Body>
        ) : null}

        {deliverables || dates || tag ? (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
            <View style={{ flex: 1, opacity: dim }}>
              {deliverables ? (
                <Body size={13} color={colors.sage}>
                  {deliverables}
                </Body>
              ) : null}
              {dates ? (
                <Body size={13} color={colors.sage}>
                  {dates}
                </Body>
              ) : null}
            </View>
            {tag ? <Chip label={tag} /> : null}
          </View>
        ) : null}

        {authorName ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.hairline,
              opacity: dim,
            }}
          >
            {authorAvatar ? (
              <Image
                source={typeof authorAvatar === "string" ? { uri: authorAvatar } : authorAvatar}
                style={{ width: 24, height: 24, borderRadius: 12 }}
                contentFit="cover"
              />
            ) : null}
            <Body size={13} color={colors.sage}>
              by <Body size={13} weight="semibold">{authorName}</Body>
            </Body>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// Bottom-sheet variant: thumbnail left, text stacked right. `active` is the
// map dock's selected-pin state; `redacted` matches ListingCard's trial gate.
export function CompactListRow({
  image,
  title,
  location,
  price,
  active = false,
  redacted = false,
  onPress,
  width,
  style,
}) {
  const dim = redacted ? 0.35 : 1;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          borderWidth: active ? 1.5 : 1,
          borderColor: active ? colors.ink : colors.hairline,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          ...shadows.sm,
        },
        style,
      ]}
    >
      {image ? (
        <View style={{ width: 56, height: 56, borderRadius: radii.sm, overflow: "hidden" }}>
          <Image
            source={typeof image === "string" ? { uri: image } : image}
            style={{ width: 56, height: 56 }}
            contentFit="cover"
            blurRadius={redacted ? 12 : 0}
          />
          {redacted ? (
            <View
              style={{
                position: "absolute",
                inset: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(25,37,36,0.3)",
              }}
            >
              <Lock color={colors.surface} size={14} />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Display size={16} numberOfLines={1} style={{ opacity: dim }}>
          {title}
        </Display>
        {location ? (
          <Body size={13} color={colors.sage} numberOfLines={1} style={{ opacity: dim }}>
            {location}
          </Body>
        ) : null}
        {price ? (
          <Body size={15} weight="semibold" style={{ marginTop: 2 }}>
            {price}
          </Body>
        ) : null}
      </View>
    </Pressable>
  );
}
