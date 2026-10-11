// Screen chrome: sticky bars, sheets, headers, bubbles.
// See COMPONENT-SPEC.md §12, §13, §18, §19.

import { View, Image, ScrollView, Animated } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows } from "@/config/theme";
import { Body, Display, EyebrowLabel } from "./Text";
import { Chip, PillButton } from "./Chip";
import AtmosphericBackground from "../AtmosphericBackground";

// Pinned above the tab bar on listing detail: price + sub-line, then the CTA.
// Opaque so content scrolls cleanly beneath it.
//
// `price`/`caption` are omitted for the host's own listing, where the bar is a
// single full-width action rather than a price-plus-CTA split.
export function StickyActionBar({
  price,
  caption,
  actionLabel,
  actionIcon,
  onAction,
  loading,
  disabled,
  style,
}) {
  const split = price != null;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 14,
          backgroundColor: colors.bone,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
        },
        style,
      ]}
    >
      {split ? (
        <View style={{ flexShrink: 1 }}>
          <Display size={20}>{price}</Display>
          {caption ? (
            <Body size={13} color={colors.sage} numberOfLines={1}>
              {caption}
            </Body>
          ) : null}
        </View>
      ) : null}
      <PillButton
        label={actionLabel}
        iconRight={actionIcon}
        onPress={onAction}
        loading={loading}
        disabled={disabled}
        style={split ? { flex: 1, maxWidth: 200 } : { flex: 1 }}
      />
    </View>
  );
}


// Rounded top corners, centred drag handle, opaque bone. Sits over the map.
export function BottomSheet({ title, children, horizontal = true, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bone,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingTop: 10,
          paddingBottom: insets.bottom,
          ...shadows.lg,
        },
        style,
      ]}
    >
      <View
        style={{
          alignSelf: "center",
          width: 44,
          height: 5,
          borderRadius: radii.pill,
          backgroundColor: colors.stone,
          marginBottom: 12,
        }}
      />
      {title ? (
        <Body size={15} weight="semibold" style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          {title}
        </Body>
      ) : null}
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 14 }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 12 }}>{children}</View>
      )}
    </View>
  );
}

// Hero media bleeding to the top edge, avatar overlapping its lower-left edge,
// then centred name, membership chip, @handle • location, and an action row.
// Static image by design — video autoplay costs battery on every profile view.
//
// The hero fades into the page rather than ending on a hard line: web lays a
// bone gradient over its lower half so the banner dissolves into the canvas.
// Its no-banner fallback is a dark green gradient; ink → slate is the palette's
// nearest pair and reads the same.
export function ProfileHeader({
  hero,
  avatar,
  name,
  badgeLabel,
  handle,
  location,
  action,
  topRight,
  heroHeight = 260,
  scrollY,
  style,
}) {
  const insets = useSafeAreaInsets();

  // Pass scrollY to recede the banner as the page scrolls: it lifts at roughly
  // a third of the content's speed and grows on over-pull. Scale never drops
  // below 1, so the image can't pull away from the edges and expose the
  // gradient beneath it.
  const heroMotion = scrollY
    ? {
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [-heroHeight, 0, heroHeight],
              outputRange: [heroHeight / 2, 0, heroHeight * 0.35],
              extrapolate: "clamp",
            }),
          },
          {
            scale: scrollY.interpolate({
              inputRange: [-heroHeight, 0],
              outputRange: [1.5, 1],
              extrapolate: "clamp",
            }),
          },
        ],
      }
    : null;

  return (
    <View style={style}>
      <View style={{ height: heroHeight }}>
        {/* Clips the banner's own motion. It can't sit on the outer view: the
            avatar hangs past the bottom edge and would be cut in half. */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          <Animated.View style={[{ flex: 1 }, heroMotion]}>
            <LinearGradient
              colors={[colors.ink, colors.slate]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", inset: 0 }}
            />
            {hero ? (
              <ExpoImage
                source={hero}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                // Matches web's `objectPosition: top center`. Centre-cropping a
                // wide banner into this strip cuts the subject out of it.
                contentPosition="top center"
                transition={200}
              />
            ) : null}
          </Animated.View>
        </View>
        <LinearGradient
          colors={["transparent", "rgba(239,236,233,0.55)", colors.bone]}
          locations={[0, 0.55, 1]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: heroHeight * 0.45 }}
        />

        {topRight ? (
          <View style={{ position: "absolute", top: insets.top + 12, right: 20 }}>{topRight}</View>
        ) : null}

        {avatar ? (
          <Image
            source={avatar}
            style={{
              position: "absolute",
              bottom: -20,
              left: 24,
              width: 104,
              height: 104,
              borderRadius: 52,
              borderWidth: 4,
              borderColor: colors.surface,
              ...shadows.md,
            }}
          />
        ) : null}
      </View>

      <View style={{ alignItems: "center", paddingTop: 44, paddingHorizontal: 24 }}>
        <Display size={28} style={{ textAlign: "center" }}>
          {name}
        </Display>

        {badgeLabel ? <Chip label={badgeLabel} eyebrow style={{ marginTop: 10 }} /> : null}

        {handle || location ? (
          <Body size={14} color={colors.sage} style={{ marginTop: 10, textAlign: "center" }}>
            {handle}
            {handle && location ? "  " : null}
            {location ? (
              <Body size={14} color={colors.slate}>
                · {location}
              </Body>
            ) : null}
          </Body>
        ) : null}

        {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
      </View>
    </View>
  );
}


// Own messages are slate-filled with white text and an inset timestamp.
export function MessageBubble({ children, timestamp, own = true, style }) {
  return (
    <View
      style={[
        {
          maxWidth: "82%",
          alignSelf: own ? "flex-end" : "flex-start",
          backgroundColor: own ? colors.slate : colors.surface,
          borderRadius: radii.lg,
          padding: 16,
          gap: 6,
        },
        style,
      ]}
    >
      <Body size={15} color={own ? colors.surface : colors.ink}>
        {children}
      </Body>
      {timestamp ? (
        <Body
          size={11}
          color={own ? "rgba(255,255,255,0.7)" : colors.sage}
          style={{ alignSelf: "flex-end" }}
        >
          {timestamp}
        </Body>
      ) : null}
    </View>
  );
}

// Heavy blur over the current screen, nav stacked large and centred.
export function MenuOverlay({ items = [], footer, style }) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={60}
      tint="light"
      style={[
        { flex: 1, paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 },
        style,
      ]}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 34 }}>
        {items.map((item) => (
          <Display key={item.label} size={30} onPress={item.onPress} suppressHighlighting>
            {item.label}
          </Display>
        ))}
        {footer ? <View style={{ marginTop: 16 }}>{footer}</View> : null}
      </View>
    </BlurView>
  );
}

// Branded full-screen loading state. See COMPONENT-SPEC.md §16.
//
// This exists because the app's two startup gates — <ClerkLoaded> in the root
// layout and the role check in app/index.jsx — both used to render null, so a
// cold launch showed plain white for as long as Clerk took to resolve. That
// reads as "broken", not "loading". A spinner alone would still read as
// unbranded, so web uses the mark over tracked LOADING… on the atmosphere.
export function LoadingScreen({ label = "Loading" }) {
  return (
    <AtmosphericBackground style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Image
        source={require("../../../assets/images/collabnb-logo.png")}
        style={{ width: 72, height: 72, marginBottom: 20 }}
        resizeMode="contain"
      />
      <EyebrowLabel size={12}>{`${label}…`}</EyebrowLabel>
    </AtmosphericBackground>
  );
}
