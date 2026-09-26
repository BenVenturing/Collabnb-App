import { View, Text, ScrollView, Alert, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  CheckCircle,
  Link,
  ChevronDown,
  ChevronUp,
  Sparkles,
  DollarSign,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

export default function HostSubmitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const updateProfile = useMutation(api.profiles.updateProfile);

  const {
    workEmail,
    airbnbUrl,
    instagramUrl,
    websiteUrl,
    fullName,
    businessName,
    contactEmail,
    createFirstListing,
    collaborationType,
    deliverablePreset,
    creatorTier,
    pricingType,
    cashValue,
    calculatedFee,
    updateField,
    updateMultipleFields,
    loadDraft,
  } = useHostOnboardingStore();

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showListingSection, setShowListingSection] = useState(false);
  const [showPricingSection, setShowPricingSection] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDraft();
  }, []);

  const triggerConfetti = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = async () => {
    if (!profile?._id) {
      Alert.alert("Error", "We couldn't find your account. Please try again.");
      return;
    }
    setSubmitting(true);
    try {
      // Same fields the website's finishRoleSwitchProfile persists for a
      // host — website reuses the `portfolio` string field for "Website".
      await updateProfile({
        profileId: String(profile._id),
        updates: {
          full_name: fullName || undefined,
          business_name: businessName || undefined,
          portfolio: websiteUrl || undefined,
        },
      });
      updateField("hostApprovalStatus", "pending");
      triggerConfetti();
      setIsSubmitted(true);
    } catch (err) {
      Alert.alert("Submission failed", err?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    updateField("hostApprovalStatus", "not_submitted");
    triggerConfetti();
    setIsSkipped(true);
  };

  const handleReturnToExplore = () => {
    router.replace("/host/(tabs)/dashboard");
  };

  // Post-Submit Confirmation State
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
          {/* Success Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <CheckCircle size={48} color={colors.slate} strokeWidth={2.5} />
          </View>

          {/* Title */}
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
            Submitted — under review
          </Text>

          {/* Body Text */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.slate,
              lineHeight: 24,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            We'll email you within 24–48 hours.
          </Text>
        </View>

        {/* Bottom CTA */}
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
          <TouchableOpacity
            onPress={handleReturnToExplore}
            style={{
              backgroundColor: colors.ink,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                color: colors.surface,
                fontSize: 16,
              }}
            >
              Explore listings
            </Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    );
  }

  // Post-Skip Confirmation State
  if (isSkipped) {
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
          {/* Success Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Sparkles size={48} color={colors.slate} strokeWidth={2.5} />
          </View>

          {/* Title */}
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
            You're in!
          </Text>

          {/* Body Text */}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.slate,
              lineHeight: 24,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            You can browse now. You'll need approval before posting listings.
          </Text>
        </View>

        {/* Bottom CTA */}
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
          <TouchableOpacity
            onPress={handleReturnToExplore}
            style={{
              backgroundColor: colors.ink,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                color: colors.surface,
                fontSize: 16,
              }}
            >
              Start browsing
            </Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    );
  }

  // Pre-Submit State
  return (
    <HostOnboardingShell
      currentStep={3}
      onNext={handleSubmit}
      onBack={() => router.back()}
      nextLabel="Submit for review"
      showBackButton={false}
      nextDisabled={submitting}
    >
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 240 }}
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
            Submit for review
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.slate, lineHeight: 24 }}>
            Review your details before submitting
          </Text>
        </View>

        {/* Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: colors.bone,
              borderWidth: 1,
              borderColor: colors.stone,
              borderRadius: 16,
              padding: 20,
            }}
          >
            {/* Verification Info */}
            <View
              style={{
                marginBottom: 20,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.stone,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 13,
                  color: colors.slate,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: track(13, tracking.eyebrow),
                }}
              >
                Verification
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginBottom: 8 }}>
                {workEmail}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.stone,
                  alignSelf: "flex-start",
                }}
              >
                <Link size={14} color={colors.slate} style={{ marginRight: 6 }} />
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}
                  numberOfLines={1}
                >
                  Property listing
                </Text>
              </View>
              {(instagramUrl || websiteUrl) && (
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: colors.slate,
                    marginTop: 8,
                  }}
                >
                  {instagramUrl && "Instagram"}
                  {instagramUrl && websiteUrl && " • "}
                  {websiteUrl && "Website"}
                </Text>
              )}
            </View>

            {/* Host Info */}
            <View>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 13,
                  color: colors.slate,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: track(13, tracking.eyebrow),
                }}
              >
                Host
              </Text>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 16,
                  color: colors.ink,
                  marginBottom: 4,
                }}
              >
                {fullName}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate }}>
                {contactEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Optional: Create First Collaboration */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setShowListingSection(!showListingSection)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.bone,
              borderWidth: 1,
              borderColor: colors.stone,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink }}>
              Create your first collaboration (optional)
            </Text>
            {showListingSection ? (
              <ChevronUp size={20} color={colors.slate} />
            ) : (
              <ChevronDown size={20} color={colors.slate} />
            )}
          </TouchableOpacity>

          {showListingSection && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                }}
              >
                Collaboration type
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {["Free stay", "Paid", "Hybrid"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => updateField("collaborationType", type)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        collaborationType === type ? colors.ink : colors.stone,
                      backgroundColor:
                        collaborationType === type ? colors.bone : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: collaborationType === type ? fonts.bodySemibold : fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.ink,
                        textAlign: "center",
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                }}
              >
                Deliverable preset
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {["Light", "Moderate", "Heavy"].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => updateField("deliverablePreset", preset)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        deliverablePreset === preset ? colors.ink : colors.stone,
                      backgroundColor:
                        deliverablePreset === preset ? colors.bone : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily:
                          deliverablePreset === preset ? fonts.bodySemibold : fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.ink,
                        textAlign: "center",
                      }}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                }}
              >
                Creator tier
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["UGC Beginner", "UGC Pro", "Micro", "Mid"].map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    onPress={() => updateField("creatorTier", tier)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: creatorTier === tier ? colors.ink : colors.stone,
                      backgroundColor:
                        creatorTier === tier ? colors.bone : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: creatorTier === tier ? fonts.bodySemibold : fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.ink,
                      }}
                    >
                      {tier}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Pricing & Fees Section (NEW) */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => setShowPricingSection(!showPricingSection)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.bone,
              borderWidth: 1,
              borderColor: colors.stone,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <DollarSign size={20} color={colors.slate} />
              <Text
                style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink }}
              >
                Pricing & fees (host-only)
              </Text>
            </View>
            {showPricingSection ? (
              <ChevronUp size={20} color={colors.slate} />
            ) : (
              <ChevronDown size={20} color={colors.slate} />
            )}
          </TouchableOpacity>

          {showPricingSection && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              {/* Pricing Type */}
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                }}
              >
                Collaboration pricing
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {[
                  { value: "free", label: "Free/Exchange" },
                  { value: "paid", label: "Paid" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => updateField("pricingType", option.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        pricingType === option.value ? colors.ink : colors.stone,
                      backgroundColor:
                        pricingType === option.value ? colors.bone : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily:
                          pricingType === option.value ? fonts.bodySemibold : fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.ink,
                        textAlign: "center",
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cash Value (if paid) */}
              {pricingType === "paid" && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 14,
                      color: colors.ink,
                      marginBottom: 8,
                    }}
                  >
                    Cash value (USD)
                  </Text>
                  <TextInput
                    value={cashValue}
                    onChangeText={(text) => updateField("cashValue", text)}
                    placeholder="500"
                    placeholderTextColor={colors.sage}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.bone,
                      borderWidth: 1,
                      borderColor: colors.stone,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: colors.ink,
                    }}
                  />
                </View>
              )}

              {/* Fee Calculation */}
              <View
                style={{
                  backgroundColor: colors.bone,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 13,
                    color: colors.slate,
                    marginBottom: 6,
                  }}
                >
                  Your fee (per collaboration)
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 20,
                    color: colors.ink,
                    letterSpacing: track(20, tracking.display),
                    marginBottom: 4,
                  }}
                >
                  ${calculatedFee.toFixed(2)}
                </Text>
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, lineHeight: 16 }}
                >
                  {pricingType === "free"
                    ? "Flat fee for free/exchange collaborations"
                    : `8% of cash value (min $20, max $100)`}
                </Text>
              </View>

              {/* Privacy Note */}
              <View
                style={{
                  // colors.mint at 30% opacity — no alpha token exists for it in theme.js
                  backgroundColor: "rgba(209, 235, 219, 0.3)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, lineHeight: 16 }}
                >
                  ℹ️ Creators don't see these fees. They only see the
                  collaboration offer.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Callout Text */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              // colors.mint at 50% opacity — no alpha token exists for it in theme.js
              backgroundColor: "rgba(209, 235, 219, 0.5)",
              borderWidth: 1,
              borderColor: colors.mint,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20 }}>
              Our team reviews each host to ensure a great experience for
              creators.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Bottom Bar with Skip Option */}
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
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: colors.ink,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.surface, fontSize: 16 }}>
              Submit for review
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          style={{
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.sage, fontSize: 16 }}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </HostOnboardingShell>
  );
}
