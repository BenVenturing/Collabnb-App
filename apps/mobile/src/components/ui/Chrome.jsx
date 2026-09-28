// Screen chrome: sticky bars, sheets, headers, bubbles.
// See COMPONENT-SPEC.md §12, §13, §18, §19.

import { View, Image, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows } from "@/config/theme";
import { Body, Display } from "./Text";
import { Chip, PillButton } from "./Chip";

// Pinned above the tab bar on listing detail: price + sub-line, then the CTA.
// Opaque so content scrolls cleanly beneath it.
export function StickyActionBar({ price, caption, actionLabel, onAction, loading, style }) {
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
      <View style={{ flexShrink: 1 }}>
        <Display size={20}>{price}</Display>
        {caption ? (
          <Body size={13} color={colors.sage}>
            {caption}
          </Body>
        ) : null}
      </View>
      <PillButton label={actionLabel} onPress={onAction} loading={loading} style={{ flex: 1, maxWidth: 200 }} />
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

// Hero media bleeding to the top edge, avatar overlapping its lower edge,
// then centred name, membership chip, and @handle • location.
// Static image by design — video autoplay costs battery on every profile view.
export function ProfileHeader({ hero, avatar, name, badgeLabel, handle, location, action, style }) {
  return (
    <View style={style}>
      <View style={{ height: 210, backgroundColor: colors.slate }}>
        {hero ? <Image source={hero} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
      </View>

      <View style={{ alignItems: "center", marginTop: -52, paddingHorizontal: 24 }}>
        {avatar ? (
          <Image
            source={avatar}
            style={{
              width: 104,
              height: 104,
              borderRadius: 52,
              borderWidth: 4,
              borderColor: colors.surface,
            }}
          />
        ) : null}

        <Display size={28} style={{ marginTop: 14, textAlign: "center" }}>
          {name}
        </Display>

        {badgeLabel ? <Chip label={badgeLabel} eyebrow style={{ marginTop: 10 }} /> : null}

        {(handle || location) ? (
          <Body size={14} color={colors.sage} style={{ marginTop: 10, textAlign: "center" }}>
            {[handle, location].filter(Boolean).join("  •  ")}
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
