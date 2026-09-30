import { View, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MapPin } from "lucide-react-native";
import { AtmosphericBackground, Display, Body, PillButton, Glass } from "@/components/ui";
import { colors } from "@/config/theme";

export default function AirbnbPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [autoSync, setAutoSync] = useState(false);

  // Placeholder data (would come from scraping in real implementation)
  const placeholderListing = {
    title: "Modern Beach House",
    location: "Malibu, California",
    description: "Stunning oceanfront property with panoramic views...",
    images: 5,
  };

  return (
    <AtmosphericBackground style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Progress Bar */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
        <Body size={12} weight="medium" color={colors.sage} style={{ marginBottom: 8 }}>
          Step 1 of 3
        </Body>
        <View style={{ height: 4, backgroundColor: colors.stone, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: "33.33%", height: "100%", backgroundColor: colors.ink }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
          <Display size={28} style={{ marginBottom: 8 }}>Preview your listing</Display>
          <Body size={16} color={colors.sage} style={{ lineHeight: 24 }}>
            Review imported property details
          </Body>
        </View>

        {/* Image Carousel Placeholder */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 12 }}
          >
            {[1, 2, 3, 4, 5].map((_, index) => (
              <View
                key={index}
                style={{
                  width: 280,
                  height: 200,
                  borderRadius: 16,
                  backgroundColor: colors.stone,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Body size={14} color={colors.sage}>
                  Image {index + 1}
                </Body>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Listing Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Glass variant="card" contentStyle={{ padding: 20 }}>
            <Display size={20} style={{ marginBottom: 12 }}>{placeholderListing.title}</Display>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <MapPin size={16} color={colors.sage} style={{ marginRight: 6 }} />
              <Body size={15} color={colors.sage}>{placeholderListing.location}</Body>
            </View>

            <Body size={15} color={colors.slate} style={{ lineHeight: 22, marginBottom: 16 }}>
              {placeholderListing.description}
            </Body>

            <View
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.hairline,
                alignSelf: "flex-start",
              }}
            >
              <Body size={13} color={colors.sage}>{placeholderListing.images} images imported</Body>
            </View>
          </Glass>
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <PillButton
          label="Confirm & Continue"
          onPress={() => router.push("/host-onboarding/host-profile")}
          style={{ alignSelf: "stretch", marginBottom: 12 }}
        />
        <TouchableOpacity onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: 8 }}>
          <Body size={16} color={colors.sage}>Back to edit</Body>
        </TouchableOpacity>
      </View>
    </AtmosphericBackground>
  );
}
