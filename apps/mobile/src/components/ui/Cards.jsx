// Cards and grids. See COMPONENT-SPEC.md §5, §7, §8.

import { View, Image, Pressable } from "react-native";
import { Heart } from "lucide-react-native";
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
                  paddingHorizontal: 12,
                  borderLeftWidth: c === 0 ? 0 : 1,
                  borderLeftColor: colors.hairline,
                }}
              >
                {eyebrowLabels ? (
                  <>
                    <EyebrowLabel size={10}>{item.label}</EyebrowLabel>
                    <Display size={17} style={{ marginTop: 6 }}>
                      {item.value ?? "—"}
                    </Display>
                  </>
                ) : (
                  <>
                    <Display size={26}>{item.value ?? "—"}</Display>
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
            <Body size={12} color={colors.sage}>
              {footer}
            </Body>
          </View>
        ) : null}
      </View>
    </Glass>
  );
}

// The marketplace card. Image with overlays on top, near-opaque body below.
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
  saved = false,
  onPress,
  onToggleSave,
  width,
  style,
}) {
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
        {image ? <Image source={image} style={{ width: "100%", height: 200 }} resizeMode="cover" /> : null}
        {featured ? (
          <Chip label="Featured" eyebrow style={{ position: "absolute", top: 12, left: 12 }} />
        ) : null}
        <RoundButton onPress={onToggleSave} size={36} style={{ position: "absolute", top: 12, right: 12 }}>
          <Heart
            size={18}
            color={colors.ink}
            fill={saved ? colors.ink : "transparent"}
          />
        </RoundButton>
      </View>

      <View style={{ padding: 16, gap: 3 }}>
        <Display size={17}>{title}</Display>
        {location ? (
          <Body size={14} color={colors.sage}>
            {location}
          </Body>
        ) : null}
        {price ? (
          <Body size={15} weight="semibold" style={{ marginTop: 6 }}>
            {price}
          </Body>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <View style={{ flex: 1 }}>
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
            }}
          >
            {authorAvatar ? (
              <Image source={authorAvatar} style={{ width: 24, height: 24, borderRadius: 12 }} />
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

// Bottom-sheet variant: thumbnail left, text stacked right.
export function CompactListRow({ image, title, location, price, onPress, width, style }) {
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
          transform: [{ scale: pressed ? 0.99 : 1 }],
          ...shadows.sm,
        },
        style,
      ]}
    >
      {image ? <Image source={image} style={{ width: 56, height: 56, borderRadius: radii.sm }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Display size={16} numberOfLines={1}>
          {title}
        </Display>
        {location ? (
          <Body size={13} color={colors.sage} numberOfLines={1}>
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
