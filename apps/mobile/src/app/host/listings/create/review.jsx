import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { ChevronDown, ChevronUp, Eye, DollarSign } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";
import { api } from "@/convex/_generated/api";
import { colors as theme, fonts, tracking, track } from "@/config/theme";


export default function CreateListingReview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [showFees, setShowFees] = useState(false);
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const finalizeUpload = useMutation(api.uploads.finalizeUpload);

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
            _editingId: params.id,
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

  const fee = ListingDraftStore.calculateFee();

  const getTotalDeliverables = () => {
    return draft.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  };

  const getTierLabel = (tier) => {
    const labels = {
      ugc_beginner: "UGC Beginner",
      ugc_pro: "UGC Pro",
      micro: "Micro",
      mid: "Mid",
    };
    return labels[tier] || tier;
  };

  const getCompensationDisplay = () => {
    if (draft.compensation_type === "free_stay") {
      return `${draft.stay_nights} night${draft.stay_nights > 1 ? "s" : ""} free stay`;
    } else if (draft.compensation_type === "paid") {
      return `$${draft.cash_payout} cash`;
    } else {
      return `${draft.stay_nights}N + $${draft.cash_payout} cash`;
    }
  };

  // Publishing moved to the payment step so a listing can't go live without a
  // method on file for the platform fee; the draft (and editMode) carries over.
  const goToPayment = () => {
    router.push({
      pathname: "/host/listings/create/payment",
      params:
        params.editMode === "true" && params.id
          ? { editMode: "true", id: String(params.id) }
          : {},
    });
  };

  const handleSaveDraft = async () => {
    try {
      if (!profile?._id) throw new Error("Your host profile isn't loaded yet.");
      const editingId = params.editMode === "true" && params.id ? String(params.id) : draft?._editingId;

      const photos = [];
      for (const uri of draft.images || []) {
        if (/^https?:\/\//.test(uri)) {
          photos.push(uri);
          continue;
        }
        const blob = await (await fetch(uri)).blob();
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });
        if (!res.ok) throw new Error("A photo failed to upload.");
        const { storageId } = await res.json();
        photos.push(await finalizeUpload({ storageId }));
      }

      const cashy = draft.compensation_type === "paid" || draft.compensation_type === "hybrid";
      const stays = draft.compensation_type === "free_stay" || draft.compensation_type === "hybrid";
      const win = draft.collaboration_window || {};
      const fields = {
        title: draft.title || "Untitled listing",
        location: [draft.location_city, draft.location_country].filter(Boolean).join(", "),
        location_city: draft.location_city,
        location_country: draft.location_country,
        property_url: draft.airbnb_url || undefined,
        collaboration_brief: draft.collaboration_brief,
        compensation_type: draft.compensation_type,
        cash_amount: cashy ? draft.cash_payout || 0 : undefined,
        nights: stays ? draft.stay_nights : undefined,
        stay_value: stays ? (draft.stay_nights || 0) * 200 : undefined,
        creator_tier: draft.creator_tier_required,
        deliverable_load: draft.deliverable_load,
        image: photos[0],
        gallery_images: photos,
        perks: draft.perks || [],
        vibe_tags: draft.vibe_tags || [],
        affiliate_code: draft.affiliate_code || undefined,
        collab_start: win.startDate || undefined,
        collab_end: win.endDate || undefined,
        turnaround_days: draft.turnaround_time_days,
        deliverables_list: (draft.deliverables || []).map((d) => ({
          type: d.type,
          quantity: d.quantity,
          description: d.description || "",
        })),
        deliverable_count: (draft.deliverables || []).reduce((sum, d) => sum + (d.quantity || 0), 0),
        revision_policy: draft.revision_policy,
        usage_rights: draft.usage_rights,
      };

      if (editingId) {
        await updateListing({ id: editingId, ...fields, status: "draft" });
      } else {
        await createListing({
          ...fields,
          host_id: String(profile._id),
          status: "draft",
          payout_handling: "platform",
        });
      }
      await ListingDraftStore.clearDraft();
      Alert.alert(
        "Draft Saved",
        "You can continue editing later from your dashboard.",
        [
          {
            text: "OK",
            onPress: () => router.push("/host/(tabs)/dashboard"),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", error?.data || error?.message || "Failed to save draft. Please try again.");
    }
  };

  const isEditMode = params.editMode === "true";

  return (
    <>
      <ListingCreationShell
        currentStep={4}
        totalSteps={5}
        onBack={() => router.back()}
        onSaveExit={() => router.push("/host/(tabs)/dashboard")}
        onNext={goToPayment}
        nextLabel="Next: payment"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Eye color={theme.slate} size={24} />
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                color: theme.ink,
                letterSpacing: track(28, tracking.display),
              }}
            >
              Review & publish
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: theme.slate,
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Here's how your listing will appear to creators. Review everything
            before publishing.
          </Text>

          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.stone,
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.bone,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 24,
                  color: theme.ink,
                  letterSpacing: track(24, tracking.display),
                  marginBottom: 6,
                }}
              >
                {draft.title}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 15, color: theme.slate }}>
                {draft.location_city}, {draft.location_country}
              </Text>
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.bone,
              }}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: theme.bone,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 13,
                      color: theme.ink,
                    }}
                  >
                    {getTierLabel(draft.creator_tier_required)}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: theme.mint,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 13,
                      color: theme.ink,
                    }}
                  >
                    {getCompensationDisplay()}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: theme.bone,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 13,
                      color: theme.ink,
                    }}
                  >
                    {draft.deliverable_load.charAt(0).toUpperCase() +
                      draft.deliverable_load.slice(1)}{" "}
                    Load
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.bone,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: theme.ink,
                  letterSpacing: track(18, tracking.display),
                  marginBottom: 12,
                }}
              >
                The Offer
              </Text>
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 14,
                    color: theme.slate,
                    marginBottom: 6,
                  }}
                >
                  Add-ons
                </Text>
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 15, color: theme.ink, marginBottom: 4 }}
                >
                  • {getCompensationDisplay()}
                </Text>
                {draft.perks.map((perk, idx) => (
                  <Text
                    key={idx}
                    style={{ fontFamily: fonts.body, fontSize: 15, color: theme.ink, marginBottom: 4 }}
                  >
                    • {perk}
                  </Text>
                ))}
                {draft.affiliate_code && (
                  <Text
                    style={{ fontFamily: fonts.body, fontSize: 15, color: theme.ink, marginBottom: 4 }}
                  >
                    • Affiliate code: {draft.affiliate_code}
                  </Text>
                )}
              </View>
              <View>
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 14,
                    color: theme.slate,
                    marginBottom: 6,
                  }}
                >
                  What you deliver
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 15, color: theme.ink }}>
                  {getTotalDeliverables()} total deliverables across{" "}
                  {draft.deliverables.length} format
                  {draft.deliverables.length > 1 ? "s" : ""}
                </Text>
              </View>

              {draft.vibe_tags.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {draft.vibe_tags.map((tag, idx) => (
                      <View
                        key={idx}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 12,
                          backgroundColor: theme.bone,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.bodySemibold,
                            fontSize: 12,
                            color: theme.ink,
                          }}
                        >
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.bone,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: theme.ink,
                  letterSpacing: track(18, tracking.display),
                  marginBottom: 12,
                }}
              >
                Dates & Deadlines
              </Text>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: theme.ink,
                  marginBottom: 4,
                }}
              >
                Collaboration Window
              </Text>
              <Text
                style={{ fontFamily: fonts.body, fontSize: 14, color: theme.slate, marginBottom: 12 }}
              >
                {draft.collaboration_window.startDate} -{" "}
                {draft.collaboration_window.endDate}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: theme.ink,
                  marginBottom: 4,
                }}
              >
                Deliverables Due
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.slate }}>
                {draft.turnaround_time_days} days after stay
              </Text>
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.bone,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: theme.ink,
                  letterSpacing: track(18, tracking.display),
                  marginBottom: 12,
                }}
              >
                Deliverables
              </Text>
              <View style={{ gap: 10 }}>
                {draft.deliverables.slice(0, 2).map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: theme.bone,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 15,
                        color: theme.ink,
                        marginBottom: 4,
                      }}
                    >
                      {item.quantity}x {item.type}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.slate }}>
                      {item.description}
                    </Text>
                  </View>
                ))}
                {draft.deliverables.length > 2 && (
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: theme.slate,
                      textAlign: "center",
                      paddingVertical: 4,
                    }}
                  >
                    +{draft.deliverables.length - 2} more
                  </Text>
                )}
              </View>
            </View>

            <View style={{ padding: 20 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: theme.ink,
                  letterSpacing: track(18, tracking.display),
                  marginBottom: 12,
                }}
              >
                Things to know
              </Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 14,
                      color: theme.ink,
                      marginBottom: 4,
                    }}
                  >
                    Revision policy
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.slate }}>
                    {draft.revision_policy}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 14,
                      color: theme.ink,
                      marginBottom: 4,
                    }}
                  >
                    Usage rights
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.slate }}>
                    {draft.usage_rights}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Fee-disclosure callout: amber "warning" palette, no brand-token
              equivalent (the 9-color palette has no yellow/amber) — a third,
              distinct amber family in this lane alongside #D4A843 and
              #F5D547. Flagged for design review; left as literals. */}
          <TouchableOpacity
            onPress={() => setShowFees(!showFees)}
            style={{
              backgroundColor: "#FFF8E5",
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "#FFE5A0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <DollarSign color="#D97706" size={20} />
                <Text
                  style={{ fontFamily: fonts.display, fontSize: 16, color: theme.ink }}
                >
                  Host-only: Pricing & Fees
                </Text>
              </View>
              {showFees ? (
                <ChevronUp color="#D97706" size={20} />
              ) : (
                <ChevronDown color="#D97706" size={20} />
              )}
            </View>

            {showFees && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#FFE5A0",
                }}
              >
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{ fontFamily: fonts.body, fontSize: 13, color: theme.slate, marginBottom: 4 }}
                  >
                    Platform fee
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 16,
                      color: theme.ink,
                    }}
                  >
                    ${fee.calculatedFee || fee.amount}
                  </Text>
                  <Text
                    style={{ fontFamily: fonts.body, fontSize: 12, color: theme.sage, marginTop: 2 }}
                  >
                    {fee.description}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#FFFAEB",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 12,
                      color: "#D97706",
                    }}
                  >
                    ⚠️ Creators don't see these fees
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveDraft}
            style={{
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: theme.bone,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: theme.ink }}>
              Save draft
            </Text>
          </TouchableOpacity>
        </View>
      </ListingCreationShell>

    </>
  );
}
