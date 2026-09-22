import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Camera, ChevronLeft } from "lucide-react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useUpload } from "@/utils/useUpload";
import { LinearGradient } from "expo-linear-gradient";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";

// ✅ Vibe colors
const VIBE_COLORS = {
  plain: "#EFECE9",
  forest: "#E4EEE6",
  dusk: "#E6E1EB",
  sand: "#F3EDE3",
  ocean: "#E3EDF2",
  rose: "#F1E4E6",
};

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

  const [vibe, setVibe] = useState("dusk");
  const vibeColor = VIBE_COLORS[vibe];

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
    <LinearGradient colors={[vibeColor, "#FFFFFF"]} style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: "rgba(255,255,255,0.85)", // ✅ glass
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="#3C5759" size={24} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 16,
              fontWeight: "600",
              color: "#192524",
              marginRight: 24,
            }}
          >
            Step 1 of 4
          </Text>
        </View>

        {/* Progress Bar */}
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
              width: "25%",
              height: "100%",
              backgroundColor: "#3C5759",
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24, // ✅ FIXED GAP
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Set up your creator profile
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              lineHeight: 22,
              marginBottom: 32,
            }}
          >
            Let's start with the basics. This information will be visible to
            hosts looking for creators.
          </Text>
        </View>

        {/* Profile Photo */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 12 }}>
            Profile Photo *
          </Text>

          <TouchableOpacity onPress={handlePickImage} disabled={uploadLoading}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "#D0D5CE",
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
                <Camera color="#959D90" size={32} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Inputs (glass style) */}
        {[
          {
            label: "Display Name *",
            value: localName,
            setter: setLocalName,
            placeholder: "Your full name",
          },
          {
            label: "Username *",
            value: localUsername,
            setter: handleUsernameChange,
            placeholder: "username",
          },
        ].map((field, i) => (
          <View key={i} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ marginBottom: 8 }}>{field.label}</Text>
            <TextInput
              value={field.value}
              onChangeText={field.setter}
              placeholder={field.placeholder}
              style={{
                backgroundColor: "rgba(255,255,255,0.85)", // ✅ glass
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: "#D0D5CE",
              }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 12,
          backgroundColor: "rgba(255,255,255,0.9)", // ✅ glass
          borderTopWidth: 1,
          borderTopColor: "#D0D5CE",
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isFormValid}
          style={{
            backgroundColor: isFormValid ? "#3C5759" : "#D0D5CE",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSaveDraft}>
          <Text style={{ textAlign: "center", color: "#3C5759" }}>
            Save draft
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
