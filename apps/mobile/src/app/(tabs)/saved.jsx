// Creator V1 screen (namespaced to avoid host collisions)

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, MoreVertical } from "lucide-react-native";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import StatusBarBlur from "@/components/StatusBarBlur";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import SavedInspirationCard from "@/components/SavedInspirationCard";
import { colors, fonts, tracking, track, lineHeights } from "@/config/theme";

const TYPE_MS = 28;
const HOLD_MS = 1800;

// Types the empty-state message out once, holds briefly, then fades away so
// the carousel isn't crowded.
const QUOTES = [
  "Great content starts with a real place.",
  "Show the feeling, not just the room.",
  "Your first three seconds are the whole pitch.",
  "Authentic beats polished, every time.",
  "Stay curious. The best stories find you.",
  "One honest clip outweighs ten staged ones.",
];

function SavedQuotes() {
  const [i, setI] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(3600),
      Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) setI((n) => (n + 1) % QUOTES.length);
    });
    return () => run.stop();
  }, [i, opacity]);

  return (
    <Animated.Text
      style={{
        opacity,
        marginTop: 36,
        paddingHorizontal: 48,
        fontFamily: fonts.body,
        fontSize: 12.5,
        fontStyle: "italic",
        color: colors.sage,
        textAlign: "center",
        minHeight: 36,
      }}
    >
      {QUOTES[i]}
    </Animated.Text>
  );
}

function TypewriterMessage({ title, body, onDone }) {
  const full = `${title}\n${body}`;
  const [n, setN] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (n < full.length) {
      const t = setTimeout(() => setN(n + 1), TYPE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () =>
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(
          () => onDone?.(),
        ),
      HOLD_MS,
    );
    return () => clearTimeout(t);
  }, [n, full.length, opacity]);

  const shown = full.slice(0, n);
  const [line1, line2 = ""] = shown.split("\n");

  return (
    <Animated.View style={{ opacity, paddingHorizontal: 40, marginTop: 20, alignItems: "center", minHeight: 80 }}>
      <Text
        style={{
          fontFamily: fonts.displaySemibold,
          fontSize: 20,
          color: colors.ink,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: track(20, tracking.display),
        }}
      >
        {line1}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, textAlign: "center" }}>
        {line2}
      </Text>
    </Animated.View>
  );
}

export default function CreatorSavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, collections: lists, listingsById, isLoading, createList } = useSavedCollections();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [introDone, setIntroDone] = useState(false);

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
        <StatusBar style={statusBarStyle()} />
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
        <StatusBar style={statusBarStyle()} />
        <ActivityIndicator color={colors.slate} />
      </AtmosphericBackground>
    );
  }

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — Airbnb-style: big title, round + on the right. */}
        <View
          style={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 32,
                color: colors.ink,
                marginBottom: 4,
                letterSpacing: track(32, tracking.display),
                lineHeight: 32 * lineHeights.display,
              }}
            >
              Wishlists
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
              {getTotalSavedCount()} saved
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            accessibilityLabel="Create wishlist"
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <Plus color={colors.ink} size={20} />
          </TouchableOpacity>
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
        ) : null}

        {/* Wishlists Grid */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {lists.map((list) => (
              <TouchableOpacity
                key={list._id}
                onPress={() => router.push(`/saved/${list._id}`)}
                style={{ width: "47%", marginBottom: 8 }}
              >
                {/* Preview: one big photo, or Airbnb's large-left / two-right collage. */}
                <View
                  style={{
                    aspectRatio: 1,
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: colors.stone,
                    marginBottom: 10,
                    flexDirection: "row",
                    gap: 2,
                  }}
                >
                  {(() => {
                    const imgs = getListPreviewImages(list);
                    if (imgs.length === 0) return null;
                    if (imgs.length < 3) {
                      return imgs.map((img, idx) => (
                        <Image key={idx} source={{ uri: img }} style={{ flex: 1 }} resizeMode="cover" />
                      ));
                    }
                    return (
                      <>
                        <Image source={{ uri: imgs[0] }} style={{ flex: 2 }} resizeMode="cover" />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Image source={{ uri: imgs[1] }} style={{ flex: 1 }} resizeMode="cover" />
                          <Image source={{ uri: imgs[2] }} style={{ flex: 1 }} resizeMode="cover" />
                        </View>
                      </>
                    );
                  })()}
                </View>

                {/* List Info */}
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 15,
                    color: colors.ink,
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  {list.name}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage }}>
                  {list.listing_ids.length} saved
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {lists.length === 0 && (
          <View style={{ paddingTop: 24, alignItems: "center" }}>
            <SavedInspirationCard />
            {introDone ? (
              <SavedQuotes />
            ) : (
              <TypewriterMessage
                title="Create your first wishlist"
                body="As you explore, tap the heart on a stay to save it here."
                onDone={() => setIntroDone(true)}
              />
            )}
          </View>
        )}
      </ScrollView>
      <StatusBarBlur />
    </AtmosphericBackground>
  );
}
