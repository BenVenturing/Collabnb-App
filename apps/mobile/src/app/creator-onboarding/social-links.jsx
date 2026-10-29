import { View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { Instagram, Music, Youtube } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import { AtmosphericBackground, Display, Body, PillButton } from "@/components/ui";
import { colors, radii, fonts } from "@/config/theme";

function SocialField({ icon: Icon, label, value, onChangeText, placeholder }) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Icon size={18} color={colors.slate} style={{ marginRight: 8 }} />
        <Body size={15} weight="semibold">{label}</Body>
        <Body size={13} color={colors.sage} style={{ marginLeft: 8 }}>Optional</Body>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.sage}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: "rgba(255,255,255,0.5)",
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radii.md,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.ink,
        }}
      />
    </View>
  );
}

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
        <StatusBar style={statusBarStyle()} />

        {/* Progress Bar */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
          <Body size={12} weight="medium" color={colors.sage} style={{ marginBottom: 8 }}>
            Step 2 of 4
          </Body>
          <View style={{ height: 4, backgroundColor: colors.stone, borderRadius: 2, overflow: "hidden" }}>
            <View style={{ width: "50%", height: "100%", backgroundColor: colors.slate }} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
            <Display size={28} style={{ marginBottom: 8 }}>Connect your socials</Display>
            <Body size={15} color={colors.sage} style={{ lineHeight: 22 }}>
              Help hosts discover your reach and content style
            </Body>
          </View>

          <View style={{ paddingHorizontal: 24, gap: 20 }}>
            <SocialField
              icon={Instagram}
              label="Instagram"
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              placeholder="https://instagram.com/username"
            />
            <SocialField
              icon={Music}
              label="TikTok"
              value={tiktokUrl}
              onChangeText={setTiktokUrl}
              placeholder="https://tiktok.com/@username"
            />
            <SocialField
              icon={Youtube}
              label="YouTube"
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://youtube.com/@channel"
            />
          </View>
        </ScrollView>

        {/* Bottom CTAs */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(255,255,255,0.95)",
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <PillButton label="Continue" onPress={handleContinue} style={{ alignSelf: "stretch", marginBottom: 12 }} />
          <TouchableOpacity onPress={handleSkip} style={{ alignItems: "center", paddingVertical: 8 }}>
            <Body size={15} color={colors.sage}>Skip for now</Body>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    </KeyboardAvoidingAnimatedView>
  );
}
