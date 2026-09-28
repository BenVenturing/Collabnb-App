// Mint chip and pill buttons. See COMPONENT-SPEC.md §2, §10, §11.

import { Pressable, View, ActivityIndicator } from "react-native";
import { colors, radii } from "@/config/theme";
import { Body, EyebrowLabel } from "./Text";

// Mint-tinted pill. `active` inverts to ink-on-bone, mirroring web's
// .chip.active. `eyebrow` switches the label to tracked uppercase for stat
// pills (12 CREATORS) as opposed to content tags (UGC Video).
export function Chip({
  label,
  active = false,
  eyebrow = false,
  icon = null,
  onPress,
  style,
}) {
  const body = (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: radii.pill,
          borderWidth: 1,
          backgroundColor: active ? colors.ink : "rgba(209,235,219,0.55)",
          borderColor: active ? colors.ink : colors.hairline,
        },
        style,
      ]}
    >
      {icon}
      {eyebrow ? (
        <EyebrowLabel size={11} color={active ? colors.bone : colors.ink}>
          {label}
        </EyebrowLabel>
      ) : (
        <Body size={13} weight="medium" color={active ? colors.bone : colors.ink}>
          {label}
        </Body>
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {body}
    </Pressable>
  );
}

// Primary action. Web: ink fill, white label, scale(0.97) on press.
export function PillButton({
  label,
  onPress,
  variant = "dark",
  icon = null,
  iconRight = null,
  loading = false,
  disabled = false,
  style,
}) {
  const dark = variant === "dark";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 22,
          paddingVertical: 14,
          borderRadius: radii.pill,
          backgroundColor: dark ? colors.ink : "rgba(255,255,255,0.65)",
          borderWidth: dark ? 0 : 1,
          borderColor: "rgba(255,255,255,0.6)",
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={dark ? colors.surface : colors.ink} size="small" />
      ) : (
        <>
          {icon}
          <Body size={15} weight="semibold" color={dark ? colors.surface : colors.ink}>
            {label}
          </Body>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

// Circular icon button — the heart on listing images, the search submit.
export function RoundButton({ children, onPress, size = 40, tone = "surface", style }) {
  const dark = tone === "ink";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: dark ? colors.ink : colors.surface,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
