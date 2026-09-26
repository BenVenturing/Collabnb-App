import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MapPin } from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

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
      <View
        style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}
      >
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 12,
            color: colors.sage,
            marginBottom: 8,
          }}
        >
          Step 1 of 3
        </Text>
        <View
          style={{
            height: 4,
            backgroundColor: colors.stone,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: "33.33%",
              height: "100%",
              backgroundColor: colors.ink,
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              letterSpacing: track(28, tracking.display),
              marginBottom: 8,
            }}
          >
            Preview your listing
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.sage, lineHeight: 24 }}>
            Review imported property details
          </Text>
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
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
                  Image {index + 1}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Listing Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: colors.bone,
              borderWidth: 1,
              borderColor: colors.stone,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.ink,
                letterSpacing: track(20, tracking.display),
                marginBottom: 12,
              }}
            >
              {placeholderListing.title}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MapPin size={16} color={colors.sage} style={{ marginRight: 6 }} />
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.sage }}>
                {placeholderListing.location}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.slate,
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {placeholderListing.description}
            </Text>

            <View
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.stone,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage }}>
                {placeholderListing.images} images imported
              </Text>
            </View>
          </View>
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
          borderTopColor: colors.stone,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/host-onboarding/host-profile")}
          style={{
            backgroundColor: colors.ink,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, color: colors.surface, fontSize: 16 }}>
            Confirm & Continue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.sage, fontSize: 16 }}>
            Back to edit
          </Text>
        </TouchableOpacity>
      </View>
    </AtmosphericBackground>
  );
}
