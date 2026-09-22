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
      <View
        style={{ flex: 1, backgroundColor: "#EFECE9", paddingTop: insets.top }}
      >
        <StatusBar style="dark" />

        {/* Progress Bar */}
        <View
          style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#959D90",
              marginBottom: 8,
              fontWeight: "500",
            }}
          >
            Step 2 of 4
          </Text>
          <View
            style={{
              height: 4,
              backgroundColor: "#D0D5CE",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: "50%",
                height: "100%",
                backgroundColor: "#3C5759",
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
                fontSize: 28,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 8,
                letterSpacing: -0.5,
              }}
            >
              Connect your socials
            </Text>
            <Text style={{ fontSize: 15, color: "#959D90", lineHeight: 22 }}>
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
                  color="#3C5759"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  Instagram
                </Text>
                <Text style={{ fontSize: 13, color: "#959D90", marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/username"
                placeholderTextColor="#959D90"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
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
                <Music size={18} color="#3C5759" style={{ marginRight: 8 }} />
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  TikTok
                </Text>
                <Text style={{ fontSize: 13, color: "#959D90", marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={tiktokUrl}
                onChangeText={setTiktokUrl}
                placeholder="https://tiktok.com/@username"
                placeholderTextColor="#959D90"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
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
                <Youtube size={18} color="#3C5759" style={{ marginRight: 8 }} />
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  YouTube
                </Text>
                <Text style={{ fontSize: 13, color: "#959D90", marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/@channel"
                placeholderTextColor="#959D90"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
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
            backgroundColor: "rgba(255,255,255,0.95)",
            borderTopWidth: 1,
            borderTopColor: "#D0D5CE",
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              backgroundColor: "#3C5759",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#EFECE9", fontSize: 16, fontWeight: "700" }}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            style={{ alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ color: "#959D90", fontSize: 15, fontWeight: "500" }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
