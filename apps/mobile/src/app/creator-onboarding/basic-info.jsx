import { View, ScrollView, TouchableOpacity, Pressable, Alert, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Camera, ChevronLeft } from "lucide-react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useUpload } from "@/utils/useUpload";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import { AtmosphericBackground, Display, Body, FormField, PillButton } from "@/components/ui";
import { colors } from "@/config/theme";

export default function CreatorBasicInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [upload, { loading: uploadLoading }] = useUpload();
  const {
    profilePhoto,
    displayName,
    username,
    updateMultipleFields,
    loadDraft,
  } = useCreatorOnboardingStore();

  const [localPhoto, setLocalPhoto] = useState(profilePhoto || null);
  const [localName, setLocalName] = useState(displayName || "");
  const [localUsername, setLocalUsername] = useState(username || "");

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    setLocalPhoto(profilePhoto || null);
    setLocalName(displayName || "");
    setLocalUsername(username || "");
  }, [profilePhoto, displayName, username]);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Please grant camera roll permissions to upload a profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      const uploadResult = await upload({
        reactNativeAsset: {
          uri: asset.uri,
          name: asset.fileName || "profile.jpg",
          mimeType: asset.mimeType || "image/jpeg",
        },
      });

      if (uploadResult.error) {
        Alert.alert("Upload Failed", uploadResult.error);
      } else {
        setLocalPhoto(uploadResult.url);
      }
    }
  };

  const handleUsernameChange = (text) => {
    let cleaned = text.replace(/^@/, "");
    cleaned = cleaned.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setLocalUsername(cleaned);
  };

  const handleContinue = () => {
    if (!localPhoto) {
      Alert.alert("Required Field", "Please add a profile photo.");
      return;
    }
    if (!localName.trim()) {
      Alert.alert("Required Field", "Please enter your display name.");
      return;
    }
    if (!localUsername.trim()) {
      Alert.alert("Required Field", "Please enter a username.");
      return;
    }

    // Persist to store before navigating
    updateMultipleFields({
      profilePhoto: localPhoto,
      displayName: localName.trim(),
      username: localUsername.trim(),
    });

    router.push("/creator-onboarding/social-links");
  };

  const handleSaveDraft = () => {
    updateMultipleFields({
      profilePhoto: localPhoto,
      displayName: localName.trim(),
      username: localUsername.trim(),
    });
    Alert.alert("Draft Saved", "Your progress has been saved.");
  };

  const isFormValid = localPhoto && localName.trim() && localUsername.trim();

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: "rgba(255,255,255,0.85)",
          borderBottomWidth: 1,
          borderBottomColor: colors.hairline,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color={colors.slate} size={24} />
          </TouchableOpacity>
          <Body size={16} weight="semibold" style={{ flex: 1, textAlign: "center", marginRight: 24 }}>
            Step 1 of 4
          </Body>
        </View>

        <View style={{ height: 4, backgroundColor: colors.stone, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: "25%", height: "100%", backgroundColor: colors.slate }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
          <Display size={28} style={{ marginBottom: 8 }}>Set up your creator profile</Display>
          <Body size={15} color={colors.slate} style={{ lineHeight: 22, marginBottom: 32 }}>
            Let's start with the basics. This information will be visible to
            hosts looking for creators.
          </Body>
        </View>

        {/* Profile Photo */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Body size={15} weight="semibold" style={{ marginBottom: 12 }}>Profile Photo *</Body>

          <TouchableOpacity onPress={handlePickImage} disabled={uploadLoading}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: colors.stone,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
              }}
            >
              {uploadLoading ? (
                <ActivityIndicator />
              ) : localPhoto ? (
                <Image
                  source={{ uri: localPhoto }}
                  style={{ width: "100%", height: "100%", borderRadius: 60 }}
                />
              ) : (
                <Camera color={colors.sage} size={32} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 20 }}>
          <FormField
            label="Display Name *"
            value={localName}
            onChangeText={setLocalName}
            placeholder="Your full name"
          />
          <FormField
            label="Username *"
            value={localUsername}
            onChangeText={handleUsernameChange}
            placeholder="username"
          />
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 12,
          backgroundColor: "rgba(255,255,255,0.9)",
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
        }}
      >
        <PillButton
          label="Continue"
          onPress={handleContinue}
          disabled={!isFormValid}
          style={{ alignSelf: "stretch", marginBottom: 10 }}
        />
        <Pressable onPress={handleSaveDraft}>
          <Body size={14} weight="medium" color={colors.slate} style={{ textAlign: "center" }}>
            Save draft
          </Body>
        </Pressable>
      </View>
    </AtmosphericBackground>
  );
}
