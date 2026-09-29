// Explore tab — mirrors Collabnb Website/app/src/pages/Explore.jsx's data and
// decisions (real Convex listings + samples, same property-type filters) and
// now its composition too: a three-segment WHERE/WHAT/WHEN search, filter
// chips, a "Trending Now" carousel, then "All Stays". See COMPONENT-SPEC.md
// §6/§7/§9 — round 1 matched web's colors and type but kept mobile's own
// layout, which is why it still didn't read as the same product.
//
// Deliberately absent: web's floating glass pill navbar. Mobile has a native
// tab bar and the owner is removing that header from web as well.
//
// Map view mirrors CollabMap.jsx's phone-width behavior specifically (map on
// top, in-view listings docked below) rather than its desktop split.

import { View, FlatList, Dimensions, ActivityIndicator, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { List, Map as MapIcon } from "lucide-react-native";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import { useAccessGate } from "@/hooks/useAccessGate";
import { normalizeListing } from "@/utils/listingHelpers";
import { colors, radii, shadows } from "@/config/theme";
import ExploreMap from "@/components/ExploreMap";
import {
  AtmosphericBackground,
  Body,
  Chip,
  CompactListRow,
  Display,
  ListingCard,
  PillButton,
  SearchBar,
  SectionHeading,
} from "@/components/ui";

const PROP_FILTERS = ["All", "Cabin", "Villa", "Treehouse", "Glamping", "Lodge", "Estate", "Cottage"];
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Web's trending carousel lets the next card peek past the screen edge as the
// affordance that the row scrolls. Keep the peek — don't pad it away.
const TRENDING_CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.78);

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
  const isLimited =
    access.state === "limited" && access.role === "creator" && !access.isAdmin && !access.isFounder;

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

  const trending = useMemo(() => listings.filter((l) => l.is_featured).slice(0, 8), [listings]);

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
    return (
      l.lat >= mapBounds.south &&
      l.lat <= mapBounds.north &&
      l.lng >= mapBounds.west &&
      l.lng <= mapBounds.east
    );
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
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mapOpen, mapBounds]);

  const toggleSave = async (listing) => {
    if (!isSignedIn) {
      router.push("/signin");
      return;
    }
    await toggleSaved(listing.id);
  };

  const openListing = (item) =>
    router.push({
      pathname: "/listing-detail",
      params: { id: item.id, title: item.title, location: item.location, photoUri: item.image },
    });

  // One card definition for both the carousel and the vertical list, so the two
  // can never drift apart the way the old screen's inline card drifted from web.
  const renderCard = (item, width) => (
    <ListingCard
      width={width}
      image={item.image}
      title={item.title}
      location={item.location}
      price={item.compensation}
      deliverables={item.deliverables}
      tag={item.collab_type || undefined}
      authorName={item.host_name}
      featured={item.is_featured}
      badge={item.isSample ? "Sample" : undefined}
      saved={savedIds.has(item.id)}
      redacted={item._redacted === true}
      onToggleSave={() => toggleSave(item)}
      onPress={() => openListing(item)}
    />
  );

  const header = (
    <View style={{ paddingTop: insets.top + 16, gap: 18 }}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Display size={30}>Find your next collab</Display>

        <SearchBar
          segments={[
            { label: "Where", placeholder: "Anywhere", onPress: () => router.push("/search") },
            { label: "What", placeholder: "Any type", onPress: () => router.push("/search") },
            { label: "When", placeholder: "Any dates", onPress: () => router.push("/search") },
          ]}
          onSubmit={() => router.push("/search")}
        />
      </View>

      <FlatList
        data={PROP_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <Chip label={item} active={filter === item} onPress={() => setFilter(item)} />
        )}
      />

      {trending.length > 0 && (
        <View style={{ gap: 0 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeading
              title="Trending Now"
              subtitle="Top picks this week"
              actionLabel="see all"
              onAction={() => setFilter("All")}
            />
          </View>
          <FlatList
            data={trending}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `trending-${item.id}`}
            snapToInterval={TRENDING_CARD_WIDTH + 14}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 14, paddingHorizontal: 20, paddingBottom: 4 }}
            renderItem={({ item }) => renderCard(item, TRENDING_CARD_WIDTH)}
          />
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SectionHeading
          title={filter === "All" ? "All Stays" : filter}
          subtitle={`${listings.length} collab${listings.length === 1 ? "" : "s"} available`}
        />
      </View>
    </View>
  );

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Trial countdown */}
      {!access.loading && access.state === "trial" && access.daysLeft !== null && access.daysLeft <= 7 && (
        <View
          style={{
            backgroundColor: colors.mint,
            paddingTop: insets.top + 10,
            paddingBottom: 10,
            paddingHorizontal: 20,
          }}
        >
          <Body size={12} weight="semibold" style={{ textAlign: "center" }}>
            {access.daysLeft === 0
              ? "Your trial ends today"
              : `${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left in your trial`}
          </Body>
        </View>
      )}

      {/* Trial-ended upsell */}
      {isLimited && (
        <Pressable
          onPress={() => router.push("/subscribe")}
          style={{
            backgroundColor: colors.ink,
            paddingTop: insets.top + 12,
            paddingBottom: 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Body size={13} weight="semibold" color={colors.surface}>
            Your trial has ended
          </Body>
          <Chip label="Subscribe" style={{ backgroundColor: colors.mint }} />
        </Pressable>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.slate} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 16,
            paddingBottom: insets.bottom + 90,
          }}
          ListHeaderComponentStyle={{ marginHorizontal: -20, marginBottom: 4 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 20 }}>
              <Display size={18} style={{ textAlign: "center", marginBottom: 8 }}>
                No collaborations here yet
              </Display>
              <Body size={14} color={colors.sage} style={{ textAlign: "center" }}>
                Try a different property type, or check back soon — new opportunities are added
                regularly.
              </Body>
            </View>
          }
          renderItem={({ item }) => renderCard(item, undefined)}
        />
      )}

      {/* Floating Map pill — opens the full-screen map view */}
      {!mapOpen && mapPoints.length > 0 && (
        <PillButton
          label="Map"
          iconRight={<MapIcon color={colors.surface} size={16} />}
          onPress={() => {
            setMapBounds(null);
            setMapAreaLabel("");
            setMapOpen(true);
          }}
          style={{
            position: "absolute",
            bottom: insets.bottom + 20,
            alignSelf: "center",
            ...shadows.lg,
          }}
        />
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
            <PillButton
              label="Show list"
              variant="glass"
              icon={<List color={colors.ink} size={15} />}
              onPress={() => {
                setMapOpen(false);
                setActivePinId(null);
              }}
              style={{
                position: "absolute",
                top: insets.top + 12,
                left: 16,
                paddingVertical: 9,
                paddingHorizontal: 16,
                backgroundColor: colors.surface,
                ...shadows.md,
              }}
            />
          </View>

          <View
            style={{
              height: "28%",
              borderTopWidth: 1,
              borderTopColor: colors.hairline,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              backgroundColor: colors.bone,
              paddingTop: 10,
              ...shadows.lg,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.stone,
                alignSelf: "center",
                marginBottom: 10,
              }}
            />
            <Display size={14} style={{ paddingHorizontal: 16, marginBottom: 10 }}>
              {mapListInBounds.length} collab{mapListInBounds.length === 1 ? "" : "s"}{" "}
              {mapAreaLabel ? `near ${mapAreaLabel}` : "here"}
            </Display>
            {mapListInBounds.length === 0 ? (
              <Body size={13} color={colors.sage} style={{ paddingHorizontal: 16 }}>
                No collaborations in this area.
              </Body>
            ) : (
              <FlatList
                ref={dockListRef}
                data={mapListInBounds}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 10,
                  paddingBottom: insets.bottom + 10,
                }}
                onScrollToIndexFailed={(info) => {
                  dockListRef.current?.scrollToOffset({
                    offset: info.averageItemLength * info.index,
                    animated: true,
                  });
                }}
                renderItem={({ item }) => (
                  <CompactListRow
                    width={248}
                    image={item.image}
                    title={item.title}
                    location={item.location}
                    price={item.compensation}
                    active={activePinId === item.id}
                    redacted={item._redacted === true}
                    onPress={() => openListing(item)}
                  />
                )}
              />
            )}
          </View>
        </View>
      )}
    </AtmosphericBackground>
  );
}
