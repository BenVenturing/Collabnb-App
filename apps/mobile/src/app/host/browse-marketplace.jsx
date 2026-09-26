import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import ThemedBackground from "@/components/ThemedBackground";

// Same sample set shown on the dashboard, with approximate coordinates added
// for the map — this app has no live marketplace backend yet, so browsing
// mirrors what a new host would see on Explore.
const MARKETPLACE_LISTINGS = [
  {
    id: "l1",
    title: "Treehouse Suite — Summer Escape",
    location: "Asheville, NC",
    lat: 35.5951,
    lng: -82.5515,
    compType: "Complimentary Stay",
    tierRequired: "Micro Influencer",
    photo: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
  },
  {
    id: "l2",
    title: "Cliffside Villa — Weekend Collab",
    location: "Big Sur, CA",
    lat: 36.2704,
    lng: -121.8081,
    compType: "Stay + Content Fee",
    tierRequired: "UGC Pro",
    photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  },
  {
    id: "l3",
    title: "Desert Dome — Content Weekend",
    location: "Joshua Tree, CA",
    lat: 34.1347,
    lng: -116.3131,
    compType: "Complimentary Stay",
    tierRequired: "UGC Beginner",
    photo: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
  },
  {
    id: "l4",
    title: "Lake House — Fall Series",
    location: "Lake Tahoe, CA",
    lat: 39.0968,
    lng: -120.0324,
    compType: "Complimentary Stay",
    tierRequired: "Influencer",
    photo: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
  },
];

function ListingCard({ listing, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <Image source={{ uri: listing.photo }} style={styles.cardImage} contentFit="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.cardLocation}>📍 {listing.location}</Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardComp}>{listing.compType}</Text>
          <View style={styles.cardTierChip}>
            <Text style={styles.cardTierText}>{listing.tierRequired}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BrowseMarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MARKETPLACE_LISTINGS;
    return MARKETPLACE_LISTINGS.filter((l) =>
      l.location.toLowerCase().includes(q),
    );
  }, [query]);

  const activeListing = MARKETPLACE_LISTINGS.find((l) => l.id === activeId);

  return (
    <ThemedBackground>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Browse the marketplace</Text>
          <Text style={styles.subtitle}>See what other hosts are offering</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by location..."
              placeholderTextColor="#959D90"
            />
          </View>
          <TouchableOpacity
            style={[styles.mapToggle, mapOpen && styles.mapToggleActive]}
            onPress={() => setMapOpen((v) => !v)}
          >
            <Text style={[styles.mapToggleText, mapOpen && styles.mapToggleTextActive]}>
              {mapOpen ? "Hide map" : "Show map"}
            </Text>
          </TouchableOpacity>
        </View>

        {mapOpen && (
          <View style={styles.mapWrap}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: 37.5,
                longitude: -110,
                latitudeDelta: 20,
                longitudeDelta: 20,
              }}
            >
              {filtered.map((l) => (
                <Marker
                  key={l.id}
                  coordinate={{ latitude: l.lat, longitude: l.lng }}
                  title={l.title}
                  description={l.location}
                  pinColor={activeId === l.id ? "#4A9B7F" : "#3C5759"}
                  onPress={() => setActiveId(l.id)}
                />
              ))}
            </MapView>
            {activeListing && (
              <View style={styles.mapPopup}>
                <ListingCard
                  listing={activeListing}
                  onPress={() =>
                    router.push({
                      pathname: "/listing-detail",
                      params: { id: activeListing.id, isHost: "true" },
                    })
                  }
                />
              </View>
            )}
          </View>
        )}

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No listings match that search.</Text>
          ) : (
            filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onPress={() =>
                  router.push({
                    pathname: "/listing-detail",
                    params: { id: l.id, isHost: "true" },
                  })
                }
              />
            ))
          )}
        </ScrollView>
      </View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  backBtn: { marginBottom: 12 },
  backBtnText: { fontSize: 13, fontWeight: "600", color: "#3C5759" },
  title: { fontSize: 24, fontWeight: "800", color: "#192524" },
  subtitle: { fontSize: 13, color: "#959D90", marginTop: 2 },

  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchInputWrap: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  searchInput: { fontSize: 14, color: "#192524", paddingVertical: 10 },
  mapToggle: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(25,37,36,0.12)",
  },
  mapToggleActive: { backgroundColor: "#192524", borderColor: "#192524" },
  mapToggleText: { fontSize: 12.5, fontWeight: "600", color: "#3C5759" },
  mapToggleTextActive: { color: "#EFECE9" },

  mapWrap: {
    height: 220,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
  },
  mapPopup: { position: "absolute", bottom: 10, left: 10, right: 10 },

  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    overflow: "hidden",
    marginBottom: 12,
  },
  cardImage: { width: 96, height: 96 },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#192524", marginBottom: 4 },
  cardLocation: { fontSize: 11.5, color: "#959D90", marginBottom: 6 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardComp: { fontSize: 11.5, color: "#3C5759" },
  cardTierChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(60,87,89,0.1)",
  },
  cardTierText: { fontSize: 10.5, fontWeight: "600", color: "#3C5759" },

  emptyText: { fontSize: 13, color: "#959D90", textAlign: "center", marginTop: 40 },
});
