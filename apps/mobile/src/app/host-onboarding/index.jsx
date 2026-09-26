import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
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
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

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
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 32,
              color: colors.ink,
              letterSpacing: track(32, tracking.display),
              marginBottom: 12,
              lineHeight: 38,
            }}
          >
            It's easy to get started on Collabnb
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 17,
              color: colors.slate,
              lineHeight: 26,
            }}
          >
            Set up your host profile and start collaborating with content
            creators
          </Text>
        </View>

        {/* Steps List */}
        <View style={{ paddingHorizontal: 24, gap: 20 }}>
          {steps.map((step, index) => (
            <View
              key={index}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                // colors.slate at 10% opacity
                borderColor: "rgba(60, 87, 89, 0.1)",
                shadowColor: colors.ink,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 13,
                        color: colors.sage,
                        letterSpacing: track(13, tracking.eyebrow),
                        marginRight: 8,
                      }}
                    >
                      STEP {step.number}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 18,
                      color: colors.ink,
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: colors.slate,
                      lineHeight: 22,
                    }}
                  >
                    {step.description}
                  </Text>
                </View>
              </View>
            </View>
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
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: colors.slate,
                lineHeight: 20,
              }}
            >
              Our team reviews each host to maintain quality collaborations for
              creators.
            </Text>
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
          borderTopColor: colors.stone,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/host-onboarding/property")}
          style={{
            backgroundColor: colors.ink,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, color: colors.surface, fontSize: 16 }}>
            Get started
          </Text>
        </TouchableOpacity>
      </View>
    </AtmosphericBackground>
  );
}
