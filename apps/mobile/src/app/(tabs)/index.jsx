// Explore tab — mirrors Collabnb Website/app/src/pages/Explore.jsx's data and
// decisions (real Convex listings + samples, same property-type filters),
// presented as a native list instead of a web grid. Search-dropdowns/
// trial-gating from the web page are a deliberate later pass, not this one.
// Map view mirrors CollabMap.jsx's phone-width behavior specifically (map on
// top, in-view listings docked below) rather than its desktop split.

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
import { Search, Heart, MapPin, Star, List, Map as MapIcon, Lock } from "lucide-react-native";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import { useAccessGate } from "@/hooks/useAccessGate";
import { normalizeListing } from "@/utils/listingHelpers";
import { colors, fonts, radii, shadows } from "@/config/theme";
import ExploreMap from "@/components/ExploreMap";

const PROP_FILTERS = ["All", "Cabin", "Villa", "Treehouse", "Glamping", "Lodge", "Estate", "Cottage"];
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const convexRaw = useQuery(api.listings.getAll, profile?._id ? { viewerId: String(profile._id) } : {});
  const samplesRaw = useQuery(api.listings.getSamples);

  const [filter, setFilter] = useState("All");
  const { isSignedIn, savedIds, toggleSaved } = useSavedCollections();

  // Same gate the website checks (api.gates.getMyAccess) — a trial-ended
  // creator still browses, but every listing (card + map dock) is redacted.
  const access = useAccessGate(profile);
  const isLimited = access.state === "limited" && access.role === "creator" && !access.isAdmin && !access.isFounder;

  const isLoading = convexRaw === undefined || samplesRaw === undefined;

  const listings = useMemo(() => {
    const real = (convexRaw || [])
      .filter((l) => l.status === "published" || l.status === "active")
      .map(normalizeListing);
    const samples = (samplesRaw || []).map(normalizeListing);
    const all = [...real, ...samples].map((l) => (isLimited ? { ...l, _redacted: true } : l));
    if (filter === "All") return all;
    return all.filter((l) => l.property_type?.toLowerCase() === filter.toLowerCase());
  }, [convexRaw, samplesRaw, filter, isLimited]);

  // ── Map view ──────────────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [activePinId, setActivePinId] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  const mapListings = useMemo(
    () => listings.filter((l) => typeof l.lat === "number" && typeof l.lng === "number"),
    [listings]
  );
  const mapPoints = useMemo(
    () => mapListings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, label: l.compensation })),
    [mapListings]
  );
  // Seed the initial map fit from featured listings so a widely-scattered
  // catalog doesn't open zoomed out to a near-blank world view (Explore.jsx's
  // focusMapPoints does the same with its trending/for-you ranking).
  const focusMapPoints = useMemo(() => {
    const featured = mapListings.filter((l) => l.is_featured);
    return (featured.length ? featured : mapListings).map((l) => ({ lat: l.lat, lng: l.lng }));
  }, [mapListings]);
  const inBounds = (l) => {
    if (!mapBounds) return true;
    return l.lat >= mapBounds.south && l.lat <= mapBounds.north
        && l.lng >= mapBounds.west && l.lng <= mapBounds.east;
  };
  const mapListInBounds = mapListings.filter(inBounds);

  const dockListRef = useRef(null);
  const handlePinPress = (id) => {
    setActivePinId(id);
    const idx = mapListInBounds.findIndex((l) => l.id === id);
    if (idx >= 0) dockListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  };

  // Reverse-geocode the map's current center → "near {area}" label, mirroring
  // Explore.jsx's mapAreaLabel (same Mapbox token/endpoint).
  const [mapAreaLabel, setMapAreaLabel] = useState("");
  useEffect(() => {
    if (!mapOpen || !mapBounds || !MAPBOX_TOKEN) return;
    const centerLat = (mapBounds.north + mapBounds.south) / 2;
    const centerLng = (mapBounds.east + mapBounds.west) / 2;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${centerLng},${centerLat}.json?access_token=${MAPBOX_TOKEN}&types=place,region,country&limit=1`
        );
        const d = await r.json();
        const name = d?.features?.[0]?.place_name || d?.features?.[0]?.text || "";
        if (!cancelled) setMapAreaLabel(name);
      } catch { /* ignore */ }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [mapOpen, mapBounds]);

  const toggleSave = async (listing) => {
    if (!isSignedIn) {
      router.push("/signin");
      return;
    }
    await toggleSaved(listing.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style="dark" />

      {/* Trial countdown */}
      {!access.loading && access.state === "trial" && access.daysLeft !== null && access.daysLeft <= 7 && (
        <View style={{ backgroundColor: colors.mint, paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink, textAlign: "center" }}>
            {access.daysLeft === 0 ? "Your trial ends today" : `${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left in your trial`}
          </Text>
        </View>
      )}

      {/* Trial-ended upsell */}
      {isLimited && (
        <TouchableOpacity
          onPress={() => router.push("/subscribe")}
          activeOpacity={0.9}
          style={{ backgroundColor: colors.ink, paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: "#fff" }}>Your trial has ended</Text>
          <View style={{ backgroundColor: colors.mint, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>Subscribe</Text>
          </View>
        </TouchableOpacity>
      )}

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

      {/* Floating Map pill — opens the full-screen map view */}
      {!mapOpen && mapPoints.length > 0 && (
        <TouchableOpacity
          onPress={() => { setMapBounds(null); setMapAreaLabel(""); setMapOpen(true); }}
          activeOpacity={0.9}
          style={{
            position: "absolute", bottom: insets.bottom + 20, alignSelf: "center",
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: colors.ink, borderRadius: radii.pill,
            paddingHorizontal: 20, paddingVertical: 13,
            ...shadows.lg,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: "#fff" }}>Map</Text>
          <MapIcon color="#fff" size={16} />
        </TouchableOpacity>
      )}

      {/* Map view (full-screen) — map on top, in-view listings docked below,
          matching CollabMap's phone-width layout on the website. */}
      {mapOpen && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: colors.bone }}>
          <View style={{ flex: 1 }}>
            <ExploreMap
              ref={mapRef}
              points={mapPoints}
              activeId={activePinId}
              savedIds={savedIds}
              onPinPress={handlePinPress}
              onRegionChange={setMapBounds}
              fitPoints={focusMapPoints}
            />
            <TouchableOpacity
              onPress={() => { setMapOpen(false); setActivePinId(null); }}
              activeOpacity={0.85}
              style={{
                position: "absolute", top: insets.top + 12, left: 16,
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: colors.surface, borderRadius: radii.pill,
                paddingHorizontal: 14, paddingVertical: 9,
                ...shadows.md,
              }}
            >
              <List color={colors.ink} size={15} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>Show list</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              height: "28%",
              borderTopWidth: 1, borderTopColor: colors.hairline,
              borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg,
              backgroundColor: colors.bone, paddingTop: 10,
              ...shadows.lg,
            }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.stone, alignSelf: "center", marginBottom: 8 }} />
            <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 13, color: colors.ink, paddingHorizontal: 16, marginBottom: 8 }}>
              {mapListInBounds.length} collab{mapListInBounds.length === 1 ? "" : "s"} {mapAreaLabel ? `near ${mapAreaLabel}` : "here"}
            </Text>
            {mapListInBounds.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, paddingHorizontal: 16 }}>
                No collaborations in this area.
              </Text>
            ) : (
              <FlatList
                ref={dockListRef}
                data={mapListInBounds}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: insets.bottom + 10 }}
                onScrollToIndexFailed={(info) => {
                  dockListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
                }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/listing-detail",
                        params: { id: item.id, title: item.title, location: item.location, photoUri: item.image },
                      })
                    }
                    activeOpacity={0.85}
                    style={{
                      width: 220, flexDirection: "row", alignItems: "center", gap: 10,
                      backgroundColor: colors.surface, borderRadius: radii.md,
                      borderWidth: activePinId === item.id ? 1.5 : 1,
                      borderColor: activePinId === item.id ? colors.ink : colors.hairline,
                      padding: 8,
                    }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: radii.sm, overflow: "hidden" }}>
                      <Image source={{ uri: item.image }} style={{ width: 48, height: 48 }} contentFit="cover" blurRadius={item._redacted ? 12 : 0} />
                      {item._redacted && (
                        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(25,37,36,0.3)", alignItems: "center", justifyContent: "center" }}>
                          <Lock color="#fff" size={14} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: fonts.displaySemibold, fontSize: 13, color: colors.ink, opacity: item._redacted ? 0.35 : 1 }}>{item.title}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sage, marginTop: 1, opacity: item._redacted ? 0.35 : 1 }}>{item.location}</Text>
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink, marginTop: 2 }}>{item.compensation}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function ListingCard({ listing, saved, onToggleSave, onPress }) {
  const redacted = listing._redacted === true;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ overflow: "visible" }}>
      <View style={{ borderRadius: radii.lg, backgroundColor: colors.surface, overflow: "visible", ...shadows.md }}>
        <View style={{ borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, overflow: "hidden" }}>
          <Image
            source={{ uri: listing.image }}
            style={{ width: "100%", height: 200 }}
            contentFit="cover"
            transition={200}
            blurRadius={redacted ? 18 : 0}
          />

          {/* Redacted overlay — trial-ended creators still see the price (the
              hook), just not the listing contents behind it. */}
          {redacted && (
            <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(25,37,36,0.25)" }}>
              <Lock color="#fff" size={20} style={{ marginBottom: 6, opacity: 0.85 }} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: "#fff", opacity: 0.85 }}>Apply to view</Text>
            </View>
          )}

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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, opacity: redacted ? 0.35 : 1 }}>
            <MapPin color={colors.slate} size={13} />
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, marginLeft: 4 }}>{listing.location}</Text>
          </View>

          <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 16, color: colors.ink, marginBottom: 4, opacity: redacted ? 0.35 : 1 }}>{listing.title}</Text>

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
