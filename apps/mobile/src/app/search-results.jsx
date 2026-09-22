import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Heart, MapPin, Search, SlidersHorizontal } from "lucide-react-native";
import FilterModal from "@/components/FilterModal";
import { getWebListings } from "@/services/webCatalog";

const c = { ink: "#192524", forest: "#3C5759", mist: "#EFECE9", line: "#D0D5CE", muted: "#6E776B" };
const compensationLabel = (type) => type === "free" ? "Complimentary stay" : type === "paid" ? "Paid collaboration" : "Stay + payment";

export default function SearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { location = "" } = useLocalSearchParams();
  const [query, setQuery] = useState(String(location));
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deliverablesCount, setDeliverablesCount] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [completeByDate, setCompleteByDate] = useState("");
  const [selectedDeliverables, setSelectedDeliverables] = useState([]);
  const [selectedTier, setSelectedTier] = useState("ugc");
  const [compensationTypes, setCompensationTypes] = useState([]);
  const [deliverableLoad, setDeliverableLoad] = useState("");
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [sortBy, setSortBy] = useState("best");

  const activeFilterCount = useMemo(() => Number(Boolean(deliverablesCount)) + Number(Boolean(priceRange.min || priceRange.max)) + Number(Boolean(completeByDate)) + selectedDeliverables.length + compensationTypes.length + Number(Boolean(deliverableLoad)) + Number(nearbyEnabled) + Number(selectedTier !== "ugc") + Number(sortBy !== "best"), [compensationTypes.length, completeByDate, deliverableLoad, deliverablesCount, nearbyEnabled, priceRange.max, priceRange.min, selectedDeliverables.length, selectedTier, sortBy]);

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setListings(await getWebListings({ query, deliverables: selectedDeliverables, compensation: compensationTypes, tier: selectedTier, load: deliverableLoad, nearby: nearbyEnabled, sort: sortBy, minValue: priceRange.min, maxValue: priceRange.max, deliverableCount: deliverablesCount }));
    } catch (requestError) {
      setListings([]);
      setError(requestError instanceof Error ? requestError.message : "Unable to load listings.");
    } finally {
      setIsLoading(false);
    }
  }, [compensationTypes, deliverableLoad, deliverablesCount, nearbyEnabled, priceRange.max, priceRange.min, query, selectedDeliverables, selectedTier, sortBy]);

  useEffect(() => {
    const timeout = setTimeout(loadListings, 220);
    return () => clearTimeout(timeout);
  }, [loadListings]);

  const clearFilters = () => {
    setDeliverablesCount(""); setPriceRange({ min: "", max: "" }); setCompleteByDate(""); setSelectedDeliverables([]); setSelectedTier("ugc"); setCompensationTypes([]); setDeliverableLoad(""); setNearbyEnabled(false); setSortBy("best");
  };

  return <View style={{ flex: 1, backgroundColor: "#fff" }}>
    <StatusBar style="dark" />
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: c.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={s.iconButton}><ChevronLeft color={c.ink} size={23} /></TouchableOpacity>
        <View style={s.searchBox}><Search color={c.muted} size={18} /><TextInput accessibilityLabel="Search listings" value={query} onChangeText={setQuery} placeholder="Destination, property, country" placeholderTextColor="#959D90" returnKeyType="search" onSubmitEditing={loadListings} style={s.searchInput} /></View>
        <TouchableOpacity accessibilityLabel="Open filters" onPress={() => setFiltersOpen(true)} style={s.iconButton}><SlidersHorizontal color={c.forest} size={20} />{activeFilterCount > 0 && <View style={s.filterCount}><Text style={s.filterCountText}>{activeFilterCount}</Text></View>}</TouchableOpacity>
      </View>
    </View>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
      <Text style={s.eyebrow}>COLLABORATION CATALOG</Text>
      <Text style={s.title}>{isLoading ? "Finding stays" : `${listings.length} ${listings.length === 1 ? "opportunity" : "opportunities"}`}</Text>
      <Text style={s.subtitle}>Live results from the Collabnb web catalog</Text>
      {isLoading && <ActivityIndicator size="large" color={c.forest} style={{ marginTop: 48 }} />}
      {!isLoading && error && <View style={s.empty}><Text style={s.emptyTitle}>Catalog unavailable</Text><Text style={s.emptyText}>{error}</Text><TouchableOpacity onPress={loadListings} style={s.primary}><Text style={s.primaryText}>Try again</Text></TouchableOpacity></View>}
      {!isLoading && !error && listings.length === 0 && <View style={s.empty}><Text style={s.emptyTitle}>Nothing matches yet</Text><Text style={s.emptyText}>Try a broader destination or clear a few filters.</Text>{activeFilterCount > 0 && <TouchableOpacity onPress={clearFilters} style={s.secondary}><Text style={s.secondaryText}>Clear filters</Text></TouchableOpacity>}</View>}
      {!isLoading && !error && listings.map((listing) => <Pressable key={listing.id} onPress={() => router.push({ pathname: "/listing-detail", params: { id: String(listing.id) } })} style={({ pressed }) => [s.card, pressed && { opacity: 0.84 }]}>
        <Image source={{ uri: listing.cover_image_placeholder }} style={s.cardImage} contentFit="cover" />
        <View style={s.cardBody}><View style={s.cardTopline}><View style={s.location}><MapPin color={c.forest} size={14} /><Text style={s.locationText}>{listing.location_city}, {listing.location_country}</Text></View><TouchableOpacity accessibilityLabel={`Save ${listing.title}`} hitSlop={8}><Heart color={c.ink} size={20} /></TouchableOpacity></View>
          <Text style={s.cardTitle}>{listing.title}</Text><Text style={s.cardMeta}>{compensationLabel(listing.compensation_type)} · ${listing.value_score} value</Text><View style={s.chips}>{listing.deliverables_supported.slice(0, 3).map((item) => <View key={item} style={s.chip}><Text style={s.chipText}>{item}</Text></View>)}</View>
        </View>
      </Pressable>)}
    </ScrollView>
    <FilterModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClearAll={clearFilters} filters={{ deliverablesCount, priceRange, completeByDate, selectedDeliverables, selectedTier, compensationTypes, deliverableLoad, nearbyEnabled, sortBy }} onFiltersChange={{ setDeliverablesCount, setPriceRange, setCompleteByDate, setSelectedDeliverables, setSelectedTier, setCompensationTypes, setDeliverableLoad, setNearbyEnabled, setSortBy }} />
  </View>;
}

