// Inputs and controls. See COMPONENT-SPEC.md §9, §14, §15.

import { View, TextInput, Pressable } from "react-native";
import { Search } from "lucide-react-native";
import { colors, fonts, radii } from "@/config/theme";
import { Body, EyebrowLabel } from "./Text";
import { RoundButton } from "./Chip";
import Glass from "../Glass";

// Tracked uppercase label over a rounded input. Used throughout Build Contract.
export function FormField({ label, value, onChangeText, placeholder, style, ...rest }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <EyebrowLabel>{label}</EyebrowLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.sage}
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.ink,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: "rgba(255,255,255,0.5)",
        }}
        {...rest}
      />
    </View>
  );
}

// One glass pill split into tap targets by vertical hairlines, with a circular
// ink submit on the end. Web splits it WHERE / WHAT / WHEN.
export function SearchBar({ segments = [], onSubmit, style }) {
  return (
    <Glass variant="small" style={style} contentStyle={{ flexDirection: "row", alignItems: "center" }}>
      {segments.map((seg, i) => (
        <Pressable
          key={seg.label}
          onPress={seg.onPress}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: colors.hairline,
          }}
        >
          <EyebrowLabel size={10}>{seg.label}</EyebrowLabel>
          <Body
            size={14}
            color={seg.value ? colors.ink : colors.sage}
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {seg.value || seg.placeholder}
          </Body>
        </Pressable>
      ))}
      <RoundButton onPress={onSubmit} tone="ink" size={44} style={{ margin: 6 }}>
        <Search size={18} color={colors.surface} />
      </RoundButton>
    </Glass>
  );
}

// Pill track, active segment filled ink. Earnings | Applications.
export function SegmentedToggle({ options = [], value, onChange, style }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          padding: 4,
          borderRadius: radii.pill,
          backgroundColor: "rgba(255,255,255,0.6)",
          borderWidth: 1,
          borderColor: colors.hairline,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange?.(opt.value)}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: radii.pill,
              backgroundColor: active ? colors.ink : "transparent",
            }}
          >
            <Body size={14} weight="semibold" color={active ? colors.surface : colors.ink}>
              {opt.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}
