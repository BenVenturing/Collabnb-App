import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Heart,
  MoreVertical,
  MapPin,
  Edit3,
  Trash2,
} from "lucide-react-native";
import { useSavedCollections } from "@/hooks/useSavedCollections";

export default function WishlistDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const listId = params.listId;

  const { collections, listingsById, isLoading, renameList, deleteList, toggleSaveInList } =
    useSavedCollections();
  const list = collections.find((c) => String(c._id) === String(listId));

  const [showMenu, setShowMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");

  const handleRemove = async (listingId) => {
    Alert.alert(
      "Remove from wishlist",
      "Are you sure you want to remove this collaboration?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await toggleSaveInList(listId, listingId);
          },
        },
      ],
    );
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    await renameList(listId, newName.trim());
    setNewName("");
    setShowRenameModal(false);
    setShowMenu(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete wishlist",
      `Are you sure you want to delete "${list?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteList(listId);
            router.back();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#3C5759" />
      </View>
    );
  }

  if (!list) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16, color: "#3C5759" }}>
          Wishlist not found
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
          backgroundColor: "#fff",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="#192524" size={28} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
            <MoreVertical color="#192524" size={24} />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#192524",
            marginTop: 12,
          }}
        >
          {list.name}
        </Text>
        <Text style={{ fontSize: 15, color: "#3C5759", marginTop: 4 }}>
          {list.listing_ids.length} saved collaboration
          {list.listing_ids.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 60,
            right: 20,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5,
            zIndex: 10,
            minWidth: 180,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              setNewName(list.name);
              setShowRenameModal(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Edit3 color="#192524" size={18} />
            <Text style={{ fontSize: 15, color: "#192524" }}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              handleDelete();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Trash2 color="#E63946" size={18} />
            <Text style={{ fontSize: 15, color: "#E63946" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 20,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 16,
              }}
            >
              Rename wishlist
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="#959D90"
              style={{
                backgroundColor: "#EFECE9",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: "#192524",
                marginBottom: 20,
              }}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowRenameModal(false);
                  setNewName("");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: "#EFECE9",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRename}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: "#3C5759",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {list.listing_ids.length === 0 ? (
          <View
            style={{
              paddingHorizontal: 40,
              paddingTop: 80,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 80, marginBottom: 16, opacity: 0.2 }}>
              ♡
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#192524",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              No saved collaborations yet
            </Text>
            <Text
              style={{ fontSize: 15, color: "#3C5759", textAlign: "center" }}
            >
              Tap the heart icon on any collaboration to save it here
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            {list.listing_ids.map((listingId) => {
              const listing = listingsById.get(String(listingId));
              if (!listing) return null;
              return (
                <TouchableOpacity
                  key={listingId}
                  onPress={() =>
                    router.push(`/listing-detail?listingId=${listingId}`)
                  }
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 20,
                    marginBottom: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: listing.image }}
                      style={{ width: "100%", height: 200 }}
                      resizeMode="cover"
                    />

                    {listing.isSample && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "rgba(255,255,255,0.28)",
                            letterSpacing: 3,
                            textTransform: "uppercase",
                            transform: [{ rotate: "-25deg" }],
                          }}
                        >
                          SAMPLE
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ padding: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#192524",
                            marginBottom: 4,
                          }}
                        >
                          {listing.title}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 8,
                          }}
                        >
                          <MapPin color="#3C5759" size={14} />
                          <Text style={{ fontSize: 14, color: "#3C5759" }}>
                            {listing.location_city}
                            {listing.location_city && listing.location_country ? ", " : ""}
                            {listing.location_country}
                          </Text>
                        </View>
                        {listing.compensation && (
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#192524",
                              marginBottom: 4,
                            }}
                          >
                            {listing.compensation}
                          </Text>
                        )}
                        {listing.deliverables && (
                          <Text style={{ fontSize: 13, color: "#3C5759" }}>
                            {listing.deliverables}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemove(listingId);
                        }}
                        style={{ marginLeft: 12 }}
                      >
                        <Heart color="#E63946" fill="#E63946" size={24} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
