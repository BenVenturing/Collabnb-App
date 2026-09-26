// ============================================================
// COLLABNB — Listing Detail Screen (Collabnb Style)
// File: /apps/mobile/src/app/listing-detail.jsx
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Image,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import MapView, { Marker } from "react-native-maps";
import { Share2, Heart, Quote, Star, Check, Plus } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import ListingDraftStore from "@/utils/ListingDraftStore";
import { AmenityIcon } from "@/lib/amenityIcons";

// Mirrors the compensation/deliverables formatting in (tabs)/index.jsx so a
// listing reads the same way on Explore and here — keep the two in sync.
function compensationLabel(l) {
  const cash = l.cash_amount;
  if (typeof cash === "number" && cash > 0) {
    return cash >= 1000 ? `$${(cash / 1000).toFixed(cash % 1000 ? 1 : 0)}k` : `$${cash}`;
  }
  const m = String(l.compensation || "").match(/\$([\d,]+)/);
  if (m) return `$${m[1]}`;
  if (l.compensation_type === "hybrid") return "Stay + cash";
  if (l.compensation_type === "free_stay" || l.compensation_type === "free") return "Complimentary stay";
  return l.collab_type || "Collab";
}

function deliverablesLabel(l) {
  if (typeof l.deliverables === "string" && l.deliverables) return l.deliverables;
  if (l.deliverables_list?.length) {
    return l.deliverables_list.map((d) => `${d.quantity}× ${d.type}`).join(", ");
  }
  if (l.deliverable_count) return `${l.deliverable_count} deliverables`;
  return "";
}

// Real Convex listing → the flat shape this screen renders. Field names here
// predate the Convex migration; kept as-is so the rest of the screen (built
// against them) doesn't need a wider rewrite.
function normalizeRealListing(l) {
  const images = l.gallery_images?.length ? l.gallery_images : l.image ? [l.image] : [];
  return {
    id: String(l._id),
    title: l.title,
    location: l.location_city && l.location_country ? `${l.location_city}, ${l.location_country}` : l.location,
    type: l.property_type || "Boutique stay",
    description: l.about || `A Collabnb opportunity in ${l.location_city || l.location || "a great location"}.`,
    host: l.host_name || "Collabnb host",
    host_id: l.host_id ? String(l.host_id) : undefined,
    tierRequired: l.creator_tier || l.creator_track,
    compensation: compensationLabel(l),
    deliverablesLoad: l.deliverable_count || l.deliverables_list?.length || 0,
    // Array of bullet strings for the "What we're looking for" list — distinct
    // from deliverablesRaw, the compact summary string the apply flow stores.
    deliverables: l.deliverables_list?.length
      ? l.deliverables_list.map((d) => `${d.quantity}× ${d.type}`)
      : deliverablesLabel(l)
        ? [deliverablesLabel(l)]
        : [],
    deliverablesRaw: deliverablesLabel(l),
    dates: l.dates_available || "Dates confirmed with host",
    status: l.status,
    coverImage: images[0],
    image: images[0],
    collab_type: l.collab_type,
    due_days: l.due_days,
    isSample: l.is_sample === true,
    amenities: l.amenities || [],
    what_you_get: l.what_you_get || [],
    what_you_deliver: l.what_you_deliver || "",
    requirements: l.requirements || [],
    creator_tier: l.creator_tier,
    locationFull: l.location_full || l.location,
    lat: l.lat,
    lng: l.lng,
  };
}

