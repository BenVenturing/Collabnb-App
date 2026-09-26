import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";
import { colors, fonts, tracking, track } from "@/config/theme";

export default function HostProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    fullName,
    businessName,
    contactEmail,
    phone,
    workEmail,
    websiteUrl,
    updateField,
    loadDraft,
  } = useHostOnboardingStore();

  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-fill contactEmail from workEmail if empty
  useEffect(() => {
    if (!contactEmail && workEmail) {
      updateField("contactEmail", workEmail);
    }
  }, [workEmail]);

  const handleContinue = () => {
    if (!fullName.trim() || !contactEmail.trim()) {
      Alert.alert("Required", "Please fill in your name and email");
      return;
    }
    router.push("/host-onboarding/submit");
  };

  return (
    <HostOnboardingShell
      currentStep={2}
      onNext={handleContinue}
      onBack={() => router.back()}
    >
      <StatusBar style="dark" />

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
            Set up your host profile
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.slate, lineHeight: 24 }}>
            Help creators learn more about you
          </Text>
        </View>

        {/* Form Fields */}
        <View style={{ paddingHorizontal: 24 }}>
          {/* Full Name */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              {/* No danger/required-field token in the 9-color palette — left as-is, see report */}
              Full name <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              value={fullName}
              onChangeText={(text) => updateField("fullName", text)}
              placeholder="Your name"
              placeholderTextColor={colors.sage}
              style={{
                backgroundColor: colors.bone,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
          </View>

          {/* Business/Brand Name */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Business / property brand name (optional)
            </Text>
            <TextInput
              value={businessName}
              onChangeText={(text) => updateField("businessName", text)}
              placeholder="e.g., Sunset Stays"
              placeholderTextColor={colors.sage}
              style={{
                backgroundColor: colors.bone,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
          </View>

          {/* Website */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Website (optional)
            </Text>
            <TextInput
              value={websiteUrl}
              onChangeText={(text) => updateField("websiteUrl", text)}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={colors.sage}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: colors.bone,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
          </View>

          {/* Contact Email */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Contact email <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              value={contactEmail}
              onChangeText={(text) => updateField("contactEmail", text)}
              placeholder="your@email.com"
              placeholderTextColor={colors.sage}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                backgroundColor: colors.bone,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
          </View>

          {/* Phone */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Phone (optional)
            </Text>
            <TextInput
              value={phone}
              onChangeText={(text) => updateField("phone", text)}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.sage}
              keyboardType="phone-pad"
              style={{
                backgroundColor: colors.bone,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
          </View>

          {/* Info Callout */}
          <View
            style={{
              // colors.mint at 50% opacity
              backgroundColor: "rgba(209, 235, 219, 0.5)",
              borderWidth: 1,
              borderColor: colors.mint,
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
            }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20 }}>
              Hosts are reviewed to maintain quality collaborations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </HostOnboardingShell>
  );
}
