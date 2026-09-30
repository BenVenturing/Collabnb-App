import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";
import { Display, Body, FormField } from "@/components/ui";
import { colors } from "@/config/theme";

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
          <Display size={28} style={{ marginBottom: 8 }}>Set up your host profile</Display>
          <Body size={16} color={colors.slate} style={{ lineHeight: 24 }}>
            Help creators learn more about you
          </Body>
        </View>

        {/* Form Fields */}
        <View style={{ paddingHorizontal: 24, gap: 20 }}>
          {/* No danger/required-field token in the 9-color palette — left as-is, see report */}
          <FormField
            label={<>Full name <Text style={{ color: "#EF4444" }}>*</Text></>}
            value={fullName}
            onChangeText={(text) => updateField("fullName", text)}
            placeholder="Your name"
          />

          <FormField
            label="Business / property brand name (optional)"
            value={businessName}
            onChangeText={(text) => updateField("businessName", text)}
            placeholder="e.g., Sunset Stays"
          />

          <FormField
            label="Website (optional)"
            value={websiteUrl}
            onChangeText={(text) => updateField("websiteUrl", text)}
            placeholder="https://yourwebsite.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <FormField
            label={<>Contact email <Text style={{ color: "#EF4444" }}>*</Text></>}
            value={contactEmail}
            onChangeText={(text) => updateField("contactEmail", text)}
            placeholder="your@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <FormField
            label="Phone (optional)"
            value={phone}
            onChangeText={(text) => updateField("phone", text)}
            placeholder="+1 (555) 123-4567"
            keyboardType="phone-pad"
          />

          {/* Info Callout */}
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
              Hosts are reviewed to maintain quality collaborations.
            </Body>
          </View>
        </View>
      </ScrollView>
    </HostOnboardingShell>
  );
}
