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

import { View, FlatList, Dimensions, ActivityIndicator, Pressable, TouchableOpacity, TextInput, ScrollView, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { List, X, MapPin } from "lucide-react-native";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/expo";
import { api } from "@/convex/_generated/api";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import { useAccessGate } from "@/hooks/useAccessGate";
import useMapViewStore from "@/utils/MapViewStore";
import { normalizeListing } from "@/utils/listingHelpers";
import { colors, radii, shadows, fonts } from "@/config/theme";
import ExploreMap from "@/components/ExploreMap";
import {
  AtmosphericBackground,
  Body,
  Chip,
  CompactListRow,
  Display,
  EyebrowLabel,
  ListingCard,
  PillButton,
  SearchBar,
  SectionHeading,
} from "@/components/ui";

const PROP_FILTERS = ["All", "Cabin", "Villa", "Treehouse", "Glamping", "Lodge", "Estate", "Cottage"];

// Mirrors Collabnb Website's lib/searchData.js — same option sets, so "What"
// and "When" offer the same real choices as web, not placeholder content.
const COLLAB_TYPES = [
  { label: "UGC Video", emoji: "🎬" },
  { label: "Instagram Reels", emoji: "📸" },
  { label: "TikTok", emoji: "🎵" },
  { label: "Photography", emoji: "📷" },
  { label: "YouTube Vlog", emoji: "▶️" },
  { label: "Blog Post", emoji: "✍️" },
  { label: "Full Package", emoji: "✦" },
];
const AVAIL_OPTIONS = ["Any time", "This month", "Next month", "Next 3 months", "Next 6 months"];

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Web's trending carousel lets the next card peek past the screen edge as the
// affordance that the row scrolls. Keep the peek — don't pad it away.
// Same width as the All Stays cards below (screen minus the list's 20pt side
// padding), so the two sections read as one size of card rather than two.
const TRENDING_CARD_WIDTH = Dimensions.get("window").width - 40;

// Backdrop + sliding sheet for the Where/What/When fields — phone-sized
// equivalent of web's under-field dropdown (Explore.jsx's <Dropdown>).
function FieldSheet({ title, onClose, children }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onClose}
      style={{ position: "absolute", inset: 0, backgroundColor: "rgba(25,37,36,0.4)", zIndex: 50 }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingTop: 10,
          paddingBottom: insets.bottom + 16,
          maxHeight: "75%",
          ...shadows.lg,
        }}
      >
        <View
          style={{ alignSelf: "center", width: 44, height: 5, borderRadius: radii.pill, backgroundColor: colors.stone, marginBottom: 12 }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
          <Body size={15} weight="semibold">{title}</Body>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.ink} size={20} />
          </TouchableOpacity>
        </View>
        {children}
      </TouchableOpacity>
    </TouchableOpacity>
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
  const [activeField, setActiveField] = useState(null); // 'where' | 'what' | 'when' | null
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
            { label: "Where", placeholder: "Anywhere", value: whereQuery, onPress: () => setActiveField("where") },
            {
              label: "What",
              placeholder: "Any type",
              value: [filter !== "All" ? filter : null, collabTypeFilter].filter(Boolean).join(" · "),
              onPress: () => setActiveField("what"),
            },
            { label: "When", placeholder: "Any dates", value: whenLabel, onPress: () => setActiveField("when") },
          ]}
          onSubmit={() => setActiveField("where")}
        />
      </View>

      {trending.length > 0 && (
        <View style={{ gap: 0 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeading
              title="Trending Now"
              subtitle="Top picks this week"
            />
          </View>
          <FlatList
            data={trending}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `trending-${item.id}`}
            snapToInterval={TRENDING_CARD_WIDTH + 14}
            snapToAlignment="start"
            disableIntervalMomentum
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
          ListHeaderComponent={header}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
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

      {/* The map toggle is drawn into the tab bar's own silhouette — see
          (tabs)/_layout.jsx and BulgeTabBarBackground. */}

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

      {activeField === "where" && (
        <FieldSheet title="Where" onClose={() => setActiveField(null)}>
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.bone,
                borderRadius: radii.md,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <MapPin color={colors.sage} size={16} style={{ marginRight: 8 }} />
              <TextInput
                value={whereQuery}
                onChangeText={setWhereQuery}
                placeholder="Search by city or stay name"
                placeholderTextColor={colors.sage}
                autoFocus
                style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
              />
              {whereQuery.length > 0 && (
                <TouchableOpacity onPress={() => setWhereQuery("")}>
                  <X color={colors.sage} size={16} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <EyebrowLabel size={10} style={{ marginBottom: 8 }}>
              {whereQuery ? "Matching stays" : "Suggested"}
            </EyebrowLabel>
            {listings.slice(0, 8).map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => {
                  setWhereQuery(l.location || l.title);
                  setActiveField(null);
                }}
                style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
              >
                <Body size={14} weight="medium">{l.title}</Body>
                <Body size={12} color={colors.sage}>{l.location}</Body>
              </TouchableOpacity>
            ))}
            {listings.length === 0 && (
              <Body size={13} color={colors.sage}>No matches yet — try a different search.</Body>
            )}
          </ScrollView>
        </FieldSheet>
      )}

      {activeField === "what" && (
        <FieldSheet title="What" onClose={() => setActiveField(null)}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <EyebrowLabel size={10} style={{ marginBottom: 10 }}>Collab type</EyebrowLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {COLLAB_TYPES.map((ct) => (
                <Chip
                  key={ct.label}
                  label={`${ct.emoji} ${ct.label}`}
                  active={collabTypeFilter === ct.label}
                  onPress={() => setCollabTypeFilter(collabTypeFilter === ct.label ? null : ct.label)}
                />
              ))}
            </View>
            <EyebrowLabel size={10} style={{ marginBottom: 10 }}>Property type</EyebrowLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {PROP_FILTERS.map((f) => (
                <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </ScrollView>
        </FieldSheet>
      )}

      {activeField === "when" && (
        <FieldSheet title="When" onClose={() => setActiveField(null)}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}>
            {AVAIL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setWhenLabel(opt === "Any time" ? "" : opt);
                  setActiveField(null);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: radii.md,
                  backgroundColor: (whenLabel || "Any time") === opt ? colors.mint : colors.bone,
                }}
              >
                <Body size={14} weight={(whenLabel || "Any time") === opt ? "semibold" : "regular"}>{opt}</Body>
              </TouchableOpacity>
            ))}
          </View>
        </FieldSheet>
      )}
    </AtmosphericBackground>
  );
}
