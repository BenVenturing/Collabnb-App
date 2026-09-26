import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Plus, X, Image as ImageIcon, Video } from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useUpload } from "@/utils/useUpload";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

const MAX_PORTFOLIO_ITEMS = 6;

export default function PortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [upload, { loading: uploadLoading }] = useUpload();
  const {
    portfolioItems: savedItems,
    updateMultipleFields,
    loadDraft,
  } = useCreatorOnboardingStore();

  const [portfolioItems, setPortfolioItems] = useState(savedItems || []);

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    if (savedItems && savedItems.length > 0) {
      setPortfolioItems(savedItems);
    }
  }, [savedItems]);

  const handleAddMedia = async () => {
    if (portfolioItems.length >= MAX_PORTFOLIO_ITEMS) {
      Alert.alert(
        "Maximum Reached",
        `You can upload up to ${MAX_PORTFOLIO_ITEMS} portfolio items.`,
      );
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Please grant media library permissions to upload portfolio items.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      const uploadResult = await upload({
        reactNativeAsset: {
          uri: asset.uri,
          name: asset.fileName || "portfolio-item.jpg",
          mimeType: asset.mimeType || "image/jpeg",
        },
      });

      if (uploadResult.error) {
        Alert.alert("Upload Failed", uploadResult.error);
        return;
      }

      const newItem = {
        id: Date.now().toString(),
        uri: uploadResult.url,
        type: asset.type || "image",
      };

      const updated = [...portfolioItems, newItem];
      setPortfolioItems(updated);
      updateMultipleFields({ portfolioItems: updated });
    }
  };

  const handleRemoveItem = (itemId) => {
    const updated = portfolioItems.filter((item) => item.id !== itemId);
    setPortfolioItems(updated);
    updateMultipleFields({ portfolioItems: updated });
  };

  const handleContinue = () => {
    router.push("/creator-onboarding/submit");
  };

  const handleSkip = () => {
    router.push("/creator-onboarding/submit");
  };

  // Calculate grid layout: show items + add button if not at max
  const canAddMore = portfolioItems.length < MAX_PORTFOLIO_ITEMS;
  const gridItems = [...portfolioItems];
  if (canAddMore) {
    gridItems.push({ id: "add-button", type: "add" });
  }

  return (
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
          Step 3 of 4
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
              width: "75%",
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
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 }}
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
            Showcase your work
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.sage, lineHeight: 22 }}>
            Upload photos and videos from past collabs
          </Text>
        </View>

        {/* Portfolio Grid */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {gridItems.map((item) => {
              if (item.type === "add") {
                // Add button tile
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={handleAddMedia}
                    disabled={uploadLoading}
                    style={{
                      width: "31%",
                      aspectRatio: 1,
                      // colors.surface at 70% opacity
                      backgroundColor: "rgba(255,255,255,0.7)",
                      borderWidth: 1.5,
                      // colors.slate at 25% opacity
                      borderColor: "rgba(60,87,89,0.25)",
                      borderStyle: "dashed",
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {uploadLoading ? (
                      <ActivityIndicator color={colors.slate} />
                    ) : (
                      <>
                        <Plus size={26} color={colors.slate} strokeWidth={2} />
                        <Text
                          style={{
                            fontFamily: fonts.bodyMedium,
                            fontSize: 12,
                            color: colors.slate,
                            marginTop: 4,
                          }}
                        >
                          Add
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              }

              // Portfolio item tile
              return (
                <View
                  key={item.id}
                  style={{
                    width: "31%",
                    aspectRatio: 1,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: colors.stone,
                    position: "relative",
                  }}
                >
                  {/* Thumbnail */}
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />

                  {/* Video indicator */}
                  {item.type === "video" && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        // colors.ink at 65% opacity
                        backgroundColor: "rgba(25,37,36,0.65)",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 4,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Video size={12} color={colors.surface} />
                    </View>
                  )}

                  {/* Remove button */}
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.id)}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      // colors.ink at 65% opacity
                      backgroundColor: "rgba(25,37,36,0.65)",
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={14} color={colors.surface} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Helper info */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.sage,
              lineHeight: 20,
              marginBottom: 12,
            }}
          >
            Optional, but highly recommended.
          </Text>
          <View
            style={{
              // colors.mint at 50% opacity
              backgroundColor: "rgba(209,235,219,0.5)",
              borderRadius: 12,
              borderWidth: 1,
              // colors.mint at 80% opacity
              borderColor: "rgba(209,235,219,0.8)",
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14 }}>✦</Text>
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.slate,
                lineHeight: 18,
              }}
            >
              Uploads are reviewed for quality and policy compliance.
            </Text>
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
        {/* Primary CTA */}
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

        {/* Secondary CTA */}
        <TouchableOpacity
          onPress={handleSkip}
          style={{
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.sage, fontSize: 15 }}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </AtmosphericBackground>
  );
}
