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

import { View, FlatList, Dimensions, Pressable, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { List, Search, SlidersHorizontal } from "lucide-react-native";
import ReAnimated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import Glass from "@/components/Glass";
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
import ListingPeek from "@/components/explore/ListingPeek";
import MapResultsSheet from "@/components/explore/MapResultsSheet";
import StatusBarBlur from "@/components/StatusBarBlur";
import {
  AtmosphericBackground,
  Body,
  Chip,
  Display,
  ListingTile,
  PillButton,
  SectionHeading,
  Skeleton,
} from "@/components/ui";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 12;
// Two tiles across, Airbnb-sized. The trending row shows a bit over two so the
// next tile peeks in as the scroll affordance.
const GRID_TILE_W = (SCREEN_W - 40 - GRID_GAP) / 2;
const TRENDING_TILE_W = (SCREEN_W - 40 - GRID_GAP) / 2.25;

// Same shapes as the loaded screen — pill, category strip, then rows of
// tiles — so nothing jumps when the listings arrive.
function SkeletonTile({ width }) {
  return (
    <View style={{ width, gap: 8 }}>
      <Skeleton width={width} height={width} radius={radii.lg} />
      <Skeleton width={width * 0.7} height={12} />
      <Skeleton width={width * 0.45} height={12} />
    </View>
  );
}

function ExploreSkeleton({ topInset }) {
  return (
    <View style={{ paddingTop: topInset + 10, gap: 18 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Skeleton height={52} radius={radii.pill} />
      </View>
      <View style={{ flexDirection: "row", gap: 22, paddingHorizontal: 20 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", gap: 8 }}>
            <Skeleton width={26} height={26} radius={13} />
            <Skeleton width={44} height={10} />
          </View>
        ))}
      </View>
      {[0, 1].map((row) => (
        <View key={row} style={{ gap: 12 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <Skeleton width="55%" height={18} />
          </View>
          <View style={{ flexDirection: "row", gap: GRID_GAP, paddingHorizontal: 20 }}>
            <SkeletonTile width={GRID_TILE_W} />
            <SkeletonTile width={GRID_TILE_W} />
          </View>
        </View>
      ))}
    </View>
  );
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
  const [headingY, setHeadingY] = useState(600);
  const searchFade = {
    opacity: scrollY.interpolate({ inputRange: [0, 110], outputRange: [1, 0], extrapolate: "clamp" }),
    transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 110], outputRange: [0, 24], extrapolate: "clamp" }) }],
  };
  const headingFade = {
    opacity: scrollY.interpolate({
      inputRange: [headingY - insets.top - 80, headingY - insets.top],
      outputRange: [1, 0],
      extrapolate: "clamp",
    }),
  };

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

  const [peek, setPeek] = useState(null);

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
      images={item.images}
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
      onLongPress={() => setPeek(item)}
    />
  );

  const filterCount = [whereQuery, whenLabel, collabTypeFilter].filter(Boolean).length;

  // Liquid-glass search pill. Active filters don't spell themselves out in the
  // pill; a round glass filter button with a count pops in beside it instead.
  const header = (
    <View style={{ paddingTop: insets.top + 10, gap: 14 }}>
      <Animated.View style={[{ gap: 14 }, searchFade]}>
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={() => setSearchOpen(true)}
          accessibilityRole="search"
          style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }], ...shadows.md })}
        >
          <Glass
            variant="regular"
            style={{ borderRadius: radii.pill }}
            contentStyle={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, paddingHorizontal: 20 }}
          >
            <Search color={colors.ink} size={18} strokeWidth={2.4} />
            <Body size={15} weight="semibold" numberOfLines={1}>
              {whereQuery || "Start your search"}
            </Body>
          </Glass>
        </Pressable>

        {filterCount > 0 ? (
          <ReAnimated.View entering={ZoomIn.springify().damping(14)} exiting={ZoomOut.duration(150)} style={shadows.md}>
            <Pressable
              onPress={() => setSearchOpen(true)}
              accessibilityLabel={`${filterCount} filter${filterCount === 1 ? "" : "s"} on`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
            >
              <Glass variant="regular" style={{ borderRadius: 26 }} contentStyle={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
                <SlidersHorizontal color={colors.ink} size={19} />
              </Glass>
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  minWidth: 19,
                  height: 19,
                  borderRadius: 10,
                  paddingHorizontal: 5,
                  backgroundColor: colors.ink,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Body size={10} weight="semibold" color={colors.surface}>
                  {filterCount}
                </Body>
              </View>
            </Pressable>
          </ReAnimated.View>
        ) : null}
      </View>

      <CategoryBar value={filter} onChange={setFilter} />
      </Animated.View>

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

      <Animated.View
        onLayout={(e) => setHeadingY(e.nativeEvent.layout.y)}
        style={[{ paddingHorizontal: 20, paddingTop: 6 }, headingFade]}
      >
        <SectionHeading
          size={19}
          title={filter === "All" ? "All stays" : filter}
          subtitle={`${listings.length} collab${listings.length === 1 ? "" : "s"} available`}
        />
      </Animated.View>
    </View>
  );

  const showTrialBanner =
    !access.loading && access.state === "trial" && access.daysLeft !== null && access.daysLeft <= 7;
  const hasTopBanner = showTrialBanner || isLimited;

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle()} />

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
        <ExploreSkeleton topInset={insets.top} />
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
      {!mapOpen && !hasTopBanner && <StatusBarBlur scrollY={scrollY} fadeStart={0} fadeLength={28} />}

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

      <ListingPeek
        listing={peek}
        saved={peek ? savedIds.has(peek.id) : false}
        onToggleSave={() => peek && toggleSave(peek)}
        onOpen={() => {
          const item = peek;
          setPeek(null);
          openListing(item);
        }}
        onClose={() => setPeek(null)}
      />
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
