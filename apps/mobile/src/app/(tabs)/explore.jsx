// Explore tab — same data and filters as Collabnb Website's Explore.jsx (real
// Convex listings + samples, property types, collab types), laid out like
// Airbnb's app: a "Start your search" pill that opens SearchOverlay, an icon
// category strip, then small photo-first tiles (a trending row and a grid).
//
// Deliberately absent: web's floating glass pill navbar. Mobile has a native
// tab bar and the owner is removing that header from web as well.
//
// Map view mirrors CollabMap.jsx's phone-width behavior specifically (map on
// top, in-view listings docked below) rather than its desktop split.

import { View, FlatList, Dimensions, ActivityIndicator, Pressable, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { List, Search } from "lucide-react-native";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import { useAccessGate } from "@/hooks/useAccessGate";
import useMapViewStore from "@/utils/MapViewStore";
import { normalizeListing } from "@/utils/listingHelpers";
import { colors, radii, shadows } from "@/config/theme";
import ExploreMap from "@/components/ExploreMap";
import CategoryBar from "@/components/explore/CategoryBar";
import SearchOverlay from "@/components/explore/SearchOverlay";
import MapResultsSheet from "@/components/explore/MapResultsSheet";
import {
  AtmosphericBackground,
  Body,
  Chip,
  Display,
  ListingTile,
  PillButton,
  SectionHeading,
} from "@/components/ui";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 12;
// Two tiles across, Airbnb-sized. The trending row shows a bit over two so the
// next tile peeks in as the scroll affordance.
const GRID_TILE_W = (SCREEN_W - 40 - GRID_GAP) / 2;
const TRENDING_TILE_W = (SCREEN_W - 40 - GRID_GAP) / 2.25;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const convexRaw = useQuery(api.listings.getAll, profile?._id ? { viewerId: String(profile._id) } : {});
  const samplesRaw = useQuery(api.listings.getSamples);

  const [filter, setFilter] = useState("All");
  const [collabTypeFilter, setCollabTypeFilter] = useState(null);
  const [whereQuery, setWhereQuery] = useState("");
  const [whenLabel, setWhenLabel] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
    let all = [...real, ...samples].map((l) => (isLimited ? { ...l, _redacted: true } : l));
    if (filter !== "All") {
      all = all.filter((l) => l.property_type?.toLowerCase() === filter.toLowerCase());
    }
    if (collabTypeFilter) {
      all = all.filter((l) => (l.collab_type || "").toLowerCase() === collabTypeFilter.toLowerCase());
    }
    const q = whereQuery.trim().toLowerCase();
    if (q) {
      all = all.filter(
        (l) => (l.location || "").toLowerCase().includes(q) || (l.title || "").toLowerCase().includes(q)
      );
    }
    return all;
  }, [convexRaw, samplesRaw, filter, collabTypeFilter, whereQuery, isLimited]);

  const trending = useMemo(() => listings.filter((l) => l.is_featured).slice(0, 8), [listings]);

  // ── Map view ──────────────────────────────────────────────────────────────
  const mapRef = useRef(null);
  // Lives in a store rather than local state so the tab layout can draw the
  // bulge in the bar's silhouette and slide the bar down while the map is up.
  const { mapOpen, setMapOpen, setHasMapPoints } = useMapViewStore();
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

  // The bar only bulges when there's actually something to show on a map.
  useEffect(() => {
    setHasMapPoints(mapPoints.length > 0);
  }, [mapPoints.length, setHasMapPoints]);
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
    if (idx >= 0) {
      dockListRef.current?.half();
      dockListRef.current?.scrollTo(idx);
    }
  };

  // Reverse-geocode the map's current center → "near {area}" label, mirroring
  // Explore.jsx's mapAreaLabel (same Mapbox token/endpoint).
  const [mapAreaLabel, setMapAreaLabel] = useState("");

  // Content scrolling up under the notch would otherwise collide with the
  // clock/wifi/battery glyphs. A frosted strip fades in behind the status bar
  // as soon as anything scrolls under it, and stays invisible at rest so the
  // background reads clean. Opacity only, so it can run on the native driver.
  const scrollY = useRef(new Animated.Value(0)).current;
  const topBlurOpacity = scrollY.interpolate({
    inputRange: [0, 28],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Opening from the tab bar's arc can't reset these itself, so clear the
  // previous session's viewport whenever the map comes back up.
  useEffect(() => {
    if (mapOpen) {
      setMapBounds(null);
      setMapAreaLabel("");
    } else {
      setActivePinId(null);
    }
  }, [mapOpen]);
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
    <ListingTile
      width={width}
      image={item.image}
      title={item.title}
      location={item.location}
      price={item.compensation}
      deliverables={item.deliverables}
      featured={item.is_featured}
      badge={item.isSample ? "Sample" : undefined}
      saved={savedIds.has(item.id)}
      redacted={item._redacted === true}
      onToggleSave={() => toggleSave(item)}
      onPress={() => openListing(item)}
    />
  );

  const searchSummary = [whereQuery || "Anywhere", whenLabel || "Any time", collabTypeFilter || "Any type"].join(" · ");
  const hasSearch = Boolean(whereQuery || whenLabel || collabTypeFilter);

  const header = (
    <View style={{ paddingTop: insets.top + 10, gap: 14 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Pressable
          onPress={() => setSearchOpen(true)}
          accessibilityRole="search"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: radii.pill,
            paddingVertical: hasSearch ? 10 : 15,
            paddingHorizontal: 20,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            ...shadows.md,
          })}
        >
          <Search color={colors.ink} size={18} strokeWidth={2.4} />
          <View style={{ alignItems: hasSearch ? "flex-start" : "center" }}>
            <Body size={15} weight="semibold">
              {hasSearch ? whereQuery || "Anywhere" : "Start your search"}
            </Body>
            {hasSearch ? (
              <Body size={12} color={colors.sage} numberOfLines={1}>
                {searchSummary}
              </Body>
            ) : null}
          </View>
        </Pressable>
      </View>

      <CategoryBar value={filter} onChange={setFilter} />

      {trending.length > 0 && (
        <View>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeading size={19} title="Trending now" />
          </View>
          <FlatList
            data={trending}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `trending-${item.id}`}
            snapToInterval={TRENDING_TILE_W + GRID_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ gap: GRID_GAP, paddingHorizontal: 20 }}
            renderItem={({ item }) => renderCard(item, TRENDING_TILE_W)}
          />
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <SectionHeading
          size={19}
          title={filter === "All" ? "All stays" : filter}
          subtitle={`${listings.length} collab${listings.length === 1 ? "" : "s"} available`}
        />
      </View>
    </View>
  );

  const showTrialBanner =
    !access.loading && access.state === "trial" && access.daysLeft !== null && access.daysLeft <= 7;
  const hasTopBanner = showTrialBanner || isLimited;

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Trial countdown */}
      {showTrialBanner && (
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
        <Animated.FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GRID_GAP }}
          ListHeaderComponent={header}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 20,
            paddingBottom: insets.bottom + 110,
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
          renderItem={({ item }) => renderCard(item, GRID_TILE_W)}
        />
      )}

      {/* Frosted status-bar strip. Skipped while a top banner is showing —
          those draw their own solid background behind the status bar. */}
      {!mapOpen && !hasTopBanner && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            opacity: topBlurOpacity,
          }}
        >
          <BlurView intensity={70} tint="light" style={{ flex: 1 }} />
          <View style={{ height: 0.5, backgroundColor: "rgba(208,213,206,0.5)" }} />
        </Animated.View>
      )}

      {/* The Map/List toggle floats above the glass tab bar — see
          (tabs)/_layout.jsx. */}

      {/* Map view (full-screen) — map on top, in-view listings docked below,
          matching CollabMap's phone-width layout on the website. */}
      {mapOpen && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: colors.bone }}>
          <View style={{ position: "absolute", inset: 0 }}>
            <ExploreMap
              ref={mapRef}
              points={mapPoints}
              activeId={activePinId}
              savedIds={savedIds}
              onPinPress={handlePinPress}
              onRegionChange={setMapBounds}
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

          <MapResultsSheet
            ref={dockListRef}
            listings={mapListInBounds}
            title={`${mapListInBounds.length} collab${mapListInBounds.length === 1 ? "" : "s"}${mapAreaLabel ? ` near ${mapAreaLabel.split(",")[0]}` : ""}`}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            onOpen={openListing}
            bottomInset={insets.bottom}
          />
        </View>
      )}

      <SearchOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        listings={listings}
        initial={{ where: whereQuery, when: whenLabel, what: collabTypeFilter }}
        onApply={({ where, when, what }) => {
          setWhereQuery(where);
          setWhenLabel(when);
          setCollabTypeFilter(what);
        }}
      />
    </AtmosphericBackground>
  );
}
