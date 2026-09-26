// Creator V1 screen (namespaced to avoid host collisions)

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, MoreVertical } from "lucide-react-native";
import { useSavedCollections } from "@/hooks/useSavedCollections";

export default function CreatorSavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, collections: lists, listingsById, isLoading, createList } = useSavedCollections();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert("Error", "Please enter a list name");
      return;
    }

    await createList(newListName.trim());
    setNewListName("");
    setShowCreateModal(false);
  };

  const getTotalSavedCount = () => {
    return lists.reduce((sum, list) => sum + list.listing_ids.length, 0);
  };

  const getListPreviewImages = (list) => {
    return list.listing_ids
      .slice(0, 4)
      .map((id) => listingsById.get(String(id))?.image)
      .filter(Boolean);
  };

  if (!isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ fontSize: 80, marginBottom: 16, opacity: 0.2 }}>♡</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#192524",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Sign in to see your wishlists
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Saved collaborations sync to your account once you're signed in.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/signin")}
            style={{
              backgroundColor: "#3C5759",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <StatusBar style="dark" />
        <ActivityIndicator color="#3C5759" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Wishlists
          </Text>
          <Text style={{ fontSize: 15, color: "#3C5759" }}>
            {getTotalSavedCount()} saved collaboration
            {getTotalSavedCount() !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Create New List Button */}
        {showCreateModal ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: "#EFECE9",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Create wishlist
              </Text>
              <TextInput
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Enter list name"
                placeholderTextColor="#959D90"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
                  marginBottom: 16,
                }}
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewListName("");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: "#fff",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#192524",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateList}
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
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={{
                backgroundColor: "#EFECE9",
                borderRadius: 20,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                borderWidth: 2,
                borderColor: "#D0D5CE",
                borderStyle: "dashed",
              }}
            >
              <Plus color="#3C5759" size={24} />
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#3C5759" }}
              >
                Create wishlist
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wishlists Grid */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {lists.map((list) => (
              <TouchableOpacity
                key={list._id}
                onPress={() => router.push(`/saved/${list._id}`)}
                style={{ width: "47%", marginBottom: 8 }}
              >
                {/* Preview Grid */}
                <View
                  style={{
                    aspectRatio: 1,
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: "#EFECE9",
                    marginBottom: 12,
                  }}
                >
                  {list.listing_ids.length === 0 ? (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 40, opacity: 0.3 }}>♡</Text>
                    </View>
                  ) : list.listing_ids.length === 1 ? (
                    <Image
                      source={{ uri: listingsById.get(String(list.listing_ids[0]))?.image }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        flexWrap: "wrap",
                      }}
                    >
                      {getListPreviewImages(list).map((img, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: img }}
                          style={{
                            width: "50%",
                            height: "50%",
                            borderWidth: 1,
                            borderColor: "#fff",
                          }}
                          resizeMode="cover"
                        />
                      ))}
                      {list.listing_ids.length < 4 &&
                        Array.from({ length: 4 - list.listing_ids.length }).map(
                          (_, idx) => (
                            <View
                              key={`empty-${idx}`}
                              style={{
                                width: "50%",
                                height: "50%",
                                backgroundColor: "#D0D5CE",
                                borderWidth: 1,
                                borderColor: "#fff",
                              }}
                            />
                          ),
                        )}
                    </View>
                  )}
                </View>

                {/* List Info */}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {list.name}
                </Text>
                <Text style={{ fontSize: 13, color: "#3C5759" }}>
                  {list.listing_ids.length} saved
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {lists.length === 0 && (
          <View
            style={{
              paddingHorizontal: 40,
              paddingTop: 40,
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
              No wishlists yet
            </Text>
            <Text
              style={{ fontSize: 15, color: "#3C5759", textAlign: "center" }}
            >
              Create your first wishlist to start saving collaborations
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
