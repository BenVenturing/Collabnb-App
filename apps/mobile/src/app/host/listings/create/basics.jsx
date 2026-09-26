import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, X, HelpCircle } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";
import GlassHelpModal from "@/components/GlassHelpModal";
import { colors, fonts, tracking, track } from "@/config/theme";

export default function CreateListingBasics() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [showLoadHelp, setShowLoadHelp] = useState(false);
  const [showTierHelp, setShowTierHelp] = useState(false);

  useEffect(() => {
    const init = async () => {
      await ListingDraftStore.init();

      // Check if we're in edit mode
      if (params.editMode === "true" && params.id) {
        const existingListing = await ListingDraftStore.getListingById(
          params.id,
        );
        if (existingListing && Object.keys(existingListing).length > 0) {
          // Pre-populate draft with existing listing data
          await ListingDraftStore.updateDraft({
            ...existingListing,
            _editingId: params.id, // Track which listing we're editing
          });
        }
      }

      setDraft(ListingDraftStore.getDraft());
    };
    init();

    const unsub = ListingDraftStore.subscribe(() => {
      setDraft(ListingDraftStore.getDraft());
    });
    return unsub;
  }, [params.editMode, params.id]);

  const updateField = async (field, value) => {
    await ListingDraftStore.updateDraft({ [field]: value });
  };

  const handlePickImages = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      const updated = [...(draft.images || []), ...newImages];
      await updateField("images", updated);
    }
  };

  const removeImage = async (index) => {
    const updated = draft.images.filter((_, i) => i !== index);
    await updateField("images", updated);
  };

  const handleImportFromAirbnb = () => {
    Alert.alert(
      "Coming Soon",
      "Property image import will be available soon. For now, please upload images manually.",
    );
  };

  const handleNext = () => {
    router.push({
      pathname: "/host/listings/create/offer",
      params:
        params.editMode === "true" && params.id
          ? { id: params.id, editMode: "true" }
          : {},
    });
  };

  const handleSaveExit = () => {
    router.push("/host/(tabs)/dashboard");
  };

  const isValid =
    draft.title.trim() &&
    draft.location_city.trim() &&
    draft.location_country.trim();

  const loadHelpData = [
    {
      label: "Light (1–5 deliverables)",
      description: "Best for simple stays and quick content.",
    },
    {
      label: "Moderate (5–10 deliverables)",
      description: "Balanced package for strong coverage.",
    },
    {
      label: "Heavy (10+ deliverables)",
      description: "For full campaigns and multi-format coverage.",
    },
  ];

  const tierHelpData = [
    {
      label: "UGC Beginner",
      description: "Newer to UGC, building portfolio, great value.",
    },
    {
      label: "UGC Pro",
      description:
        "Proven UGC quality, clear communication, faster turnaround.",
    },
    {
      label: "Micro Influencer",
      description: "Smaller but engaged audience + UGC deliverables.",
    },
    {
      label: "Influencer",
      description: "Larger reach + UGC; best for brands needing distribution.",
    },
  ];

  const getTierDescription = (tier) => {
    const descriptions = {
      ugc_beginner: "Newer to UGC, building portfolio, great value.",
      ugc_pro: "Proven UGC quality, clear communication, faster turnaround.",
      micro: "Smaller but engaged audience + UGC deliverables.",
      mid: "Larger reach + UGC; best for brands needing distribution.",
    };
    return descriptions[tier] || "";
  };

  return (
    <>
      <ListingCreationShell
        currentStep={1}
        totalSteps={4}
        onBack={() => router.back()}
        onSaveExit={handleSaveExit}
        onNext={handleNext}
        nextDisabled={!isValid}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              letterSpacing: track(28, tracking.display),
              marginBottom: 8,
            }}
          >
            Tell us the basics
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.slate,
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Start with the essential details about your collaboration
            opportunity.
          </Text>

          {/* Title */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Listing title *
            </Text>
            <TextInput
              value={draft.title}
              onChangeText={(val) => updateField("title", val)}
              placeholder="e.g., Cozy Lake Tahoe Cabin"
              placeholderTextColor={colors.sage}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
          </View>

          {/* Location */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Location *
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TextInput
                value={draft.location_city}
                onChangeText={(val) => updateField("location_city", val)}
                placeholder="City"
                placeholderTextColor={colors.sage}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 16,
                  color: colors.ink,
                }}
              />
              <TextInput
                value={draft.location_country}
                onChangeText={(val) => updateField("location_country", val)}
                placeholder="State/Country"
                placeholderTextColor={colors.sage}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 16,
                  color: colors.ink,
                }}
              />
            </View>
          </View>

          {/* Property Listing URL */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Property listing URL
            </Text>
            <TextInput
              value={draft.airbnb_url || ""}
              onChangeText={(val) => updateField("airbnb_url", val)}
              placeholder="https://airbnb.com/rooms/12345678"
              placeholderTextColor={colors.sage}
              autoCapitalize="none"
              keyboardType="url"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 16,
                color: colors.ink,
              }}
            />
            {draft.airbnb_url && (
              <TouchableOpacity
                onPress={handleImportFromAirbnb}
                style={{
                  marginTop: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: colors.bone,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate }}
                >
                  📥 Import property images (Coming Soon)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Images */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Property images
            </Text>

            {draft.images && draft.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {draft.images.map((uri, idx) => (
                  <View key={idx} style={{ position: "relative" }}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 12,
                        backgroundColor: colors.bone,
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => removeImage(idx)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        backgroundColor: "rgba(25,37,36,0.6)",
                        borderRadius: 12,
                        padding: 4,
                      }}
                    >
                      <X color={colors.surface} size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={handlePickImages}
              style={{
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.stone,
                borderStyle: "dashed",
                backgroundColor: colors.surface,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Camera color={colors.slate} size={20} />
              <Text
                style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate }}
              >
                Upload images
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                color: colors.sage,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Select multiple images from your library
            </Text>
          </View>

          {/* Collaboration Brief */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Collaboration brief
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.slate,
                marginBottom: 8,
                lineHeight: 18,
              }}
            >
              Describe what you're looking for from creators (optional)
            </Text>
            <TextInput
              value={draft.collaboration_brief || ""}
              onChangeText={(val) => updateField("collaboration_brief", val)}
              placeholder="e.g., Looking for authentic content that highlights the mountain views and cozy cabin vibe. Perfect for lifestyle creators who love nature..."
              placeholderTextColor={colors.sage}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.stone,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.ink,
                minHeight: 100,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Collaboration Type */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Collaboration type *
            </Text>
            <View style={{ gap: 12 }}>
              {[
                { value: "free_stay", label: "Free/Exchange" },
                { value: "paid", label: "Paid" },
                { value: "hybrid", label: "Hybrid (Stay + Cash)" },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => updateField("compensation_type", type.value)}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      draft.compensation_type === type.value
                        ? colors.slate
                        : colors.stone,
                    backgroundColor:
                      draft.compensation_type === type.value
                        ? colors.mint
                        : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 16,
                      color: colors.ink,
                    }}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cash Value (if Paid or Hybrid) */}
          {(draft.compensation_type === "paid" ||
            draft.compensation_type === "hybrid") && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 8,
                }}
              >
                Cash payment amount
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 20,
                    color: colors.ink,
                    marginRight: 8,
                  }}
                >
                  $
                </Text>
                <TextInput
                  value={String(draft.cash_payout)}
                  onChangeText={(val) =>
                    updateField("cash_payout", parseInt(val) || 0)
                  }
                  placeholder="450"
                  placeholderTextColor={colors.sage}
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontFamily: fonts.body,
                    fontSize: 16,
                    color: colors.ink,
                  }}
                />
              </View>
            </View>
          )}

          {/* Stay Nights (if Free or Hybrid) */}
          {(draft.compensation_type === "free_stay" ||
            draft.compensation_type === "hybrid") && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 8,
                }}
              >
                Number of nights
              </Text>
              <TextInput
                value={String(draft.stay_nights)}
                onChangeText={(val) =>
                  updateField("stay_nights", parseInt(val) || 1)
                }
                placeholder="2"
                placeholderTextColor={colors.sage}
                keyboardType="number-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 16,
                  color: colors.ink,
                }}
              />
            </View>
          )}

          {/* Creator Tier */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                }}
              >
                Creator tier required *
              </Text>
              <TouchableOpacity onPress={() => setShowTierHelp(true)}>
                <HelpCircle color={colors.slate} size={18} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.slate,
                marginBottom: 12,
                lineHeight: 18,
              }}
            >
              Choose the creator level that best matches your goals (content
              quality vs distribution).
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { value: "ugc_beginner", label: "UGC Beginner" },
                { value: "ugc_pro", label: "UGC Pro" },
                { value: "micro", label: "Micro Influencer" },
                { value: "mid", label: "Influencer" },
              ].map((tier) => (
                <TouchableOpacity
                  key={tier.value}
                  onPress={() =>
                    updateField("creator_tier_required", tier.value)
                  }
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor:
                      draft.creator_tier_required === tier.value
                        ? colors.slate
                        : colors.bone,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 14,
                      color:
                        draft.creator_tier_required === tier.value
                          ? colors.surface
                          : colors.ink,
                    }}
                  >
                    {tier.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {draft.creator_tier_required && (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.slate,
                  marginTop: 10,
                  fontStyle: "italic",
                }}
              >
                {getTierDescription(draft.creator_tier_required)}
              </Text>
            )}
          </View>

          {/* Load Preset */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                }}
              >
                Deliverable load *
              </Text>
              <TouchableOpacity onPress={() => setShowLoadHelp(true)}>
                <HelpCircle color={colors.slate} size={18} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {[
                {
                  value: "light",
                  label: "Light",
                  desc: "Best for simple stays and quick content.",
                },
                {
                  value: "moderate",
                  label: "Moderate",
                  desc: "Balanced package for strong coverage.",
                },
                {
                  value: "heavy",
                  label: "Heavy",
                  desc: "For full campaigns and multi-format coverage.",
                },
              ].map((load) => (
                <TouchableOpacity
                  key={load.value}
                  onPress={() => updateField("deliverable_load", load.value)}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      draft.deliverable_load === load.value
                        ? colors.slate
                        : colors.stone,
                    backgroundColor:
                      draft.deliverable_load === load.value
                        ? colors.mint
                        : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 15,
                      color: colors.ink,
                      marginBottom: 2,
                    }}
                  >
                    {load.label}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                    {load.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ListingCreationShell>

      <GlassHelpModal
        visible={showLoadHelp}
        onClose={() => setShowLoadHelp(false)}
        title="Deliverable Load"
        data={loadHelpData}
      />
      <GlassHelpModal
        visible={showTierHelp}
        onClose={() => setShowTierHelp(false)}
        title="Creator Tier"
        data={tierHelpData}
      />
    </>
  );
}