// listings.getById strips most fields server-side for limited-access viewers
// (unverified/trial-ended creators) and sets _redacted: true — mirrors web's
// RedactedListingDetail. Only the fields the backend still returns are used.
function normalizeRedactedListing(l) {
  return {
    id: String(l._id),
    location:
      l.location_city && l.location_country
        ? `${l.location_city}, ${l.location_country}`
        : l.location,
    compensation: compensationLabel(l),
    deliverables: deliverablesLabel(l),
    dates: l.dates_available,
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Set to true when liquid glass theming is ready to apply to this screen
const LIQUID_GLASS_READY = false;
// TODO: flip to true to re-enable gradient background

// Photo data for each listing
const LISTING_PHOTOS = {
  l1: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#C4D4C0", "#B8CCC0"] },
    { type: "gradient", colors: ["#B8CCC0", "#AEC4B8"] },
  ],
  l2: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#BCC8D4", "#A8BCC8"] },
    { type: "gradient", colors: ["#A8BCC8", "#9CB0BC"] },
  ],
  l3: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#CCC0A8", "#BEB09C"] },
    { type: "gradient", colors: ["#BEB09C", "#B0A48C"] },
  ],
  l4: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#BCC8B0", "#B0BCA4"] },
    { type: "gradient", colors: ["#B0BCA4", "#A4B098"] },
  ],
  1: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#C4D4C0", "#B8CCC0"] },
    { type: "gradient", colors: ["#B8CCC0", "#AEC4B8"] },
  ],
  2: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#BCC8D4", "#A8BCC8"] },
    { type: "gradient", colors: ["#A8BCC8", "#9CB0BC"] },
  ],
  3: [
    {
      type: "image",
      uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      isSample: true,
    },
    { type: "gradient", colors: ["#CCC0A8", "#BEB09C"] },
    { type: "gradient", colors: ["#BEB09C", "#B0A48C"] },
  ],
};

const SAMPLE_LISTING_DATA = {
  l1: {
    title: "Treehouse Suite — Summer Escape",
    location: "Asheville, NC",
    type: "Treehouse",
    description:
      "A stunning treehouse retreat nestled in the Blue Ridge Mountains. Floor-to-ceiling windows, a private deck, and total seclusion. Perfect for travel creators looking for a unique, shareable stay that stops the scroll.",
    host: "Blue Ridge Stays",
    tierRequired: "Micro Influencer",
    compensation: "Complimentary Stay",
    deliverablesLoad: "Moderate",
    deliverables: ["2 Instagram Reels", "4 Stories", "1 TikTok video"],
    dates: "June–August 2025",
    status: "active",
  },
  l2: {
    title: "Cliffside Villa — Weekend Collab",
    location: "Big Sur, CA",
    type: "Villa",
    description:
      "Dramatic oceanfront villa with unobstructed Pacific views. A sun-drenched retreat built for creators who want content that speaks for itself. Infinity pool, chef kitchen, and golden hour like nowhere else.",
    host: "Pacific Edge Properties",
    tierRequired: "UGC Pro",
    compensation: "Stay + $200 fee",
    deliverablesLoad: "Light",
    deliverables: ["3 UGC videos", "1 photo set (20+ images)"],
    dates: "July–September 2025",
    status: "active",
  },
  l3: {
    title: "Desert Dome — Content Weekend",
    location: "Sedona, AZ",
    type: "Dome",
    description:
      "A geodesic dome under the stars in red rock country. Fall asleep to the Milky Way and wake up to canyon views. Perfect for creators who want otherworldly content that no hotel can replicate.",
    host: "Sedona Domes",
    tierRequired: "UGC Beginner",
    compensation: "Complimentary Stay",
    deliverablesLoad: "Heavy",
    deliverables: [
      "2 TikTok videos",
      "3 Instagram Reels",
      "5 Stories",
      "1 blog post",
    ],
    dates: "Open dates",
    status: "paused",
  },
  l4: {
    title: "Lakeside Cabin — Fall Series",
    location: "Lake Tahoe, CA",
    type: "Cabin",
    description:
      "A private lakeside cabin surrounded by pine forest and mountain air. Built for creators who want moody autumn content with a luxury feel. Direct lake access, fire pit, and full creative freedom.",
    host: "Tahoe Retreats",
    tierRequired: "Influencer",
    compensation: "Stay + $500 fee",
    deliverablesLoad: "Moderate",
    deliverables: ["1 YouTube vlog", "2 Instagram Reels", "4 Stories"],
    dates: "September–November 2025",
    status: "draft",
  },
  1: {
    title: "Glacier Prime Cabin",
    location: "Lake Tahoe, CA",
    type: "Cabin",
    description:
      "New Hot Tub Installed! A stunning mountain retreat with breathtaking views. Perfect for travel creators looking for authentic nature content that stops the scroll.",
    host: "Lake Tahoe Stays",
    tierRequired: "Micro Influencer",
    compensation: "$450 + Free Stay",
    deliverablesLoad: "Moderate",
    deliverables: ["2 Instagram Reels", "2 TikTok videos", "1 blog post"],
    dates: "Year-round",
    status: "active",
  },
  2: {
    title: "Mountain View Lodge",
    location: "Lake Tahoe, CA",
    type: "Lodge",
    description:
      "Ski-in/Ski-out Access! Dramatic mountain views with premium amenities. A sun-drenched retreat built for creators who want content that speaks for itself.",
    host: "Alpine Retreats",
    tierRequired: "UGC Pro",
    compensation: "3D/4N Free Stay",
    deliverablesLoad: "Heavy",
    deliverables: ["3 Instagram Reels", "3 TikTok videos", "2 YouTube shorts"],
    dates: "Winter Season",
    status: "active",
  },
  3: {
    title: "Lakeside Retreat",
    location: "Lake Tahoe, CA",
    type: "Retreat",
    description:
      "Private Beach Access! Waterfront luxury with direct lake access. Built for creators who want high-end lifestyle content with natural beauty.",
    host: "Waterfront Escapes",
    tierRequired: "Influencer",
    compensation: "$1200 + Stay",
    deliverablesLoad: "Heavy",
    deliverables: [
      "4 Instagram Reels",
      "4 TikTok videos",
      "1 YouTube vlog",
      "10 Stories",
    ],
    dates: "Summer 2025",
    status: "active",
  },
};

