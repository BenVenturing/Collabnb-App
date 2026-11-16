import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { useUpload } from "@/utils/useUpload";
import * as ImagePicker from "expo-image-picker";
import { ChevronRight } from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, shadows, tracking, track } from "@/config/theme";

const PROFILE_KEY = "@collabnb_creator_profile_v1";

const DEFAULT_PROFILE = {
  name: "",
  handle: "",
  email: "",
  phone: "",
  location: "",
  bio: "",
  bioLink: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  avatarUri: "",
};

// Fields that live on the Convex profile (what web and other users see).
// Phone has no column yet, so it stays on this device.
const CONVEX_FIELD = {
  name: "full_name",
  handle: "username",
  location: "city",
  bio: "bio",
  bioLink: "portfolio",
  instagram: "instagram_handle",
  tiktok: "tiktok_handle",
  youtube: "youtube_handle",
};
const stripAt = (v) => (v || "").trim().replace(/^@/, "");


const PERSONAL_FIELDS = [
  { key: "name", label: "Display name", multiline: false },
  { key: "handle", label: "Handle", multiline: false },
  { key: "email", label: "Email", multiline: false, readOnly: true },
  {
    key: "phone",
    label: "Phone number",
    multiline: false,
    emptyLabel: "Not provided",
    emptyAction: "Add",
  },
  { key: "location", label: "Location", multiline: false },
  { key: "bio", label: "Bio", multiline: true },
  { key: "bioLink", label: "Bio Link", multiline: false },
];

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", multiline: false },
  { key: "tiktok", label: "TikTok", multiline: false },
  { key: "youtube", label: "YouTube", multiline: false },
];

export default function CreatorProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const convexProfile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const updateProfile = useMutation(api.profiles.updateProfile);
  const [upload, { loading: uploading }] = useUpload();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((s) => {
      // Only phone is device-local; everything else comes from Convex.
      if (s) setProfile((prev) => ({ ...prev, phone: JSON.parse(s).phone || "" }));
    });
  }, []);

  useEffect(() => {
    if (!convexProfile) return;
    const at = (h) => (h ? `@${stripAt(h)}` : "");
    setProfile((prev) => ({
      ...prev,
      name: convexProfile.full_name || "",
      handle: at(convexProfile.username),
      email: convexProfile.email || email || "",
      location: [convexProfile.city, convexProfile.region || convexProfile.country].filter(Boolean).join(", "),
      bio: convexProfile.bio || "",
      bioLink: convexProfile.portfolio || "",
      instagram: at(convexProfile.instagram_handle),
      tiktok: at(convexProfile.tiktok_handle),
      youtube: at(convexProfile.youtube_handle),
      avatarUri: convexProfile.avatar_url || user?.imageUrl || "",
    }));
  }, [convexProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToConvex = async (updates) => {
    if (!convexProfile?._id) return true;
    try {
      await updateProfile({ profileId: String(convexProfile._id), updates });
      return true;
    } catch (error) {
      Alert.alert("Couldn't save", error?.message || "Please try again.");
      return false;
    }
  };

  const changePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access in Settings to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset?.uri) return;
    const uploaded = await upload({
      reactNativeAsset: { uri: asset.uri, name: asset.fileName || "profile-photo.jpg", mimeType: asset.mimeType || "image/jpeg" },
    });
    if (uploaded?.error || !uploaded?.url) {
      Alert.alert("Upload failed", uploaded?.error || "Please try again.");
      return;
    }
    setProfile((p) => ({ ...p, avatarUri: uploaded.url }));
    if (await saveToConvex({ avatar_url: uploaded.url })) triggerConfetti();
  };

  const openEdit = (field) => {
    setEditingField(field);
    setEditValue(profile[field] || "");
  };

  const saveEdit = async () => {
    const updated = { ...profile, [editingField]: editValue };
    const column = CONVEX_FIELD[editingField];
    setProfile(updated);
    setEditingField(null);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    if (column) {
      const isHandle = ["handle", "instagram", "tiktok", "youtube"].includes(editingField);
      if (!(await saveToConvex({ [column]: isHandle ? stripAt(editValue) : editValue.trim() }))) return;
    }
    triggerConfetti();
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1500);
  };

  const activeField =
    [...PERSONAL_FIELDS, ...SOCIAL_FIELDS].find(
      (f) => f.key === editingField,
    ) || null;

  const renderFieldRow = (field) => {
    const value = profile[field.key];
    const isEmpty = !value;
    const displayValue = isEmpty ? field.emptyLabel || "Not provided" : value;

    return (
      <TouchableOpacity
        key={field.key}
        onPress={() => !field.readOnly && openEdit(field.key)}
        disabled={field.readOnly}
        activeOpacity={0.7}
        style={{ marginHorizontal: 20, marginBottom: 8, ...shadows.sm }}
      >
        <Glass
          variant="small"
          contentStyle={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 13,
                color: colors.sage,
                marginBottom: 3,
              }}
            >
              {field.label}
            </Text>
            <Text
              numberOfLines={field.multiline ? 2 : 1}
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: isEmpty ? colors.stone : colors.ink,
              }}
            >
              {displayValue}
            </Text>
          </View>
          {field.readOnly ? null : <ChevronRight color={colors.sage} size={18} style={{ marginLeft: 12 }} />}
        </Glass>
      </TouchableOpacity>
    );
  };

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle()} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.hairline,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <Text style={{ fontSize: 22, color: colors.ink }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 22,
            color: colors.ink,
            letterSpacing: track(22, tracking.display),
          }}
        >
          Personal Info
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo section */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
            gap: 16,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: colors.hairline,
            }}
          >
            <Image
              source={profile.avatarUri ? { uri: profile.avatarUri } : undefined}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <TouchableOpacity
            onPress={changePhoto}
            disabled={uploading}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 15,
                color: colors.slate,
              }}
            >
              {uploading ? "Uploading…" : "Change photo"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info section */}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Personal Info
        </Text>
        {PERSONAL_FIELDS.map(renderFieldRow)}

        {/* Socials section */}
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Socials
        </Text>
        {SOCIAL_FIELDS.map(renderFieldRow)}
      </ScrollView>

      {/* Inline edit modal */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingField(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setEditingField(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(25,37,36,0.35)",
            }}
          />
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                shadowColor: colors.ink,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Handle bar */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.stone,
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: colors.ink,
                  marginBottom: 16,
                  letterSpacing: track(18, tracking.display),
                }}
              >
                {activeField?.label}
              </Text>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                multiline={activeField?.multiline}
                numberOfLines={activeField?.multiline ? 4 : 1}
                style={{
                  backgroundColor: "rgba(60,87,89,0.05)",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(60,87,89,0.15)",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.ink,
                  fontFamily: fonts.body,
                  marginBottom: 16,
                  minHeight: activeField?.multiline ? 100 : undefined,
                  textAlignVertical: activeField?.multiline ? "top" : "center",
                }}
                placeholderTextColor={colors.stone}
                placeholder={`Enter ${activeField?.label?.toLowerCase()}...`}
              />
              <TouchableOpacity
                onPress={saveEdit}
                style={{
                  backgroundColor: colors.slate,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 15,
                    color: colors.bone,
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingField(null)}
                style={{ paddingVertical: 12, alignItems: "center" }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.sage,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confetti overlay */}
      {showConfetti && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.92)",
          }}
        >
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              color: colors.ink,
              letterSpacing: track(22, tracking.display),
            }}
          >
            Profile updated!
          </Text>
        </View>
      )}
    </AtmosphericBackground>
  );
}
