// Host-side marketplace browse: the same full-screen map, compensation pills
// and docked results sheet creators get on Explore, fed by live listings.
import React, { useMemo, useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "convex/react";
import { ChevronLeft, Search, X } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { normalizeListing } from "@/utils/listingHelpers";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import ExploreMap from "@/components/ExploreMap";
import MapResultsSheet from "@/components/explore/MapResultsSheet";
import { colors, fonts, radii, shadows } from "@/config/theme";
import * as haptic from "@/utils/haptics";

export default function BrowseMarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const convexRaw = useQuery(api.listings.getAll, {});
  const samplesRaw = useQuery(api.listings.getSamples);
  const { savedIds, toggleSaved } = useSavedCollections();

  const [query, setQuery] = useState("");
  const [activePinId, setActivePinId] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const mapRef = useRef(null);
  const sheetRef = useRef(null);

  const mapListings = useMemo(() => {
    const real = (convexRaw || [])
      .filter((l) => l.status === "published" || l.status === "active")
      .map(normalizeListing);
    const samples = (samplesRaw || []).map(normalizeListing);
    const q = query.trim().toLowerCase();
    return [...real, ...samples].filter(
      (l) =>
        typeof l.lat === "number" &&
        typeof l.lng === "number" &&
        (!q ||
          (l.location || "").toLowerCase().includes(q) ||
          (l.title || "").toLowerCase().includes(q)),
    );
  }, [convexRaw, samplesRaw, query]);

  const mapPoints = useMemo(
    () => mapListings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, label: l.compensation })),
    [mapListings],
  );

  const inView = mapListings.filter(
    (l) =>
      !mapBounds ||
      (l.lat >= mapBounds.south &&
        l.lat <= mapBounds.north &&
        l.lng >= mapBounds.west &&
        l.lng <= mapBounds.east),
  );

  const handlePinPress = (id) => {
    setActivePinId(id);
    const idx = inView.findIndex((l) => l.id === id);
    if (idx >= 0) {
      sheetRef.current?.half();
      sheetRef.current?.scrollTo(idx);
    }
  };

  const openListing = (item) =>
    router.push({
      pathname: "/listing-detail",
      params: { id: item.id, title: item.title, location: item.location, photoUri: item.image },
    });

  const toggleSave = async (listing) => {
    haptic.tap();
    await toggleSaved(listing.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style="dark" />
      <View style={{ position: "absolute", inset: 0 }}>
        <ExploreMap
          ref={mapRef}
          points={mapPoints}
          activeId={activePinId}
          savedIds={savedIds}
          onPinPress={handlePinPress}
          onRegionChange={setMapBounds}
        />
      </View>

      {/* Floating top bar: back + search, glass pills over the map */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 10,
          left: 16,
          right: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            ...shadows.md,
          }}
        >
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: radii.pill,
            backgroundColor: colors.surface,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            gap: 8,
            ...shadows.md,
          }}
        >
          <Search size={17} color={colors.slate} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a city or stay"
            placeholderTextColor={colors.sage}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <X size={16} color={colors.slate} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <MapResultsSheet
        ref={sheetRef}
        listings={inView}
        title={`${inView.length} collab${inView.length === 1 ? "" : "s"} in view`}
        savedIds={savedIds}
        onToggleSave={toggleSave}
        onOpen={openListing}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
