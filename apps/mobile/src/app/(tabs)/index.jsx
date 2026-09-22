// Explore tab — mirrors Collabnb Website/app/src/pages/Explore.jsx's data and
// decisions (real Convex listings + samples, same property-type filters),
// presented as a native list instead of a web grid. Map/search-dropdowns/
// trial-gating from the web page are a deliberate later pass, not this one.

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Search, Heart, MapPin, Star } from "lucide-react-native";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import SavedStore from "@/utils/SavedStore";
import { colors, fonts, radii, shadows } from "@/config/theme";

const PROP_FILTERS = ["All", "Cabin", "Villa", "Treehouse", "Glamping", "Lodge", "Estate", "Cottage"];
const IMG_FALLBACK = "https://images.unsplash.com/photo-1501183638710-841dd1904471?w=800";

function compensationLabel(l) {
  const cash = l.cash_amount;
  if (typeof cash === "number" && cash > 0) {
    return cash >= 1000 ? `$${(cash / 1000).toFixed(cash % 1000 ? 1 : 0)}k` : `$${cash}`;
  }
  const m = String(l.compensation || "").match(/\$([\d,]+)/);
  if (m) return `$${m[1]}`;
  if (l.compensation_type === "hybrid") return "Hybrid";
  return l.collab_type || "Collab";
}

function deliverablesLabel(l) {
  if (typeof l.deliverables === "string" && l.deliverables) return l.deliverables;
  if (l.deliverables_list?.length) {
    const parts = l.deliverables_list.slice(0, 2).map((d) => `${d.quantity}× ${d.type}`);
    return parts.join(", ");
  }
  if (l.deliverable_count) return `${l.deliverable_count} deliverables`;
  return "";
}

function normalizeListing(l) {
  const images = l.gallery_images?.length ? l.gallery_images : l.image ? [l.image] : [];
  return {
    id: String(l._id),
    title: l.title,
    location: l.location,
    location_city: l.location_city,
    location_country: l.location_country,
    image: images[0] || IMG_FALLBACK,
    property_type: l.property_type || "",
    collab_type: l.collab_type || "",
    compensation: compensationLabel(l),
    deliverables: deliverablesLabel(l),
    host_name: l.host_name,
    rating: l.rating,
    review_count: l.review_count,
    isSample: l.is_sample === true,
  };
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const convexRaw = useQuery(api.listings.getAll, profile?._id ? { viewerId: String(profile._id) } : {});
  const samplesRaw = useQuery(api.listings.getSamples);

  const [filter, setFilter] = useState("All");
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    const updateSaved = () => {
      const ids = new Set();
      SavedStore.getState().lists.forEach((list) =>
        list.items.forEach((item) => ids.add(item.listingId)),
      );
      setSavedIds(ids);
    };
    updateSaved();
    return SavedStore.subscribe(updateSaved);
  }, []);

  const isLoading = convexRaw === undefined || samplesRaw === undefined;

  const listings = useMemo(() => {
    const real = (convexRaw || [])
      .filter((l) => l.status === "published" || l.status === "active")
      .map(normalizeListing);
    const samples = (samplesRaw || []).map(normalizeListing);
    const all = [...real, ...samples];
    if (filter === "All") return all;
    return all.filter((l) => l.property_type?.toLowerCase() === filter.toLowerCase());
  }, [convexRaw, samplesRaw, filter]);

  const toggleSave = async (listing) => {
    await SavedStore.toggleSaved({
      id: listing.id,
      title: listing.title,
      location_city: listing.location_city || listing.location?.split(",")[0]?.trim(),
      location_country: listing.location_country || listing.location?.split(",")[1]?.trim(),
      image: listing.image,
      deliverablesSummary: listing.deliverables,
      offerSummary: listing.compensation,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          backgroundColor: colors.surface,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.hairline,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.bone,
            borderRadius: radii.pill,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 14,
          }}
        >
          <Search color={colors.sage} size={20} />
          <Text style={{ flex: 1, marginLeft: 12, fontFamily: fonts.body, fontSize: 15, color: colors.sage }}>
            Search destinations
          </Text>
        </TouchableOpacity>

        <FlatList
          data={PROP_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item;
            return (
              <TouchableOpacity
                onPress={() => setFilter(item)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: radii.pill,
                  backgroundColor: active ? colors.mint : colors.bone,
                  borderWidth: 1,
                  borderColor: active ? colors.mint : colors.stone,
                }}
              >
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink }}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Listings */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.slate} />
        </View>
      ) : listings.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.ink, textAlign: "center", marginBottom: 8 }}>
            No collaborations here yet
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, textAlign: "center" }}>
            Try a different property type, or check back soon — new opportunities are added regularly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              saved={savedIds.has(item.id)}
              onToggleSave={() => toggleSave(item)}
              onPress={() =>
                router.push({
                  pathname: "/listing-detail",
                  params: { id: item.id, title: item.title, location: item.location, photoUri: item.image },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function ListingCard({ listing, saved, onToggleSave, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ overflow: "visible" }}>
      <View style={{ borderRadius: radii.lg, backgroundColor: colors.surface, overflow: "visible", ...shadows.md }}>
        <View style={{ borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, overflow: "hidden" }}>
          <Image source={{ uri: listing.image }} style={{ width: "100%", height: 200 }} contentFit="cover" transition={200} />

          {listing.isSample && (
            <View style={{ position: "absolute", top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.92)" }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.sage }}>Sample</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radii.pill, padding: 8 }}
          >
            <Heart color={saved ? "#B3261E" : colors.ink} fill={saved ? "#B3261E" : "none"} size={18} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <MapPin color={colors.slate} size={13} />
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, marginLeft: 4 }}>{listing.location}</Text>
          </View>

          <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 16, color: colors.ink, marginBottom: 4 }}>{listing.title}</Text>

          {(listing.rating || listing.host_name) && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              {listing.rating ? (
                <>
                  <Star color={colors.slate} size={13} fill={colors.slate} />
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, marginLeft: 4 }}>
                    {listing.rating}
                  </Text>
                  {listing.review_count ? (
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginLeft: 4 }}>
                      ({listing.review_count})
                    </Text>
                  ) : null}
                </>
              ) : null}
              {listing.host_name ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginLeft: listing.rating ? 8 : 0 }}>
                  Hosted by {listing.host_name}
                </Text>
              ) : null}
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 17, color: colors.ink }}>{listing.compensation}</Text>
            {listing.deliverables ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginLeft: 6 }}>
                · {listing.deliverables}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
