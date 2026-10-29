import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { AlertCircle } from "lucide-react-native";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";
import { Display, Body, FormField } from "@/components/ui";
import { colors } from "@/config/theme";

export default function PropertyIntakeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    workEmail,
    airbnbUrl,
    instagramUrl,
    websiteUrl,
    updateField,
    loadDraft,
  } = useHostOnboardingStore();

  const [showEmailWarning, setShowEmailWarning] = useState(false);

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
    ];
    const domain = workEmail.split("@")[1]?.toLowerCase();
    setShowEmailWarning(
      workEmail && domain && personalDomains.includes(domain),
    );
  }, [workEmail]);

  const handleContinue = () => {
    if (!workEmail.trim() || !airbnbUrl.trim()) {
      Alert.alert(
        "Required fields",
        "Please provide work email and Airbnb listing URL",
      );
      return;
    }
    router.push("/host-onboarding/host-profile");
  };

  const handleBack = () => {
    router.push("/host-onboarding");
  };

  return (
    <HostOnboardingShell
      currentStep={1}
      onNext={handleContinue}
      onBack={handleBack}
    >
      <StatusBar style={statusBarStyle()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        >
          <Display size={28} style={{ marginBottom: 8 }}>Verify your property</Display>
          <Body size={16} color={colors.slate} style={{ lineHeight: 24 }}>
            We use these links to verify the property and keep listings
            accurate.
          </Body>
        </View>

        {/* Form Fields */}
        <View style={{ paddingHorizontal: 24, gap: 20 }}>
          <View>
            {/* No danger/required-field token in the 9-color palette — left as-is, see report */}
            <FormField
              label={<>Work email <Text style={{ color: "#EF4444" }}>*</Text></>}
              value={workEmail}
              onChangeText={(text) => updateField("workEmail", text)}
              placeholder="you@yourproperty.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            {showEmailWarning && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                  // Amber warning — no equivalent in the 9-color palette, left as-is, see report
                  backgroundColor: "#FEF3C7",
                  borderWidth: 1,
                  borderColor: "#FDE047",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <AlertCircle size={16} color="#92400E" style={{ marginRight: 8 }} />
                <Body size={13} color="#92400E" style={{ flex: 1, lineHeight: 18 }}>
                  Work email recommended for faster approval.
                </Body>
              </View>
            )}
          </View>

          <FormField
            label={<>Property listing URL <Text style={{ color: "#EF4444" }}>*</Text></>}
            value={airbnbUrl}
            onChangeText={(text) => updateField("airbnbUrl", text)}
            placeholder="https://www.airbnb.com/rooms/..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <FormField
            label="Instagram URL (optional)"
            value={instagramUrl}
            onChangeText={(text) => updateField("instagramUrl", text)}
            placeholder="https://instagram.com/yourproperty"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <FormField
            label="Website URL (optional)"
            value={websiteUrl}
            onChangeText={(text) => updateField("websiteUrl", text)}
            placeholder="https://yourwebsite.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
      </ScrollView>
    </HostOnboardingShell>
  );
}
