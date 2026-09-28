// Typography primitives. See COMPONENT-SPEC.md §1 and §6.
//
// These exist so tracking is never forgotten. Web tightens display type to
// -0.025em and opens small caps labels to +0.2em; RN needs those as absolute
// points, so every text style here computes letterSpacing from its own size.
// Screens should reach for these before styling a bare <Text>.

import { Text, View, Pressable } from "react-native";
import { colors, fonts, tracking, track, lineHeights } from "@/config/theme";

// Uppercase micro-label: WHERE, CREATOR TIER, WHAT YOU GET, LOCATION.
export function EyebrowLabel({ children, size = 11, color = colors.sage, style }) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.bodyMedium,
          fontSize: size,
          color,
          textTransform: "uppercase",
          letterSpacing: track(size, tracking.eyebrow),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// Display type — headings, titles, stat values. Always tracked in.
export function Display({ children, size = 20, color = colors.ink, weight = "bold", style, ...rest }) {
  return (
    <Text
      style={[
        {
          fontFamily: weight === "medium" ? fonts.displayMedium : fonts.display,
          fontSize: size,
          color,
          letterSpacing: track(size, tracking.display),
          lineHeight: size * lineHeights.display,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Body({ children, size = 14, color = colors.ink, weight = "regular", style, ...rest }) {
  const family =
    weight === "semibold" ? fonts.bodySemibold : weight === "medium" ? fonts.bodyMedium : fonts.body;
  return (
    <Text
      style={[
        { fontFamily: family, fontSize: size, color, lineHeight: size * lineHeights.body },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

// Bold title, optional underlined "see all" to its right, sage subtitle below.
// Trending Now / see all / "Top picks this week"
export function SectionHeading({ title, subtitle, actionLabel, onAction, size = 22, style }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Display size={size}>{title}</Display>
        {actionLabel ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Body size={13} color={colors.ink} style={{ textDecorationLine: "underline" }}>
              {actionLabel}
            </Body>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? (
        <Body size={14} color={colors.sage} style={{ marginTop: 2 }}>
          {subtitle}
        </Body>
      ) : null}
    </View>
  );
}
