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
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track, lineHeights } from "@/config/theme";

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
      <AtmosphericBackground style={{ flex: 1 }}>
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
              fontFamily: fonts.displaySemibold,
              fontSize: 18,
              color: colors.ink,
              textAlign: "center",
              marginBottom: 8,
              letterSpacing: track(18, tracking.display),
            }}
          >
            Sign in to see your wishlists
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.slate,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            Saved collaborations sync to your account once you're signed in.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/signin")}
            style={{
              backgroundColor: colors.slate,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    );
  }

  if (isLoading) {
    return (
      <AtmosphericBackground
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.slate} />
      </AtmosphericBackground>
    );
  }

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
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
              fontFamily: fonts.display,
              fontSize: 32,
              color: colors.ink,
              marginBottom: 8,
              letterSpacing: track(32, tracking.display),
              lineHeight: 32 * lineHeights.display,
            }}
          >
            Wishlists
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.slate }}>
            {getTotalSavedCount()} saved collaboration
            {getTotalSavedCount() !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Create New List Button */}
        {showCreateModal ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: colors.bone,
                borderRadius: 20,
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: colors.ink,
                  marginBottom: 12,
                  letterSpacing: track(18, tracking.display),
                }}
              >
                Create wishlist
              </Text>
              <TextInput
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Enter list name"
                placeholderTextColor={colors.sage}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  color: colors.ink,
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
                    backgroundColor: colors.surface,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 15,
                      color: colors.ink,
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
                    backgroundColor: colors.slate,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}
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
                backgroundColor: colors.bone,
                borderRadius: 20,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                borderWidth: 2,
                borderColor: colors.stone,
                borderStyle: "dashed",
              }}
            >
              <Plus color={colors.slate} size={24} />
              <Text
                style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.slate }}
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
                    backgroundColor: colors.bone,
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
                            borderColor: colors.surface,
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
                                backgroundColor: colors.stone,
                                borderWidth: 1,
                                borderColor: colors.surface,
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
                    fontFamily: fonts.displaySemibold,
                    fontSize: 16,
                    color: colors.ink,
                    marginBottom: 4,
                    letterSpacing: track(16, tracking.display),
                  }}
                  numberOfLines={1}
                >
                  {list.name}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
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
                fontFamily: fonts.displaySemibold,
                fontSize: 18,
                color: colors.ink,
                textAlign: "center",
                marginBottom: 8,
                letterSpacing: track(18, tracking.display),
              }}
            >
              No wishlists yet
            </Text>
            <Text
              style={{ fontFamily: fonts.body, fontSize: 15, color: colors.slate, textAlign: "center" }}
            >
              Create your first wishlist to start saving collaborations
            </Text>
          </View>
        )}
      </ScrollView>
    </AtmosphericBackground>
  );
}
