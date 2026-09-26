import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

const DELIVERABLES_COUNT_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1-3", label: "1-3 deliverables" },
  { value: "4-6", label: "4-6 deliverables" },
  { value: "7-10", label: "7-10 deliverables" },
  { value: "11", label: "11+ deliverables" },
];

const DELIVERABLE_OPTIONS = [
  "UGC",
  "Reels",
  "TikTok",
  "Blog",
  "YouTube",
  "Photos",
  "Story Set",
];

const TIER_OPTIONS = [
  { value: "ugc", label: "UGC" },
  { value: "micro", label: "Micro" },
  { value: "mid", label: "Mid-tier" },
];

const COMPENSATION_OPTIONS = [
  { value: "free", label: "Free stay" },
  { value: "paid", label: "Paid" },
  { value: "hybrid", label: "Hybrid" },
];

const LOAD_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

const SORT_OPTIONS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "value", label: "Highest value" },
];

export default function FilterModal({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
}) {
  const insets = useSafeAreaInsets();

  const {
    deliverablesCount = "",
    priceRange = { min: "", max: "" },
    completeByDate = "",
    selectedDeliverables = [],
    selectedTier = "ugc",
    compensationTypes = [],
    deliverableLoad = "",
    nearbyEnabled = false,
    sortBy = "best",
  } = filters;

  const {
    setDeliverablesCount,
    setPriceRange,
    setCompleteByDate,
    setSelectedDeliverables,
    setSelectedTier,
    setCompensationTypes,
    setDeliverableLoad,
    setNearbyEnabled,
    setSortBy,
  } = onFiltersChange;

  const activeFilterCount =
    (deliverablesCount ? 1 : 0) +
    (priceRange.min || priceRange.max ? 1 : 0) +
    (completeByDate ? 1 : 0) +
    selectedDeliverables.length +
    compensationTypes.length +
    (deliverableLoad ? 1 : 0) +
    (nearbyEnabled ? 1 : 0) +
    (selectedTier !== "ugc" ? 1 : 0) +
    (sortBy !== "best" ? 1 : 0);

  const toggleDeliverable = (deliverable) => {
    setSelectedDeliverables((prev) =>
      prev.includes(deliverable)
        ? prev.filter((d) => d !== deliverable)
        : [...prev, deliverable],
    );
  };

  const toggleCompensation = (comp) => {
    setCompensationTypes((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <AtmosphericBackground style={{ flex: 1 }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.stone,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.ink,
                letterSpacing: track(20, tracking.display),
              }}
            >
              Filters
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.bone,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X color={colors.ink} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            {/* Deliverables Count */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(14, tracking.display),
                }}
              >
                Number of deliverables
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {DELIVERABLES_COUNT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setDeliverablesCount(option.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        deliverablesCount === option.value
                          ? colors.slate
                          : colors.bone,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 13,
                        color:
                          deliverablesCount === option.value
                            ? colors.surface
                            : colors.ink,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(14, tracking.display),
                }}
              >
                Price range (value score)
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <TextInput
                  value={priceRange.min}
                  onChangeText={(value) =>
                    setPriceRange((prev) => ({ ...prev, min: value }))
                  }
                  placeholder="Min"
                  placeholderTextColor={colors.sage}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
                <Text style={{ fontFamily: fonts.body, color: colors.sage }}>-</Text>
                <TextInput
                  value={priceRange.max}
                  onChangeText={(value) =>
                    setPriceRange((prev) => ({ ...prev, max: value }))
                  }
                  placeholder="Max"
                  placeholderTextColor={colors.sage}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
              </View>
            </View>

            {/* Complete-by Date */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(14, tracking.display),
                }}
              >
                Complete by date
              </Text>
              <TextInput
                value={completeByDate}
                onChangeText={setCompleteByDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.sage}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: colors.stone,
                  borderRadius: 12,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
                }}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: colors.stone,
                marginBottom: 24,
              }}
            />

            {/* Nearby Toggle */}
            <View style={{ marginBottom: 24 }}>
              <Pressable
                onPress={() => setNearbyEnabled(!nearbyEnabled)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: nearbyEnabled ? colors.slate : colors.stone,
                    backgroundColor: nearbyEnabled ? colors.slate : colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {nearbyEnabled && (
                    <Text style={{ color: colors.surface, fontSize: 14 }}>✓</Text>
                  )}
                </View>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink, flex: 1 }}>
                  Nearby only{" "}
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>
                    (GPS coming soon)
                  </Text>
                </Text>
              </Pressable>
            </View>

            {/* Deliverable Types */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.displaySemibold,
                    fontSize: 14,
                    color: colors.ink,
                    letterSpacing: track(14, tracking.display),
                  }}
                >
                  Deliverable types
                </Text>
                {selectedDeliverables.length > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: colors.slate,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 11,
                        color: colors.surface,
                      }}
                    >
                      {selectedDeliverables.length} selected
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {DELIVERABLE_OPTIONS.map((deliverable) => (
                  <TouchableOpacity
                    key={deliverable}
                    onPress={() => toggleDeliverable(deliverable)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: selectedDeliverables.includes(
                        deliverable,
                      )
                        ? colors.slate
                        : colors.bone,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 13,
                        color: selectedDeliverables.includes(deliverable)
                          ? colors.surface
                          : colors.ink,
                      }}
                    >
                      {deliverable}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Creator Tier */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(14, tracking.display),
                }}
              >
                Creator tier
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {TIER_OPTIONS.map((tier) => (
                  <TouchableOpacity
                    key={tier.value}
                    onPress={() => setSelectedTier(tier.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor:
                        selectedTier === tier.value ? colors.slate : colors.bone,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 14,
                        color: selectedTier === tier.value ? colors.surface : colors.ink,
                      }}
                    >
                      {tier.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 8 }}>
                Listings shown are based on your tier.
              </Text>
            </View>

            {/* Compensation */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.displaySemibold,
                    fontSize: 14,
                    color: colors.ink,
                    letterSpacing: track(14, tracking.display),
                  }}
                >
                  Compensation
                </Text>
                {compensationTypes.length > 0 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: colors.slate,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 11,
                        color: colors.surface,
                      }}
                    >
                      {compensationTypes.length} selected
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {COMPENSATION_OPTIONS.map((comp) => (
                  <TouchableOpacity
                    key={comp.value}
                    onPress={() => toggleCompensation(comp.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: compensationTypes.includes(comp.value)
                        ? colors.slate
                        : colors.bone,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 13,
                        color: compensationTypes.includes(comp.value)
                          ? colors.surface
                          : colors.ink,
                      }}
                    >
                      {comp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Deliverable Load */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(14, tracking.display),
                }}
              >
                Deliverable load
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {LOAD_OPTIONS.map((load) => (
                  <TouchableOpacity
                    key={load.value}
                    onPress={() =>
                      setDeliverableLoad(
                        deliverableLoad === load.value ? "" : load.value,
                      )
                    }
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor:
                        deliverableLoad === load.value ? colors.slate : colors.bone,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 14,
                        color:
                          deliverableLoad === load.value ? colors.surface : colors.ink,
                      }}
                    >
                      {load.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.displaySemibold,
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(14, tracking.display),
                }}
              >
                Sort by
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSortBy(option.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        sortBy === option.value ? colors.slate : colors.bone,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 13,
                        color: sortBy === option.value ? colors.surface : colors.ink,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.stone,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.surface,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={onClearAll}>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.slate,
                  textDecorationLine: "underline",
                }}
              >
                Clear all {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: colors.slate,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 15,
                  color: colors.surface,
                }}
              >
                Apply filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AtmosphericBackground>
    </Modal>
  );
}