// ─── APPLY MODAL ─────────────────────────────────────────────
// Mirrors the real apply flow in Collabnb Website/app/src/pages/ListingDetail.jsx
// (default pitch message, checkAndIncrement rate limit, collaborations.create +
// pitches.create + threads.create) instead of the app-upload version's
// fictional "counter proposal" toggle, which has no web equivalent.
function defaultPitch(listing, creatorProfile) {
  const handle = creatorProfile?.instagram_handle || creatorProfile?.tiktok_handle || creatorProfile?.username;
  const followers = creatorProfile?.follower_count;
  const followerStr = followers >= 1000 ? ` with ${Math.round(followers / 1000)}K followers` : "";
  const tierStr = creatorProfile?.tier || "travel creator";
  const nameStr = creatorProfile?.full_name || "I";

  return `Hi! I'm ${nameStr}${handle ? ` (@${handle})` : ""}${followerStr ? `, a ${tierStr}${followerStr}` : ""}.

I'd love to collaborate on ${listing.title} in ${listing.location}.

I'm available during ${listing.dates} and can deliver ${listing.deliverablesRaw || "the requested content"} within ${listing.due_days || 30} days of my stay. Looking forward to creating great content that showcases your property!

Let's make something great together.`;
}

function ApplyModal({ visible, onClose, listing, listingId, creatorProfile }) {
  const insets = useSafeAreaInsets();
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const checkAndIncrementCvx = useMutation(api.pitches.checkAndIncrement);
  const createCollabCvx = useMutation(api.collaborations.create);
  const createThreadCvx = useMutation(api.threads.create);
  const createPitchCvx = useMutation(api.pitches.create);

  useEffect(() => {
    if (visible && listing && !pitch) setPitch(defaultPitch(listing, creatorProfile));
  }, [visible, listing]);

  const handleSubmit = async () => {
    if (!creatorProfile?._id) {
      setError("Your profile is still loading — try again in a moment.");
      return;
    }
    setSubmitting(true);
    setError("");

    const creatorId = String(creatorProfile._id);
    const threadKey = `thread_${listingId}_${creatorId}`;

    try {
      const { allowed } = await checkAndIncrementCvx({ userId: creatorId });
      if (!allowed) {
        setError("You've reached your monthly application limit — try again next month.");
        setSubmitting(false);
        return;
      }

      let collaborationId;
      try {
        collaborationId = await createCollabCvx({
          listingId,
          propertyName: listing.title,
          location: listing.location,
          hostName: listing.host,
          image: listing.image,
          deliverables: listing.deliverablesRaw,
          listingDescription: listing.description,
          pitchMessage: pitch,
          hostId: listing.host_id,
        });
      } catch {
        // Non-fatal — the pitch below is still the source of truth for the host.
      }

      createThreadCvx({
        listingTitle: listing.title,
        hostName: listing.host,
        tag: "Application",
        lastMessage: pitch.slice(0, 100),
        participantId: listing.host_id,
        threadKey,
      }).catch(() => {});

      await createPitchCvx({
        listingId,
        listingTitle: listing.title,
        hostId: listing.host_id,
        creatorId,
        creatorName: creatorProfile.full_name || "Creator",
        creatorUsername: creatorProfile.username,
        creatorAvatar: creatorProfile.avatar_url,
        creatorTier: creatorProfile.tier,
        creatorFollowers: creatorProfile.follower_count,
        creatorEngagement: creatorProfile.engagement_rate,
        creatorPlatforms: [
          creatorProfile.instagram_handle && "Instagram",
          creatorProfile.tiktok_handle && "TikTok",
          creatorProfile.youtube_handle && "YouTube",
        ].filter(Boolean),
        message: pitch,
        type: "application",
        threadKey,
        collaborationId: collaborationId ? String(collaborationId) : undefined,
      });

      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      setSubmitting(false);
      setError(err?.data || err?.message || "Could not submit your application — try again.");
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setError("");
    setPitch("");
    onClose();
  };

  if (!listing) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(60,87,89,0.08)",
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#D0D5CE",
              }}
            />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#192524",
              letterSpacing: -0.3,
            }}
          >
            Apply to {listing.title}
          </Text>
        </View>

        {error ? (
          // Error State
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 16 }}>✕</Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Couldn't submit
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#3C5759",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 32,
              }}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 24,
                marginBottom: 12,
              }}
              onPress={() => setError("")}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                Back to application
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#959D90" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        ) : submitted ? (
          // Success State
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Application Submitted!
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#3C5759",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 8,
              }}
            >
              Your application is now pending review.
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#959D90",
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              The host will respond within 48 hours.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 24,
              }}
              onPress={handleClose}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Listing Info Card */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.55)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.75)",
                padding: 16,
                marginBottom: 24,
                shadowColor: "#3C5759",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>🏡</Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    flex: 1,
                  }}
                >
                  {listing.title}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {listing.location}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>💰</Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {listing.compensation}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>📦</Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {listing.deliverablesLoad} deliverables load
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "#D0D5CE",
                marginBottom: 24,
              }}
            />

            {/* Pitch Message — what the host actually sees; mirrors web's
                editable default-pitch textarea in ListingDetail.jsx */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: "#192524", marginBottom: 8 }}
              >
                Your message
              </Text>
              <TextInput
                style={{
                  backgroundColor: "rgba(255,255,255,0.55)",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(60,87,89,0.2)",
                  padding: 14,
                  fontSize: 14,
                  color: "#192524",
                  minHeight: 180,
                  lineHeight: 21,
                }}
                value={pitch}
                onChangeText={setPitch}
                multiline
                placeholder="Introduce yourself and explain why you're a great fit..."
                placeholderTextColor="#959D90"
                textAlignVertical="top"
              />
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "#D0D5CE",
                marginBottom: 24,
              }}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#3C5759",
                paddingVertical: 16,
                borderRadius: 24,
                alignItems: "center",
                opacity: submitting || !pitch.trim() ? 0.6 : 1,
              }}
              onPress={handleSubmit}
              disabled={submitting || !pitch.trim()}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Text>
            </TouchableOpacity>

            <Text
              style={{ fontSize: 13, color: "#959D90", textAlign: "center", marginTop: 16 }}
            >
              Hosts typically respond in 24–72 hours.
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── PHOTO GALLERY ───────────────────────────────────────────
function PhotoGallery({ onBack, onEdit, isHost, listingId, coverImage }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get photos for this listing, fallback to l1 if not found
  const photos = coverImage
    ? [{ type: "image", uri: coverImage }]
    : LISTING_PHOTOS[listingId] || LISTING_PHOTOS.l1;
  const totalImages = photos.length;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  const renderItem = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, height: 320, position: "relative" }}>
      {item.type === "image" && item.uri ? (
        <Image
          source={{ uri: item.uri }}
          style={{ width: SCREEN_WIDTH, height: 320 }}
          resizeMode="cover"
          onError={() => console.log("Image failed to load for listing photo")}
        />
      ) : (
        <LinearGradient
          colors={item.colors || ["#D1EBDB", "#3C5759"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{ width: SCREEN_WIDTH, height: 320 }}
        />
      )}
    </View>
  );

  return (
    <View style={{ height: 320, width: "100%", position: "relative" }}>
      {/* Swipeable Photo FlatList */}
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        keyExtractor={(item, index) => `photo-${index}`}
        renderItem={renderItem}
      />

      {/* Back Button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          left: 16,
          top: insets.top + 8,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={onBack}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "300",
            color: "#192524",
            marginTop: -2,
          }}
        >
          ‹
        </Text>
      </TouchableOpacity>

      {/* Edit Button (hosts only) */}
      {isHost && (
        <TouchableOpacity
          style={{
            position: "absolute",
            right: 16,
            top: insets.top + 8,
            paddingHorizontal: 16,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={onEdit}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#3C5759" }}>
            Edit
          </Text>
        </TouchableOpacity>
      )}

      {/* Dot indicators */}
      <View
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
        }}
      >
        {photos.map((_, index) => (
          <View
            key={index}
            style={{
              width: currentIndex === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                currentIndex === index ? "#FFFFFF" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </View>

      {/* Photo Counter Badge */}
      <View
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
          {currentIndex + 1} / {totalImages}
        </Text>
      </View>
    </View>
  );
}

// ─── HOST AVATAR ─────────────────────────────────────────────
function HostAvatar({ name, avatarUrl }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl && !imgError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        onError={() => setImgError(true)}
        style={{ width: 48, height: 48, borderRadius: 24 }}
      />
    );
  }

  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#D1EBDB",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#3C5759" }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── REDACTED LISTING (limited-access teaser) ──────────────────
function RedactedListingDetail({ listing, onBack, onSubscribe }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Blurred hero */}
        <View style={{ height: 300, position: "relative", overflow: "hidden" }}>
          <LinearGradient
            colors={["#192524", "#3C5759"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={{ width: "100%", height: "100%" }}
          />
          <BlurView
            intensity={40}
            tint="dark"
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🔒</Text>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              Photos hidden
            </Text>
          </BlurView>
          <TouchableOpacity
            onPress={onBack}
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>
          {/* Blurred title placeholder */}
          <View
            style={{
              height: 24,
              width: "58%",
              backgroundColor: "rgba(25,37,36,0.12)",
              borderRadius: 6,
              marginBottom: 12,
            }}
          />

          {listing.location && (
            <Text style={{ fontSize: 15, color: "#3C5759", fontWeight: "600", marginBottom: 20 }}>
              📍 {listing.location}
            </Text>
          )}

          {/* Offer stats — visible */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
            {listing.compensation && (
              <View style={{ flex: 1, minWidth: 100, backgroundColor: "#F7F7F5", borderRadius: 16, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#959D90", marginBottom: 4, textTransform: "uppercase" }}>
                  Compensation
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#192524" }}>{listing.compensation}</Text>
              </View>
            )}
            {listing.deliverables && (
              <View style={{ flex: 1, minWidth: 100, backgroundColor: "#F7F7F5", borderRadius: 16, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#959D90", marginBottom: 4, textTransform: "uppercase" }}>
                  Deliverables
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#192524" }}>{listing.deliverables}</Text>
              </View>
            )}
            {listing.dates && (
              <View style={{ flex: 1, minWidth: 100, backgroundColor: "#F7F7F5", borderRadius: 16, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#959D90", marginBottom: 4, textTransform: "uppercase" }}>
                  Dates
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#192524" }}>{listing.dates}</Text>
              </View>
            )}
          </View>

          {/* Blurred description placeholder */}
          <View style={{ marginBottom: 28 }}>
            {[92, 97, 85, 72, 60].map((w, i) => (
              <View
                key={i}
                style={{
                  height: 12,
                  width: `${w}%`,
                  backgroundColor: "rgba(25,37,36,0.08)",
                  borderRadius: 5,
                  marginBottom: 10,
                }}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={onSubscribe}
            style={{
              backgroundColor: "#192524",
              paddingVertical: 16,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Subscribe to unlock
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── SAVE TO COLLECTION MODAL ───────────────────────────────
function SaveCollectionModal({ visible, onClose, listingId, collections, onToggle, onCreateAndSave }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateAndSave(name);
    setNewName("");
    setCreating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(25,37,36,0.45)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: 32,
              maxHeight: "70%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#192524" }}>Save to collection</Text>
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, color: "#3C5759" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {collections.map((col) => {
                const isIn = col.listing_ids.includes(listingId);
                return (
                  <TouchableOpacity
                    key={String(col._id)}
                    onPress={() => onToggle(String(col._id))}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 16,
                      backgroundColor: isIn ? "rgba(209,235,219,0.4)" : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}>{col.name}</Text>
                    {isIn && <Check size={18} color="#2d6a4f" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
              {collections.length === 0 && (
                <Text style={{ fontSize: 14, color: "#959D90", paddingVertical: 8 }}>
                  No collections yet — create one below.
                </Text>
              )}
            </ScrollView>

            {creating ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Collection name"
                  autoFocus
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#E5E5E0",
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: "#192524",
                  }}
                />
                <TouchableOpacity
                  onPress={handleCreate}
                  style={{ backgroundColor: "#192524", borderRadius: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setCreating(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 12,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#E5E5E0",
                  borderStyle: "dashed",
                }}
              >
                <Plus size={16} color="#3C5759" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#3C5759" }}>New collection</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const listingId = params.listingId || params.id || "l1";
  const isHost = params.isHost === "true";

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");

  const convexListing = useQuery(api.listings.getById, {
    id: listingId,
    viewerId: profile?._id ? String(profile._id) : undefined,
  });

  // Real host's Clerk-synced profile (avatar/name) — same source as web's
  // "Listed by" row. listings.getById strips host_id for redacted listings,
  // so this naturally skips for limited-access viewers.
  const hostProfile = useQuery(
    api.profiles.getById,
    convexListing?.host_id ? { id: String(convexListing.host_id) } : "skip",
  );

  // A creator's own collaborations double as the "have I applied to this
  // listing" check — same product model as CollabContext.hasApplied on web.
  const myCollabs = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );
  const hasApplied = (myCollabs || []).some((c) => c.listing_id === listingId);

  // Reviews creators left on past collaborations for this listing — same
  // query web's ReviewsCarousel uses, so both platforms show the same set.
  const listingReviews = useQuery(
    api.reviews.getForListing,
    convexListing && !convexListing._redacted ? { listingId } : "skip",
  );

  // Save-to-collection — real Convex collections (api.collections.*), the
  // same backing store as web, so a save here shows up there and vice versa.
  const myCollections = useQuery(
    api.collections.getByUser,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );
  const createCollectionCvx = useMutation(api.collections.create);
  const toggleSaveCvx = useMutation(api.collections.toggleSave);
  const isSaved = (myCollections || []).some((c) => c.listing_ids.includes(listingId));

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redacted, setRedacted] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  useEffect(() => {
    if (convexListing === undefined) return; // still loading
    if (convexListing?._redacted) {
      // Limited-access viewer (unverified/trial-ended creator) — backend
      // already stripped title/host/images, so render the teaser instead
      // of a half-blank screen.
      setRedacted(true);
      setListing(normalizeRedactedListing(convexListing));
      setLoading(false);
      return;
    }
    if (convexListing) {
      setRedacted(false);
      setListing(normalizeRealListing(convexListing));
      setLoading(false);
      return;
    }
    // Not a real published Convex listing — e.g. a host previewing a draft
    // that only exists in ListingDraftStore, or a stale sample id.
    setRedacted(false);
    (async () => {
      try {
        const rawListingFromStore = await ListingDraftStore.getListingById(listingId);
        const merged = {
          ...SAMPLE_LISTING_DATA[listingId],
          ...rawListingFromStore,
        };
        setListing(merged);
      } catch (error) {
        console.error("[ListingDetail] Error loading listing:", error);
        setListing(SAMPLE_LISTING_DATA[listingId] || SAMPLE_LISTING_DATA.l1);
      } finally {
        setLoading(false);
      }
    })();
  }, [convexListing, listingId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#3C5759" />
        </View>
      </View>
    );
  }

  if (redacted && listing) {
    return (
      <RedactedListingDetail
        listing={listing}
        onBack={() => router.back()}
        onSubscribe={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#192524",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Listing not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#3C5759",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push({
      pathname: "/host/listings/create/basics",
      params: { id: listingId, editMode: "true" },
    });
  };

  const handleApply = () => {
    setApplyVisible(true);
  };

  const handleShare = () => {
    Share.share({
      title: listing.title,
      message: `${listing.title} on Collabnb — https://collabnb.com/listing/${listingId}`,
      url: `https://collabnb.com/listing/${listingId}`,
    }).catch(() => {});
  };

  const descriptionLines = listing.description?.split("\n") || [];
  const shouldTruncate = descriptionLines.length > 3;
  const displayDescription = showFullDescription
    ? listing.description
    : descriptionLines.slice(0, 3).join("\n");

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />

      {/* Photo Gallery */}
      <PhotoGallery
        onBack={handleBack}
        onEdit={handleEdit}
        isHost={isHost}
        listingId={listingId}
        coverImage={listing.coverImage}
      />

      {/* White Content Card */}
      <ScrollView
        style={{
          flex: 1,
          marginTop: -40,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1 — Title Block */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: "#192524",
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            {listing.title}
          </Text>
          <Text style={{ fontSize: 14, color: "#959D90", marginBottom: 12 }}>
            ✦ Boutique Stay · {listing.location}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: "rgba(60,87,89,0.12)",
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#3C5759" }}
              >
                {listing.status === "active"
                  ? "Active"
                  : listing.status === "paused"
                    ? "Paused"
                    : "Draft"}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: "rgba(149,157,144,0.12)",
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#959D90" }}
              >
                {listing.tierRequired}
              </Text>
            </View>
          </View>

          {!isHost && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={handleShare}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "#F7F7F5",
                  borderWidth: 1,
                  borderColor: "#EDEDEA",
                }}
              >
                <Share2 size={13} color="#3C5759" strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#3C5759" }}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSaveModalVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: isSaved ? "rgba(192,57,43,0.08)" : "#F7F7F5",
                  borderWidth: 1,
                  borderColor: isSaved ? "rgba(192,57,43,0.2)" : "#EDEDEA",
                }}
              >
                <Heart
                  size={13}
                  color={isSaved ? "#c0392b" : "#3C5759"}
                  fill={isSaved ? "#c0392b" : "none"}
                  strokeWidth={2}
                />
                <Text style={{ fontSize: 13, fontWeight: "600", color: isSaved ? "#c0392b" : "#3C5759" }}>
                  {isSaved ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 2 — Host Info Row */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <HostAvatar
              name={hostProfile?.full_name || listing.host || "Host"}
              avatarUrl={hostProfile?.avatar_url}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: "#192524" }}
              >
                Listed by {hostProfile?.full_name || listing.host || "Host"}
              </Text>
              <Text style={{ fontSize: 13, color: "#959D90" }}>
                Collabnb Host
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 3 — Three highlight pills */}
        <View
          style={{
            paddingHorizontal: 20,
            marginBottom: 20,
            flexDirection: "row",
            gap: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🎯</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
              Creator Tier
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              {listing.tierRequired}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>💰</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
              Compensation
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              {listing.compensation}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>📦</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
              Deliverables
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              {listing.deliverablesLoad} load
            </Text>
          </View>
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 4 — About This Stay */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
            }}
          >
            About this stay
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              lineHeight: 24,
              marginBottom: 8,
            }}
          >
            {displayDescription}
          </Text>
          {shouldTruncate && (
            <TouchableOpacity
              onPress={() => setShowFullDescription(!showFullDescription)}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#192524",
                  textDecorationLine: "underline",
                }}
              >
                {showFullDescription ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />

        {/* SECTION 4B — Amenities */}
        {listing.amenities?.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#192524", marginBottom: 14 }}
              >
                What this place offers
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {listing.amenities.map(({ icon, label }, i) => (
                  <View
                    key={`${label}-${i}`}
                    style={{
                      width: "50%",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 14,
                      paddingRight: 8,
                    }}
                  >
                    <AmenityIcon icon={icon} size={18} />
                    <Text style={{ fontSize: 14, color: "#3C5759", flex: 1 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
            />
          </>
        )}

        {/* SECTION 5 — What We're Looking For */}
        {listing.deliverables && listing.deliverables.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                What we're looking for
              </Text>
              {listing.deliverables.map((item, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 12, color: "#3C5759", marginTop: 2 }}
                  >
                    ✦
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#192524",
                      flex: 1,
                      lineHeight: 20,
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "#F0F0F0",
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* SECTION 6 — Collab Details */}
        {listing.dates && (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Collab details
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 15, color: "#3C5759" }}>
                  Available dates
                </Text>
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  {listing.dates}
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: "#F0F0F0",
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* SECTION 7 — Things to Know */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 16,
            }}
          >
            Things to know
          </Text>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  Content Guidelines
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}
                >
                  Review brand guidelines before applying
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>✉️</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  Application Process
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}
                >
                  Host reviews and responds within 48 hours
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  After Your Stay
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}
                >
                  Share content within agreed posting window
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 8 — Requirements */}
        {listing.requirements?.length > 0 && (
          <>
            <View
              style={{ height: 1, backgroundColor: "#F0F0F0", marginTop: 4, marginBottom: 20 }}
            />
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#192524", marginBottom: 14 }}>
                Requirements
              </Text>
              <View style={{ gap: 10 }}>
                {listing.requirements.map((req, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#3C5759",
                        marginTop: 7,
                      }}
                    />
                    <Text style={{ fontSize: 14, color: "#3C5759", flex: 1, lineHeight: 20 }}>
                      {req}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* SECTION 9 — Location */}
        {typeof listing.lat === "number" && typeof listing.lng === "number" && (
          <>
            <View
              style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
            />
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#192524", marginBottom: 4 }}>
                Location
              </Text>
              {listing.locationFull && (
                <Text style={{ fontSize: 13, color: "#959D90", marginBottom: 12 }}>
                  {listing.locationFull}
                </Text>
              )}
              <View
                style={{
                  height: 200,
                  borderRadius: 20,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#F0F0F0",
                }}
              >
                <MapView
                  style={{ width: "100%", height: "100%" }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  initialRegion={{
                    latitude: listing.lat,
                    longitude: listing.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker coordinate={{ latitude: listing.lat, longitude: listing.lng }} />
                </MapView>
              </View>
            </View>
          </>
        )}

        {/* SECTION 10 — Reviews */}
        <View
          style={{ height: 1, backgroundColor: "#F0F0F0", marginBottom: 20 }}
        />
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#192524", marginBottom: 14 }}>
            Reviews
          </Text>
          {listingReviews?.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {listingReviews.map((r, i) => (
                <View
                  key={i}
                  style={{
                    width: 240,
                    backgroundColor: "#F7F7F5",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <Quote size={16} color="#959D90" strokeWidth={1.75} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, color: "#3C5759", lineHeight: 19, marginBottom: 12, minHeight: 57 }}>
                    {r.comment}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#192524" }}>
                      {r.reviewer_name || "Creator"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 1 }}>
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          size={11}
                          strokeWidth={0}
                          fill={si < r.rating ? "#d9a441" : "#E5E5E0"}
                          color={si < r.rating ? "#d9a441" : "#E5E5E0"}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ fontSize: 14, color: "#959D90" }}>No reviews yet.</Text>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255,255,255,0.97)",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isHost ? (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#3C5759",
              paddingVertical: 14,
              borderRadius: 24,
              alignItems: "center",
            }}
            onPress={handleEdit}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              Edit Listing
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#192524" }}
              >
                {listing.compensation?.includes("Free") ||
                listing.compensation?.includes("Complimentary")
                  ? "Free stay"
                  : listing.compensation?.split("+")[0]?.trim() || "Free stay"}
              </Text>
              <Text style={{ fontSize: 13, color: "#959D90" }}>
                {listing.compensation}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: hasApplied ? "#D0D5CE" : "#3C5759",
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 24,
                alignItems: "center",
              }}
              onPress={hasApplied ? undefined : handleApply}
              disabled={hasApplied}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: hasApplied ? "#3C5759" : "#fff" }}>
                {hasApplied ? "Applied ✓" : "Apply Now"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Apply Modal */}
      <ApplyModal
        visible={applyVisible}
        onClose={() => setApplyVisible(false)}
        listing={listing}
        listingId={listingId}
        creatorProfile={profile}
      />

      {/* Save-to-collection Modal */}
      <SaveCollectionModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        listingId={listingId}
        collections={myCollections || []}
        onToggle={(collectionId) => toggleSaveCvx({ collectionId, listingId }).catch(() => {})}
        onCreateAndSave={async (name) => {
          if (!profile?._id) return;
          const collectionId = await createCollectionCvx({ name, creatorId: String(profile._id) });
          toggleSaveCvx({ collectionId: String(collectionId), listingId }).catch(() => {});
        }}
      />
    </View>
  );
}
