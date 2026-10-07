import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
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
import { useUser } from "@clerk/expo";
import { api } from "@/convex/_generated/api";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";
import { AtmosphericBackground, Display, Body, EyebrowLabel, PillButton, FormField, Glass } from "@/components/ui";
import { colors } from "@/config/theme";

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
          <Display size={28} style={{ marginBottom: 12, textAlign: "center" }}>
            Submitted — under review
          </Display>

          {/* Body Text */}
          <Body size={16} color={colors.slate} style={{ lineHeight: 24, textAlign: "center", paddingHorizontal: 20 }}>
            We'll email you within 24–48 hours.
          </Body>
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
          <PillButton label="Explore listings" onPress={handleReturnToExplore} style={{ alignSelf: "stretch" }} />
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
          <Display size={28} style={{ marginBottom: 12, textAlign: "center" }}>
            You're in!
          </Display>

          {/* Body Text */}
          <Body size={16} color={colors.slate} style={{ lineHeight: 24, textAlign: "center", paddingHorizontal: 20 }}>
            You can browse now. You'll need approval before posting listings.
          </Body>
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
          <PillButton label="Start browsing" onPress={handleReturnToExplore} style={{ alignSelf: "stretch" }} />
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
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
          <Display size={28} style={{ marginBottom: 8 }}>Submit for review</Display>
          <Body size={16} color={colors.slate} style={{ lineHeight: 24 }}>
            Review your details before submitting
          </Body>
        </View>

        {/* Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Glass variant="card" contentStyle={{ padding: 20 }}>
            {/* Verification Info */}
            <View
              style={{
                marginBottom: 20,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.hairline,
              }}
            >
              <EyebrowLabel size={13} color={colors.slate} style={{ marginBottom: 12 }}>
                Verification
              </EyebrowLabel>
              <Body size={14} style={{ marginBottom: 8 }}>{workEmail}</Body>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  alignSelf: "flex-start",
                }}
              >
                <Link size={14} color={colors.slate} style={{ marginRight: 6 }} />
                <Body size={13} color={colors.slate} numberOfLines={1}>
                  Property listing
                </Body>
              </View>
              {(instagramUrl || websiteUrl) && (
                <Body size={12} color={colors.slate} style={{ marginTop: 8 }}>
                  {instagramUrl && "Instagram"}
                  {instagramUrl && websiteUrl && " • "}
                  {websiteUrl && "Website"}
                </Body>
              )}
            </View>

            {/* Host Info */}
            <View>
              <EyebrowLabel size={13} color={colors.slate} style={{ marginBottom: 12 }}>
                Host
              </EyebrowLabel>
              <Body size={16} weight="semibold" style={{ marginBottom: 4 }}>
                {fullName}
              </Body>
              <Body size={14} color={colors.slate}>{contactEmail}</Body>
            </View>
          </Glass>
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
              borderColor: colors.hairline,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Body size={16} weight="semibold">Create your first collaboration (optional)</Body>
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
                borderColor: colors.hairline,
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              <Body size={14} weight="semibold" style={{ marginBottom: 12 }}>
                Collaboration type
              </Body>
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
                      borderColor: collaborationType === type ? colors.ink : colors.hairline,
                      backgroundColor: collaborationType === type ? colors.bone : colors.surface,
                    }}
                  >
                    <Body size={13} weight={collaborationType === type ? "semibold" : "medium"} style={{ textAlign: "center" }}>
                      {type}
                    </Body>
                  </TouchableOpacity>
                ))}
              </View>

              <Body size={14} weight="semibold" style={{ marginBottom: 12 }}>
                Deliverable preset
              </Body>
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
                      borderColor: deliverablePreset === preset ? colors.ink : colors.hairline,
                      backgroundColor: deliverablePreset === preset ? colors.bone : colors.surface,
                    }}
                  >
                    <Body size={13} weight={deliverablePreset === preset ? "semibold" : "medium"} style={{ textAlign: "center" }}>
                      {preset}
                    </Body>
                  </TouchableOpacity>
                ))}
              </View>

              <Body size={14} weight="semibold" style={{ marginBottom: 12 }}>
                Creator tier
              </Body>
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
                      borderColor: creatorTier === tier ? colors.ink : colors.hairline,
                      backgroundColor: creatorTier === tier ? colors.bone : colors.surface,
                    }}
                  >
                    <Body size={13} weight={creatorTier === tier ? "semibold" : "medium"}>
                      {tier}
                    </Body>
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
              borderColor: colors.hairline,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <DollarSign size={20} color={colors.slate} />
              <Body size={16} weight="semibold">Pricing & fees (host-only)</Body>
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
                borderColor: colors.hairline,
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              {/* Pricing Type */}
              <Body size={14} weight="semibold" style={{ marginBottom: 12 }}>
                Collaboration pricing
              </Body>
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
                      borderColor: pricingType === option.value ? colors.ink : colors.hairline,
                      backgroundColor: pricingType === option.value ? colors.bone : colors.surface,
                    }}
                  >
                    <Body size={13} weight={pricingType === option.value ? "semibold" : "medium"} style={{ textAlign: "center" }}>
                      {option.label}
                    </Body>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cash Value (if paid) */}
              {pricingType === "paid" && (
                <FormField
                  label="Cash value (USD)"
                  value={cashValue}
                  onChangeText={(text) => updateField("cashValue", text)}
                  placeholder="500"
                  keyboardType="numeric"
                  style={{ marginBottom: 16 }}
                />
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
                <Body size={13} weight="semibold" color={colors.slate} style={{ marginBottom: 6 }}>
                  Your fee (per collaboration)
                </Body>
                <Display size={20} style={{ marginBottom: 4 }}>
                  ${calculatedFee.toFixed(2)}
                </Display>
                <Body size={12} color={colors.slate} style={{ lineHeight: 16 }}>
                  {pricingType === "free"
                    ? "Flat fee for free/exchange collaborations"
                    : `8% of cash value (min $20, max $100)`}
                </Body>
              </View>

              {/* Privacy Note */}
              <View
                style={{
                  backgroundColor: "rgba(209, 235, 219, 0.3)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Body size={12} color={colors.slate} style={{ lineHeight: 16 }}>
                  ℹ️ Creators don't see these fees. They only see the
                  collaboration offer.
                </Body>
              </View>
            </View>
          )}
        </View>

        {/* Callout Text */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "rgba(209, 235, 219, 0.5)",
              borderWidth: 1,
              borderColor: colors.mint,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Body size={14} color={colors.slate} style={{ lineHeight: 20 }}>
              Our team reviews each host to ensure a great experience for
              creators.
            </Body>
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
        <PillButton
          label="Submit for review"
          onPress={handleSubmit}
          disabled={submitting}
          loading={submitting}
          style={{ alignSelf: "stretch", marginBottom: 12 }}
        />
        <TouchableOpacity onPress={handleSkip} style={{ alignItems: "center", paddingVertical: 8 }}>
          <Body size={16} color={colors.sage}>Skip for now</Body>
        </TouchableOpacity>
      </View>
    </HostOnboardingShell>
  );
}
