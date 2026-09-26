import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Calendar, X, Plus, Edit2 } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";
import { colors, fonts, tracking, track } from "@/config/theme";

const DELIVERABLE_PRESETS = {
  light: [
    {
      type: "Instagram Reels",
      quantity: 2,
      description: "Showcase key features and vibe",
    },
    {
      type: "Instagram Story",
      quantity: 3,
      description: "Behind the scenes moments",
    },
    { type: "Photo Set", quantity: 5, description: "High-res property photos" },
  ],
  moderate: [
    {
      type: "TikTok Videos",
      quantity: 2,
      description: "Day in the life, property tour",
    },
    {
      type: "Instagram Reels",
      quantity: 3,
      description: "Highlight property and experience",
    },
    {
      type: "Instagram Story",
      quantity: 5,
      description: "Daily moments and activities",
    },
    {
      type: "Photo Set",
      quantity: 10,
      description: "Professional property shots",
    },
  ],
  heavy: [
    {
      type: "TikTok Videos",
      quantity: 4,
      description: "Viral-style property content, full tour",
    },
    {
      type: "Instagram Reels",
      quantity: 5,
      description: "Full property tour and features",
    },
    {
      type: "Instagram Story",
      quantity: 8,
      description: "Complete stay documentation",
    },
    {
      type: "YouTube Short",
      quantity: 2,
      description: "Extended property showcase",
    },
    {
      type: "Photo Set",
      quantity: 15,
      description: "Comprehensive photo library",
    },
  ],
};

