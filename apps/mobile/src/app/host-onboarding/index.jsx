import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  HelpCircle,
  CheckCircle,
  FileText,
  Send,
} from "lucide-react-native";
import { AtmosphericBackground, Display, Body, EyebrowLabel, PillButton, Glass } from "@/components/ui";
import { colors } from "@/config/theme";

export default function HostOnboardingOverview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleHelp = () => {
    Alert.alert(
      "Help & FAQs",
      "Coming soon — reach out if you need assistance!",
      [{ text: "OK" }],
    );
  };

  const steps = [
    {
      icon: CheckCircle,
      number: "1",
      title: "Verify your property",
      description: "Connect your property listing and confirm your details",
    },
    {
      icon: FileText,
      number: "2",
      title: "Set up your host profile",
      description: "Help creators learn about you and your property",
    },
    {
      icon: Send,
      number: "3",
      title: "Submit for review",
      description: "Get approved to start posting collaborations (optional)",
    },
  ];

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -8,
          }}
        >
          <X size={24} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleHelp}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            marginRight: -8,
          }}
        >
          <HelpCircle size={24} color={colors.slate} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        >
          <Display size={32} style={{ marginBottom: 12, lineHeight: 38 }}>
            It's easy to get started on Collabnb
          </Display>
          <Body size={17} color={colors.slate} style={{ lineHeight: 26 }}>
            Set up your host profile and start collaborating with content
            creators
          </Body>
        </View>

        {/* Steps List */}
        <View style={{ paddingHorizontal: 24, gap: 20 }}>
          {steps.map((step, index) => (
            <Glass key={index} variant="card" contentStyle={{ padding: 20 }}>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {/* Icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.mint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <step.icon size={24} color={colors.slate} strokeWidth={2.5} />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 8 }}>
                    <EyebrowLabel size={13} color={colors.sage}>STEP {step.number}</EyebrowLabel>
                  </View>
                  <Body size={18} weight="semibold" style={{ marginBottom: 6 }}>
                    {step.title}
                  </Body>
                  <Body size={15} color={colors.slate} style={{ lineHeight: 22 }}>
                    {step.description}
                  </Body>
                </View>
              </View>
            </Glass>
          ))}
        </View>

        {/* Info Callout */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
          <View
            style={{
              // colors.mint at 50% opacity
              backgroundColor: "rgba(209, 235, 219, 0.5)",
              borderWidth: 1,
              borderColor: colors.mint,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Body size={14} color={colors.slate} style={{ lineHeight: 20 }}>
              Our team reviews each host to maintain quality collaborations for
              creators.
            </Body>
          </View>
        </View>
      </ScrollView>

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
        <PillButton
          label="Get started"
          onPress={() => router.push("/host-onboarding/property")}
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </AtmosphericBackground>
  );
}
