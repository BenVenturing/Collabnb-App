import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  X,
  ChevronLeft,
  MapPin,
  SlidersHorizontal,
} from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track } from "@/config/theme";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const RECENT_SEARCHES = [
  {
    id: 1,
    location: "Tokyo, Japan",
    icon: "⛩️",
  },
  {
    id: 2,
    location: "Bali, Indonesia",
    icon: "🏝️",
  },
];

const SUGGESTED_DESTINATIONS = [
  {
    id: "nearby",
    icon: "🧭",
    title: "Nearby",
    subtitle: "Find what's around you",
    location: "nearby",
  },
  {
    id: "tokyo",
    icon: "⛩️",
    title: "Tokyo, Japan",
    subtitle: "Based on your wishlist",
    location: "Tokyo, Japan",
  },
  {
    id: "kyoto",
    icon: "🏯",
    title: "Kyoto, Japan",
    subtitle: "Historic temples & culture",
    location: "Kyoto, Japan",
  },
  {
    id: "bali",
    icon: "🏝️",
    title: "Bali, Indonesia",
    subtitle: "Tropical paradise retreats",
    location: "Bali, Indonesia",
  },
  {
    id: "malibu",
    icon: "🌊",
    title: "Malibu, California",
    subtitle: "Beachfront properties",
    location: "Malibu, California",
  },
  {
    id: "paris",
    icon: "🗼",
    title: "Paris, France",
    subtitle: "Romantic city escapes",
    location: "Paris, France",
  },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef(null);

  // Live place autocomplete via Mapbox Geocoding — same endpoint/token as the
  // website's nav search (Explore.jsx's mapDestination fly-to).
  useEffect(() => {
    if (!MAPBOX_TOKEN || searchQuery.trim().length < 3) {
      setGeoResults([]);
      setGeoLoading(false);
      return;
    }
    setGeoLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&types=country,region,place,locality,district&limit=6`
        );
        const d = await r.json();
        setGeoResults(
          (d?.features || []).map((f) => ({ id: f.id, title: f.text, subtitle: f.place_name, location: f.place_name }))
        );
      } catch {
        setGeoResults([]);
      } finally {
        setGeoLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const useLiveResults = Boolean(MAPBOX_TOKEN) && searchQuery.trim().length >= 3;

  const filteredDestinations = useLiveResults
    ? geoResults
    : SUGGESTED_DESTINATIONS.filter(
        (dest) =>
          searchQuery === "" ||
          dest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
      );

  const handleDestinationSelect = (location) => {
    router.push({
      pathname: "/search-results",
      params: { location },
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Mode: "overview" when no search, "typing" when searching
  const mode = searchQuery.length > 0 ? "typing" : "overview";

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.stone,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              mode === "typing" ? handleClearSearch() : router.back()
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.bone,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "typing" ? (
              <ChevronLeft color={colors.ink} size={24} />
            ) : (
              <X color={colors.ink} size={20} />
            )}
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              color: colors.ink,
              flex: 1,
              letterSpacing: track(18, tracking.display),
            }}
          >
            {mode === "typing" ? "Search destinations" : "Search"}
          </Text>
        </View>

        {/* Search Input - always visible, always active */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.bone,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Search color={colors.sage} size={20} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search destinations"
            placeholderTextColor={colors.sage}
            autoFocus={mode === "typing"}
            style={{
              flex: 1,
              marginLeft: 12,
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.ink,
            }}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.stone,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X color={colors.ink} size={14} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Recent Searches - only in overview mode */}
        {mode === "overview" && RECENT_SEARCHES.length > 0 && (
          <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
            <Text
              style={{
                fontFamily: fonts.displaySemibold,
                fontSize: 14,
                color: colors.ink,
                marginBottom: 12,
                letterSpacing: track(14, tracking.display),
              }}
            >
              Recent searches
            </Text>
            <View style={{ gap: 2 }}>
              {RECENT_SEARCHES.map((search) => (
                <TouchableOpacity
                  key={search.id}
                  onPress={() => handleDestinationSelect(search.location)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: colors.bone,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{search.icon}</Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 15,
                      color: colors.ink,
                    }}
                  >
                    {search.location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Suggested Destinations */}
        <View
          style={{
            marginTop: mode === "typing" ? 24 : 32,
            paddingHorizontal: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 14, color: colors.ink, letterSpacing: track(14, tracking.display) }}>
              {useLiveResults ? "Destinations" : "Suggested destinations"}
            </Text>
            {geoLoading && <ActivityIndicator size="small" color={colors.sage} />}
          </View>
          {useLiveResults && !geoLoading && geoResults.length === 0 && (
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, paddingVertical: 8 }}>No places found.</Text>
          )}
          <View style={{ gap: 2 }}>
            {filteredDestinations.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                onPress={() => handleDestinationSelect(dest.location)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: colors.bone,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 16,
                  }}
                >
                  {dest.icon ? <Text style={{ fontSize: 24 }}>{dest.icon}</Text> : <MapPin color={colors.slate} size={20} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.displaySemibold,
                      fontSize: 15,
                      color: colors.ink,
                      marginBottom: 2,
                      letterSpacing: track(15, tracking.display),
                    }}
                  >
                    {dest.title}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage }}>
                    {dest.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </AtmosphericBackground>
  );
}
