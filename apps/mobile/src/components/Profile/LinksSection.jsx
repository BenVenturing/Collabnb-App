import { View, Pressable, Linking } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { colors, radii } from "@/config/theme";
import { Body, SectionHeading, Glass } from "@/components/ui";

// Web renders each link as its own glass row in a gapped column — not as one
// divided card — so the list reads as a stack of tappable things.
function SocialRow({ icon: Icon, label, value, url }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      <Glass
        variant="regular"
        style={{ borderRadius: radii.md }}
        contentStyle={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.mint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon color={colors.slate} size={20} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Body size={14} weight="semibold">
            {label}
          </Body>
          <Body size={12} color={colors.sage} numberOfLines={1}>
            {value}
          </Body>
        </View>
        <ArrowUpRight color={colors.stone} size={18} />
      </Glass>
    </Pressable>
  );
}

export default function LinksSection({ personalLink, socialLinks }) {
  const rows = [
    ...(personalLink
      ? [
          {
            key: "personal",
            icon: personalLink.icon,
            label: personalLink.title,
            value: personalLink.url,
            url: personalLink.url,
          },
        ]
      : []),
    ...socialLinks.map((l) => ({
      key: l.platform,
      icon: l.icon,
      label: l.platform,
      value: l.username,
      url: l.url,
    })),
  ];

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
      <SectionHeading size={18} title="Links & Socials" />
      <View style={{ gap: 10 }}>
        {rows.map(({ key, ...row }) => (
          <SocialRow key={key} {...row} />
        ))}
      </View>
    </View>
  );
}
