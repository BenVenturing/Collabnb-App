// Creator Onboarding — Step 4: Review & Submit
// Collabnb Design System

import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import {
  CheckCircle,
  ChevronLeft,
  Instagram,
  Music,
  Youtube,
  Image as ImageIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";

export default function CreatorSubmitApplicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    profilePhoto,
    displayName,
    username,
    instagramUrl,
    tiktokUrl,
    youtubeUrl,
    portfolioItems,
    updateField,
    loadDraft,
  } = useCreatorOnboardingStore();

  useEffect(() => {
    loadDraft();
  }, []);

  const handleSubmit = () => {
    // Mark as pending in the store (persisted to AsyncStorage)
    updateField("creatorApprovalStatus", "pending");
    setIsSubmitted(true);
  };

  const handleReturnToBrowse = () => {
    router.replace("/(tabs)");
  };

  const hasInstagram = !!instagramUrl;
  const hasTiktok = !!tiktokUrl;
  const hasYoutube = !!youtubeUrl;
  const hasAnySocial = hasInstagram || hasTiktok || hasYoutube;
  const portfolioCount = portfolioItems?.length || 0;

  // ── Confirmation State ──────────────────────────────────────
  if (isSubmitted) {
    return (
      <LinearGradient colors={["#E6E1EB", "#FFFFFF"]} style={{ flex: 1 }}>
        <StatusBar style="dark" />

        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 40,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: insets.bottom + 100,
          }}
        >
          {/* Success badge */}
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "rgba(209,235,219,0.9)",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.8)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              shadowColor: "#3C5759",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <CheckCircle size={48} color="#3C5759" strokeWidth={2} />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
              textAlign: "center",
              letterSpacing: -0.5,
            }}
          >
            Profile submitted! 🎉
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: "#3C5759",
              lineHeight: 24,
              textAlign: "center",
              paddingHorizontal: 20,
              marginBottom: 8,
            }}
          >
            We're reviewing your profile and will email you within 48 hours.
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#959D90",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            In the meantime, explore open collabs near you.
          </Text>
        </View>

        {/* Bottom CTA */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderTopWidth: 1,
            borderTopColor: "rgba(208,213,206,0.5)",
          }}
        >
          <TouchableOpacity
            onPress={handleReturnToBrowse}
            style={{
              backgroundColor: "#3C5759",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#EFECE9", fontSize: 16, fontWeight: "700" }}>
              Explore collabs
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Pre-Submit Review State ─────────────────────────────────
  return (
    <LinearGradient colors={["#E6E1EB", "#FFFFFF"]} style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: "rgba(255,255,255,0.85)",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="#3C5759" size={24} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 16,
              fontWeight: "600",
              color: "#192524",
              marginRight: 24,
            }}
          >
            Step 4 of 4
          </Text>
        </View>
        {/* Progress Bar */}
        <View
          style={{
            height: 4,
            backgroundColor: "#D0D5CE",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#3C5759",
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 6,
            letterSpacing: -0.5,
          }}
        >
          Review your profile
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#959D90",
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          This is what hosts will see when you apply to a collab.
        </Text>

        {/* Profile Card */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.75)",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.85)",
            shadowColor: "#3C5759",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
            padding: 20,
            marginBottom: 16,
          }}
        >
          {/* Avatar + Name */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#D1EBDB",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.9)",
                overflow: "hidden",
              }}
            >
              {profilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <Text style={{ fontSize: 28, color: "#3C5759" }}>
                  {(displayName || "?").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 3,
                }}
              >
                {displayName || "Your Name"}
              </Text>
              <Text style={{ fontSize: 14, color: "#959D90" }}>
                @{username || "username"}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(60,87,89,0.08)",
              marginBottom: 16,
            }}
          />

          {/* Social platforms */}
          <Text
            style={{
              fontSize: 10,
              fontWeight: "500",
              color: "#959D90",
              letterSpacing: 1.2,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Connected Platforms
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            {hasInstagram && (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(60,87,89,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Instagram size={20} color="#3C5759" />
              </View>
            )}
            {hasTiktok && (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(60,87,89,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Music size={20} color="#3C5759" />
              </View>
            )}
            {hasYoutube && (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(60,87,89,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Youtube size={20} color="#3C5759" />
              </View>
            )}
            {!hasAnySocial && (
              <Text style={{ fontSize: 14, color: "#D0D5CE" }}>
                None connected
              </Text>
            )}
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(60,87,89,0.08)",
              marginBottom: 16,
            }}
          />

          {/* Portfolio */}
          <Text
            style={{
              fontSize: 10,
              fontWeight: "500",
              color: "#959D90",
              letterSpacing: 1.2,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Portfolio
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(60,87,89,0.06)",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              alignSelf: "flex-start",
              gap: 6,
            }}
          >
            <ImageIcon size={16} color="#3C5759" />
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#3C5759" }}>
              {portfolioCount > 0
                ? `${portfolioCount} item${portfolioCount !== 1 ? "s" : ""} added`
                : "No uploads — that's okay!"}
            </Text>
          </View>
        </View>

        {/* Info banner */}
        <View
          style={{
            backgroundColor: "rgba(209,235,219,0.5)",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(209,235,219,0.8)",
            padding: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>✦</Text>
          <Text
            style={{ flex: 1, fontSize: 14, color: "#3C5759", lineHeight: 21 }}
          >
            Every creator profile is reviewed before going live. This ensures
            quality for both hosts and creators.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: "rgba(255,255,255,0.92)",
          borderTopWidth: 1,
          borderTopColor: "rgba(208,213,206,0.5)",
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          style={{
            backgroundColor: "#3C5759",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#EFECE9", fontSize: 16, fontWeight: "700" }}>
            Submit application
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: "center", paddingVertical: 8 }}
        >
          <Text style={{ color: "#959D90", fontSize: 15, fontWeight: "500" }}>
            Edit profile
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
