import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useAction, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { CreditCard, Check, Landmark, Info } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";
import ConfettiOverlay from "@/components/ConfettiOverlay";
import { api } from "@/convex/_generated/api";
import { colors as theme, fonts } from "@/config/theme";

// ACH is required at or above this cash value. Card processing (~2.9% + 30c on
// the whole collect-and-forward charge) eats most of the platform fee at that
// size, where ACH stays capped around $5. Mirrors the web app's
// convex/lib/fees.ts, duplicated because the mobile app doesn't import from the
// Convex source tree. Only drives copy and which button shows — the real gate
// is server-side in createHostCardSetupSession, so drift can't let a card
// through where ACH is required.
const ACH_REQUIRED_ABOVE_CASH_VALUE = 300;

// Step 5. The mobile wizard used to publish straight from Review, so a host
// could put a listing live with no payment method on file — the web wizard has
// never allowed that, since the platform fee is charged to this card when a
// collaboration completes.
export default function CreateListingPayment() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const createSetupSession = useAction(api.stripe.createHostCardSetupSession);
  const verifySetupSession = useAction(api.stripe.verifyHostCardSetupSession);
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const finalizeUpload = useMutation(api.uploads.finalizeUpload);

  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [noUSBank, setNoUSBank] = useState(false);
  const [error, setError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const isEditMode = params.editMode === "true";

  useEffect(() => {
    const unsub = ListingDraftStore.subscribe(() => setDraft(ListingDraftStore.getDraft()));
    return unsub;
  }, []);

  const editingId = draft?._editingId;
  const existingListing = useQuery(api.listings.getById, editingId ? { id: editingId } : "skip");

  const cashAmount = draft?.cash_payout || 0;
  const hasSavedMethod = !!profile?.stripe_default_payment_method_id;
  const hasACH = hasSavedMethod && profile?.stripe_payment_method_type === "us_bank_account";

  // Web also exempts paid-in-person listings, which never touch our
  // processing. The mobile draft has no payout_handling field yet, so this
  // matches the server rule instead — cash amount and the no-US-bank opt-out.
  const requiresACH = cashAmount >= ACH_REQUIRED_ABOVE_CASH_VALUE && !noUSBank;
  const needsMethod =
    !!profile && profile.is_admin !== true && (!hasSavedMethod || (requiresACH && !hasACH));

  const addPaymentMethod = async () => {
    setError("");
    setBusy(true);
    try {
      const { url, sessionId } = await createSetupSession({
        // Stripe Checkout only accepts http(s) here, so these land on the
        // marketing site. The app doesn't rely on the redirect: it verifies the
        // session by id once the browser closes.
        successUrl: "https://collabnb.com/?card=saved",
        cancelUrl: "https://collabnb.com/?card=cancelled",
        cashAmount,
        noUSBank,
      });

      await WebBrowser.openBrowserAsync(url);

      try {
        await verifySetupSession({ sessionId });
      } catch {
        // Dismissing the browser without finishing is the common case, so this
        // isn't surfaced as a failure — the button below still says "Add".
        setError("That wasn't finished. Add a payment method to publish.");
      }
    } catch (err) {
      setError(err?.message || "Couldn't start payment setup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (needsMethod) {
      await addPaymentMethod();
      return;
    }

    setError("");
    setPublishing(true);
    try {
      if (!profile?._id) throw new Error("Your host profile isn't loaded yet. Please try again.");
      if (editingId && existingListing === undefined) {
        throw new Error("Still loading your listing. Please try again.");
      }
      if (editingId && existingListing?.is_sample === true) {
        throw new Error("Sample listings can't be edited. Create your own listing instead.");
      }

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
        if (!res.ok) throw new Error("A photo failed to upload. Please try again.");
        const { storageId } = await res.json();
        photos.push(await finalizeUpload({ storageId }));
      }

      const cashy = draft.compensation_type === "paid" || draft.compensation_type === "hybrid";
      const stays = draft.compensation_type === "free_stay" || draft.compensation_type === "hybrid";
      const win = draft.collaboration_window || {};
      const fields = {
        title: draft.title,
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
        await updateListing({ id: editingId, ...fields });
        await ListingDraftStore.clearDraft();
        Alert.alert("Changes Saved ✓", "Your listing has been updated.", [
          {
            text: "View Listing",
            onPress: () => router.replace(`/listing-detail?id=${editingId}&isHost=true`),
          },
        ]);
      } else {
        await createListing({
          ...fields,
          host_id: String(profile._id),
          status: "published",
          payout_handling: "platform",
        });
        await ListingDraftStore.clearDraft();
        setShowConfetti(true);
      }
    } catch (err) {
      setError(err?.data || err?.message || "Failed to save listing. Please try again.");
      setPublishing(false);
    }
  };

  const savedLabel = hasACH
    ? `Bank account ending ${profile?.stripe_card_last4 ?? "••••"}`
    : `${profile?.stripe_card_brand ?? "Card"} ending ${profile?.stripe_card_last4 ?? "••••"}`;

  const nextLabel = publishing
    ? isEditMode
      ? "Saving..."
      : "Publishing..."
    : needsMethod
      ? requiresACH
        ? "Add bank account"
        : "Add card"
      : isEditMode
        ? "Save Changes"
        : "Publish listing";

  const celebrate = () => {
    setShowConfetti(false);
    Alert.alert("Listing Created 🎉", "Your listing is now live and visible to creators.", [
      { text: "View Listings", onPress: () => router.replace("/host/(tabs)/dashboard") },
    ]);
  };

  return (
    <>
    <ListingCreationShell
      currentStep={5}
      totalSteps={5}
      onBack={() => router.back()}
      onSaveExit={() => router.push("/host/(tabs)/dashboard")}
      onNext={publish}
      nextLabel={busy ? "Opening..." : nextLabel}
      nextDisabled={publishing || busy || profile === undefined}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 16 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: theme.ink }}>
          Payment method
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: theme.slate, lineHeight: 21 }}>
          You won't be charged now. Collabnb's platform fee is charged to this
          method once a collaboration completes.
        </Text>

        {profile === undefined ? (
          <ActivityIndicator color={theme.ink} style={{ marginTop: 24 }} />
        ) : (
          <>
            {hasSavedMethod ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.stone,
                }}
              >
                {hasACH ? (
                  <Landmark size={20} color={theme.ink} />
                ) : (
                  <CreditCard size={20} color={theme.ink} />
                )}
                <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: theme.ink }}>
                  {savedLabel}
                </Text>
                {!needsMethod ? <Check size={18} color={theme.ink} /> : null}
              </View>
            ) : null}

            {requiresACH && !hasACH ? (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: theme.bone,
                }}
              >
                <Info size={18} color={theme.slate} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: theme.slate, lineHeight: 20 }}>
                    This collaboration is ${cashAmount.toFixed(0)}. We ask for
                    bank account (ACH) details at ${ACH_REQUIRED_ABOVE_CASH_VALUE}{" "}
                    or more to keep processing costs sustainable.
                  </Text>
                  <TouchableOpacity onPress={() => setNoUSBank(true)}>
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 13,
                        color: theme.ink,
                        textDecorationLine: "underline",
                      }}
                    >
                      I don't have a US bank account
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: "#B4403A" }}>{error}</Text>
            ) : null}
          </>
        )}
      </View>
    </ListingCreationShell>
    {showConfetti ? <ConfettiOverlay onComplete={celebrate} /> : null}
    </>
  );
}