export default function CreateListingDeliverables() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({
    type: "",
    quantity: 1,
    description: "",
  });

  useEffect(() => {
    const init = async () => {
      await ListingDraftStore.init();
      const currentDraft = ListingDraftStore.getDraft();

      // Check if we're in edit mode
      if (params.editMode === "true" && params.id) {
        const existingListing = await ListingDraftStore.getListingById(
          params.id,
        );
        if (existingListing && Object.keys(existingListing).length > 0) {
          // Pre-populate draft with existing listing data
          await ListingDraftStore.updateDraft({
            ...existingListing,
            _editingId: params.id,
          });
          setDraft(existingListing);
          return; // Skip auto-populate preset if editing
        }
      }

      setDraft(currentDraft);

      // Auto-populate deliverables if empty
      if (
        currentDraft.deliverables.length === 0 &&
        currentDraft.deliverable_load
      ) {
        const preset = DELIVERABLE_PRESETS[currentDraft.deliverable_load];
        if (preset) {
          await ListingDraftStore.updateDraft({ deliverables: preset });
        }
      }
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

  const addDeliverable = async () => {
    if (!newDeliverable.type.trim() || !newDeliverable.description.trim()) {
      Alert.alert("Missing Info", "Please fill in all deliverable fields");
      return;
    }

    await ListingDraftStore.updateDraft({
      deliverables: [...draft.deliverables, { ...newDeliverable }],
    });

    setNewDeliverable({ type: "", quantity: 1, description: "" });
  };

  const removeDeliverable = async (idx) => {
    const updated = draft.deliverables.filter((_, i) => i !== idx);
    await ListingDraftStore.updateDraft({ deliverables: updated });
  };

  const openEditModal = (idx) => {
    setEditingIndex(idx);
    setEditingDeliverable({ ...draft.deliverables[idx] });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (
      !editingDeliverable.type.trim() ||
      !editingDeliverable.description.trim()
    ) {
      Alert.alert("Missing Info", "Please fill in all fields");
      return;
    }

    const updated = [...draft.deliverables];
    updated[editingIndex] = editingDeliverable;
    await ListingDraftStore.updateDraft({ deliverables: updated });
    setShowEditModal(false);
    setEditingIndex(null);
    setEditingDeliverable(null);
  };

  const getTotalDeliverables = () => {
    return draft.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  };

  const handleNext = () => {
    if (
      !draft.collaboration_window.startDate ||
      !draft.collaboration_window.endDate
    ) {
      Alert.alert("Missing Dates", "Please set collaboration window dates");
      return;
    }
    router.push({
      pathname: "/host/listings/create/review",
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
    draft.collaboration_window.startDate &&
    draft.collaboration_window.endDate &&
    draft.deliverables.length > 0;

  const renderDeliverableCard = ({ item, index }) => (
    <View
      style={{
        width: 200,
        backgroundColor: colors.bone,
        borderRadius: 16,
        padding: 14,
        marginRight: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 15,
            color: colors.ink,
            flex: 1,
            paddingRight: 8,
          }}
        >
          {item.quantity}x {item.type}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={() => openEditModal(index)}
            style={{ padding: 4 }}
          >
            <Edit2 color={colors.slate} size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => removeDeliverable(index)}
            style={{ padding: 4 }}
          >
            <X color={colors.slate} size={16} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, lineHeight: 18 }}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <ListingCreationShell
      currentStep={3}
      totalSteps={4}
      onBack={() => router.back()}
      onSaveExit={handleSaveExit}
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      <View style={{ paddingTop: 24 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              letterSpacing: track(28, tracking.display),
              marginBottom: 8,
            }}
          >
            Deliverables & dates
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
            Define when the collaboration happens and what content you need.
          </Text>

          {/* Collaboration Window */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Calendar color={colors.slate} size={20} />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 16,
                  color: colors.ink,
                  letterSpacing: track(16, tracking.display),
                }}
              >
                Collaboration window *
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginBottom: 6 }}
                >
                  Start date
                </Text>
                <TextInput
                  value={draft.collaboration_window.startDate}
                  onChangeText={(val) =>
                    updateField("collaboration_window", {
                      ...draft.collaboration_window,
                      startDate: val,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.sage}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginBottom: 6 }}
                >
                  End date
                </Text>
                <TextInput
                  value={draft.collaboration_window.endDate}
                  onChangeText={(val) =>
                    updateField("collaboration_window", {
                      ...draft.collaboration_window,
                      endDate: val,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.sage}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
              </View>
            </View>
          </View>

          {/* Turnaround Time */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 8,
              }}
            >
              Deliverables due (days after stay)
            </Text>
            <TextInput
              value={String(draft.turnaround_time_days)}
              onChangeText={(val) =>
                updateField("turnaround_time_days", parseInt(val) || 14)
              }
              placeholder="14"
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

          {/* Deliverables Summary */}
          <View
            style={{
              backgroundColor: colors.mint,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 15,
                color: colors.ink,
                marginBottom: 4,
              }}
            >
              {getTotalDeliverables()} total deliverables
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
              Across {draft.deliverables.length} format
              {draft.deliverables.length !== 1 ? "s" : ""} •{" "}
              {draft.deliverable_load} load
            </Text>
          </View>

          {/* Deliverables Label */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 16,
                color: colors.ink,
                letterSpacing: track(16, tracking.display),
              }}
            >
              Deliverables
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>
              Swipe to see all →
            </Text>
          </View>
        </View>

        {/* Horizontal Scrollable Deliverables */}
        {draft.deliverables.length > 0 && (
          <FlatList
            data={draft.deliverables}
            renderItem={renderDeliverableCard}
            keyExtractor={(item, idx) => idx.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          />
        )}

        <View style={{ paddingHorizontal: 20 }}>
          {/* Add Custom Deliverable */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.stone,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 12,
              }}
            >
              Add custom deliverable
            </Text>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={String(newDeliverable.quantity)}
                  onChangeText={(val) =>
                    setNewDeliverable({
                      ...newDeliverable,
                      quantity: parseInt(val) || 1,
                    })
                  }
                  placeholder="Qty"
                  placeholderTextColor={colors.sage}
                  keyboardType="number-pad"
                  style={{
                    width: 60,
                    backgroundColor: colors.bone,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                    textAlign: "center",
                  }}
                />
                <TextInput
                  value={newDeliverable.type}
                  onChangeText={(val) =>
                    setNewDeliverable({ ...newDeliverable, type: val })
                  }
                  placeholder="Platform/Type (e.g., Instagram Reels)"
                  placeholderTextColor={colors.sage}
                  style={{
                    flex: 1,
                    backgroundColor: colors.bone,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
              </View>

              <TextInput
                value={newDeliverable.description}
                onChangeText={(val) =>
                  setNewDeliverable({ ...newDeliverable, description: val })
                }
                placeholder="Description"
                placeholderTextColor={colors.sage}
                multiline
                style={{
                  backgroundColor: colors.bone,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />

              <TouchableOpacity
                onPress={addDeliverable}
                style={{
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.slate,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus color={colors.surface} size={18} />
                <Text
                  style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}
                >
                  Add deliverable
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Policies */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 16,
                color: colors.ink,
                letterSpacing: track(16, tracking.display),
                marginBottom: 16,
              }}
            >
              Policies
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 14,
                    color: colors.ink,
                    marginBottom: 8,
                  }}
                >
                  Revision policy
                </Text>
                <TextInput
                  value={draft.revision_policy}
                  onChangeText={(val) => updateField("revision_policy", val)}
                  placeholder="e.g., 1 round of minor revisions"
                  placeholderTextColor={colors.sage}
                  multiline
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                    minHeight: 70,
                    textAlignVertical: "top",
                  }}
                />
              </View>

              <View>
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 14,
                    color: colors.ink,
                    marginBottom: 8,
                  }}
                >
                  Usage rights
                </Text>
                <TextInput
                  value={draft.usage_rights}
                  onChangeText={(val) => updateField("usage_rights", val)}
                  placeholder="e.g., Perpetual marketing license"
                  placeholderTextColor={colors.sage}
                  multiline
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.stone,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.ink,
                    minHeight: 70,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Edit Modal — an opaque dialog, not a translucent surface, so it
          stays a plain themed View rather than <Glass>. */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(25,37,36,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.ink,
                letterSpacing: track(20, tracking.display),
                marginBottom: 20,
              }}
            >
              Edit Deliverable
            </Text>

            {editingDeliverable && (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ width: 80 }}>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: colors.slate,
                        marginBottom: 6,
                      }}
                    >
                      Quantity
                    </Text>
                    <TextInput
                      value={String(editingDeliverable.quantity)}
                      onChangeText={(val) =>
                        setEditingDeliverable({
                          ...editingDeliverable,
                          quantity: parseInt(val) || 1,
                        })
                      }
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: colors.bone,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontFamily: fonts.body,
                        fontSize: 15,
                        color: colors.ink,
                        textAlign: "center",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: colors.slate,
                        marginBottom: 6,
                      }}
                    >
                      Type
                    </Text>
                    <TextInput
                      value={editingDeliverable.type}
                      onChangeText={(val) =>
                        setEditingDeliverable({
                          ...editingDeliverable,
                          type: val,
                        })
                      }
                      placeholder="TikTok Videos"
                      placeholderTextColor={colors.sage}
                      style={{
                        backgroundColor: colors.bone,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontFamily: fonts.body,
                        fontSize: 15,
                        color: colors.ink,
                      }}
                    />
                  </View>
                </View>

                <View>
                  <Text
                    style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginBottom: 6 }}
                  >
                    Description
                  </Text>
                  <TextInput
                    value={editingDeliverable.description}
                    onChangeText={(val) =>
                      setEditingDeliverable({
                        ...editingDeliverable,
                        description: val,
                      })
                    }
                    placeholder="Describe what you want"
                    placeholderTextColor={colors.sage}
                    multiline
                    style={{
                      backgroundColor: colors.bone,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: colors.ink,
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowEditModal(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: colors.bone,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 15,
                        color: colors.ink,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: colors.slate,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}
                    >
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ListingCreationShell>
  );
}