const s = {
  iconButton: { width: 46, height: 46, borderRadius: 14, backgroundColor: c.mist, alignItems: "center", justifyContent: "center", position: "relative" },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 13, height: 46 }, searchInput: { flex: 1, color: c.ink, fontSize: 14, paddingVertical: 0 },
  filterCount: { position: "absolute", top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: c.forest, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }, filterCountText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  eyebrow: { color: c.forest, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 4, marginBottom: 8 }, title: { color: c.ink, fontSize: 28, lineHeight: 34, fontWeight: "700" }, subtitle: { color: c.muted, fontSize: 14, marginTop: 5, marginBottom: 24 },
  card: { borderWidth: 1, borderColor: c.line, borderRadius: 18, overflow: "hidden", marginBottom: 16, backgroundColor: "#fff" }, cardImage: { width: "100%", height: 188, backgroundColor: c.mist }, cardBody: { padding: 15 }, cardTopline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, location: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, marginRight: 10 }, locationText: { color: c.forest, fontSize: 13, fontWeight: "600", flexShrink: 1 }, cardTitle: { color: c.ink, fontSize: 18, lineHeight: 23, fontWeight: "700", marginTop: 9 }, cardMeta: { color: c.muted, fontSize: 13, marginTop: 5 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 13 }, chip: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: c.mist, borderRadius: 999 }, chipText: { color: c.ink, fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 54, paddingHorizontal: 28 }, emptyTitle: { color: c.ink, fontSize: 19, fontWeight: "700" }, emptyText: { color: c.muted, fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8 }, primary: { backgroundColor: c.forest, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 18 }, primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 }, secondary: { borderColor: c.forest, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, marginTop: 18 }, secondaryText: { color: c.forest, fontWeight: "700", fontSize: 14 },
};
