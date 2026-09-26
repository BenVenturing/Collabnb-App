import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Instagram, Music, Youtube } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

export default function SocialLinksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    instagramUrl: savedIg,
    tiktokUrl: savedTt,
    youtubeUrl: savedYt,
    updateMultipleFields,
    loadDraft,
  } = useCreatorOnboardingStore();

  const [instagramUrl, setInstagramUrl] = useState(savedIg || "");
  const [tiktokUrl, setTiktokUrl] = useState(savedTt || "");
  const [youtubeUrl, setYoutubeUrl] = useState(savedYt || "");

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    setInstagramUrl(savedIg || "");
    setTiktokUrl(savedTt || "");
    setYoutubeUrl(savedYt || "");
  }, [savedIg, savedTt, savedYt]);

  const saveAndNavigate = () => {
    updateMultipleFields({
      instagramUrl: instagramUrl.trim(),
      tiktokUrl: tiktokUrl.trim(),
      youtubeUrl: youtubeUrl.trim(),
    });
    router.push("/creator-onboarding/portfolio");
  };

  const handleContinue = () => {
    saveAndNavigate();
  };

  const handleSkip = () => {
    saveAndNavigate();
  };

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
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
            Step 2 of 4
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
                width: "50%",
                height: "100%",
                backgroundColor: colors.slate,
              }}
            />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
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
                marginBottom: 8,
                letterSpacing: track(28, tracking.display),
              }}
            >
              Connect your socials
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.sage, lineHeight: 22 }}>
              Help hosts discover your reach and content style
            </Text>
          </View>

          {/* Social Links Form */}
          <View style={{ paddingHorizontal: 24, gap: 20 }}>
            {/* Instagram */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Instagram
                  size={18}
                  color={colors.slate}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}
                >
                  Instagram
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/username"
                placeholderTextColor={colors.sage}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  // colors.surface at 85% opacity
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
                }}
              />
            </View>

            {/* TikTok */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Music size={18} color={colors.slate} style={{ marginRight: 8 }} />
                <Text
                  style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}
                >
                  TikTok
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={tiktokUrl}
                onChangeText={setTiktokUrl}
                placeholder="https://tiktok.com/@username"
                placeholderTextColor={colors.sage}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  // colors.surface at 85% opacity
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
                }}
              />
            </View>

            {/* YouTube */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Youtube size={18} color={colors.slate} style={{ marginRight: 8 }} />
                <Text
                  style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}
                >
                  YouTube
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/@channel"
                placeholderTextColor={colors.sage}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  // colors.surface at 85% opacity
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
                }}
              />
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
            // colors.surface at 95% opacity
            backgroundColor: "rgba(255,255,255,0.95)",
            borderTopWidth: 1,
            borderTopColor: colors.stone,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              backgroundColor: colors.slate,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            style={{ alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, color: colors.sage, fontSize: 15 }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    </KeyboardAvoidingAnimatedView>
  );
}
