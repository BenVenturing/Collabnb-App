// Creator Onboarding — Step 4: Review & Submit
// Collabnb Design System

import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
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
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

// Website's profiles.updateProfile stores bare handles (e.g. "jane"), not
// full URLs — mirrors RoleSwitchSheet.jsx's `.replace(/^@/, '')` convention.
function extractHandle(url) {
  if (!url?.trim()) return undefined;
  const cleaned = url
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/^(instagram\.com|tiktok\.com|youtube\.com)\//i, "")
    .replace(/^@/, "")
    .split(/[/?]/)[0];
  return cleaned || undefined;
}

export default function CreatorSubmitApplicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const updateProfile = useMutation(api.profiles.updateProfile);

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

  const handleSubmit = async () => {
    if (!profile?._id) {
      Alert.alert("Error", "We couldn't find your account. Please try again.");
      return;
    }
    setSubmitting(true);
    try {
      await updateProfile({
        profileId: String(profile._id),
        updates: {
          full_name: displayName || undefined,
          username: username || undefined,
          avatar_url: profilePhoto || undefined,
          instagram_handle: extractHandle(instagramUrl),
          tiktok_handle: extractHandle(tiktokUrl),
          youtube_handle: extractHandle(youtubeUrl),
          portfolio_images: (portfolioItems || []).map((item) => item.uri),
        },
      });
      updateField("creatorApprovalStatus", "pending");
      setIsSubmitted(true);
    } catch (err) {
      Alert.alert("Submission failed", err?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      <AtmosphericBackground>
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
              // colors.mint at 90% opacity
              backgroundColor: "rgba(209,235,219,0.9)",
              borderWidth: 2,
              // colors.surface at 80% opacity
              borderColor: "rgba(255,255,255,0.8)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              shadowColor: colors.slate,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <CheckCircle size={48} color={colors.slate} strokeWidth={2} />
          </View>

          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              letterSpacing: track(28, tracking.display),
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Profile submitted! 🎉
          </Text>

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.slate,
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
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.sage,
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
            // colors.surface at 90% opacity
            backgroundColor: "rgba(255,255,255,0.9)",
            borderTopWidth: 1,
            // colors.stone at 50% opacity
            borderTopColor: "rgba(208,213,206,0.5)",
          }}
        >
          <TouchableOpacity
            onPress={handleReturnToBrowse}
            style={{
              backgroundColor: colors.slate,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>
              Explore collabs
            </Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    );
  }

  // ── Pre-Submit Review State ─────────────────────────────────
  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          // colors.surface at 85% opacity
          backgroundColor: "rgba(255,255,255,0.85)",
          borderBottomWidth: 1,
          borderBottomColor: colors.stone,
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
            <ChevronLeft color={colors.slate} size={24} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: fonts.bodySemibold,
              fontSize: 16,
              color: colors.ink,
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
            backgroundColor: colors.stone,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: colors.slate,
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
            fontFamily: fonts.display,
            fontSize: 28,
            color: colors.ink,
            marginBottom: 6,
            letterSpacing: track(28, tracking.display),
          }}
        >
          Review your profile
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.sage,
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          This is what hosts will see when you apply to a collab.
        </Text>

        {/* Profile Card */}
        <View
          style={{
            // colors.surface at 75% opacity
            backgroundColor: "rgba(255,255,255,0.75)",
            borderRadius: 20,
            borderWidth: 1,
            // colors.surface at 85% opacity
            borderColor: "rgba(255,255,255,0.85)",
            shadowColor: colors.slate,
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
                backgroundColor: colors.mint,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
                borderWidth: 2,
                // colors.surface at 90% opacity
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
                <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.slate }}>
                  {(displayName || "?").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: colors.ink,
                  letterSpacing: track(20, tracking.display),
                  marginBottom: 3,
                }}
              >
                {displayName || "Your Name"}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
                @{username || "username"}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              // colors.slate at 8% opacity
              backgroundColor: "rgba(60,87,89,0.08)",
              marginBottom: 16,
            }}
          />

          {/* Social platforms */}
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 10,
              color: colors.sage,
              letterSpacing: track(10, tracking.eyebrow),
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
                  // colors.slate at 8% opacity
                  backgroundColor: "rgba(60,87,89,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Instagram size={20} color={colors.slate} />
              </View>
            )}
            {hasTiktok && (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  // colors.slate at 8% opacity
                  backgroundColor: "rgba(60,87,89,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Music size={20} color={colors.slate} />
              </View>
            )}
            {hasYoutube && (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  // colors.slate at 8% opacity
                  backgroundColor: "rgba(60,87,89,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Youtube size={20} color={colors.slate} />
              </View>
            )}
            {!hasAnySocial && (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.stone }}>
                None connected
              </Text>
            )}
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              // colors.slate at 8% opacity
              backgroundColor: "rgba(60,87,89,0.08)",
              marginBottom: 16,
            }}
          />

          {/* Portfolio */}
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 10,
              color: colors.sage,
              letterSpacing: track(10, tracking.eyebrow),
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
              // colors.slate at 6% opacity
              backgroundColor: "rgba(60,87,89,0.06)",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              alignSelf: "flex-start",
              gap: 6,
            }}
          >
            <ImageIcon size={16} color={colors.slate} />
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate }}>
              {portfolioCount > 0
                ? `${portfolioCount} item${portfolioCount !== 1 ? "s" : ""} added`
                : "No uploads — that's okay!"}
            </Text>
          </View>
        </View>

        {/* Info banner */}
        <View
          style={{
            // colors.mint at 50% opacity
            backgroundColor: "rgba(209,235,219,0.5)",
            borderRadius: 14,
            borderWidth: 1,
            // colors.mint at 80% opacity
            borderColor: "rgba(209,235,219,0.8)",
            padding: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>✦</Text>
          <Text
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 21 }}
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
          // colors.surface at 92% opacity
          backgroundColor: "rgba(255,255,255,0.92)",
          borderTopWidth: 1,
          // colors.stone at 50% opacity
          borderTopColor: "rgba(208,213,206,0.5)",
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: colors.slate,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.bone} />
          ) : (
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>
              Submit application
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: "center", paddingVertical: 8 }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.sage, fontSize: 15 }}>
            Edit profile
          </Text>
        </TouchableOpacity>
      </View>
    </AtmosphericBackground>
  );
}
