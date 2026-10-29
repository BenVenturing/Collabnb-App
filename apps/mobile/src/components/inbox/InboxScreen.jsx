import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Swipeable } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { Search, Settings, X, Trash2, Plus, ChevronRight, ChevronDown, ChevronUp, Pin, PinOff } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { useConversations } from "@/hooks/useConversations";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import { normalizeListing } from "@/utils/listingHelpers";
import { TAG_COLORS, TAG_TEXT_COLORS } from "@/lib/threadTags";
import { threadTheme } from "@/lib/threadColors";
import { colors } from "@/config/theme";
import { isDark } from "@/utils/ColorModeStore";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import StatusBarBlur from "@/components/StatusBarBlur";

const FILTERS = ["All", "Unread", "Applications", "Collabs", "Pitches"];
const PINNED_KEY = "inbox_pinned_threads";
const MAX_PINS = 3;

function ListingRow({ listing, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.stone,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", backgroundColor: colors.mint, marginRight: 12 }}>
        <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.sage }} numberOfLines={1}>
          {listing.host_name ? `${listing.host_name} · ${listing.location}` : listing.location}
        </Text>
      </View>
      <ChevronRight color={colors.sage} size={18} />
    </TouchableOpacity>
  );
}

function Avatar({ name, uri, size = 56, unread = 0, isFounder = false }) {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={{ position: "relative" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: colors.mint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : (
          <Text style={{ fontSize: size * 0.32, fontWeight: "700", color: colors.slate }}>{initials}</Text>
        )}
      </View>
      {isFounder && (
        <View
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: "#D4A843",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 9, color: "#fff" }}>★</Text>
        </View>
      )}
      {unread > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.slate,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 5,
            borderWidth: 2,
            borderColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{unread}</Text>
        </View>
      )}
    </View>
  );
}

export default function SharedInboxScreen({ viewAs = "creator" }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { threads, isLoading, deleteThread, createThread } = useConversations();
  const { savedIds } = useSavedCollections();
  const realListings = useQuery(api.listings.getAll, {}) ?? [];
  const sampleListings = useQuery(api.listings.getSamples) ?? [];
  const [activeFilter, setActiveFilter] = useState("All");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pinnedKeys, setPinnedKeys] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(PINNED_KEY)
      .then((raw) => raw && setPinnedKeys(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const threadKey = (t) => t.thread_key || t.id;

  const togglePin = (item) => {
    const key = threadKey(item);
    const isPinned = pinnedKeys.includes(key);
    if (!isPinned && pinnedKeys.length >= MAX_PINS) {
      Alert.alert("Pin limit reached", `You can only pin up to ${MAX_PINS} chats.`);
      return;
    }
    const next = isPinned ? pinnedKeys.filter((k) => k !== key) : [key, ...pinnedKeys];
    setPinnedKeys(next);
    AsyncStorage.setItem(PINNED_KEY, JSON.stringify(next)).catch(() => {});
  };

  // Matches web's `activeThreads = threads.filter(t => !t.archived)` — archived
  // threads drop out of the main list with no "view archived" surface on web
  // either, so mobile doesn't add one.
  const activeThreads = useMemo(() => {
    const active = threads.filter((t) => !t.archived);
    const pinned = pinnedKeys.map((k) => active.find((t) => threadKey(t) === k)).filter(Boolean);
    return [...pinned, ...active.filter((t) => !pinnedKeys.includes(threadKey(t)))];
  }, [threads, pinnedKeys]);

  const tagFiltered = useMemo(() => {
    if (activeFilter === "All") return activeThreads;
    if (activeFilter === "Unread") return activeThreads.filter((t) => (t.unread || 0) > 0);
    // "Applications" -> tag "Application". Unread is a count, not a tag, so it
    // has to be handled before this.
    const singular = activeFilter.slice(0, -1);
    return activeThreads.filter((t) => t.tag === singular || t.tag === activeFilter);
  }, [activeThreads, activeFilter]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tagFiltered;
    return tagFiltered.filter(
      (t) =>
        (t.listing_title || "").toLowerCase().includes(q) ||
        (t.host_name || "").toLowerCase().includes(q) ||
        (t.last_message || "").toLowerCase().includes(q)
    );
  }, [tagFiltered, searchQuery]);

  // "Start new conversation" candidates — listings nobody has a thread with
  // yet. Mirrors web Inbox's matchedListings/suggestedListings split.
  const newChatBase = useMemo(() => {
    const existingTitles = new Set(threads.map((t) => t.listing_title));
    return [...realListings, ...sampleListings]
      .map((l) => ({ ...normalizeListing(l), host_id: l.host_id }))
      .filter((l) => !existingTitles.has(l.title));
  }, [threads, realListings, sampleListings]);

  const matchedListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return newChatBase.filter(
      (l) =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.location || "").toLowerCase().includes(q) ||
        (l.host_name || "").toLowerCase().includes(q)
    );
  }, [newChatBase, searchQuery]);

  const suggestedListings = useMemo(() => {
    if (searchQuery.trim()) return [];
    const savedFirst = newChatBase.filter((l) => savedIds?.has?.(l.id));
    const rest = newChatBase.filter((l) => !savedIds?.has?.(l.id));
    return [...savedFirst, ...rest].slice(0, 6);
  }, [newChatBase, searchQuery, savedIds]);

  const openThread = (item) => {
    router.push({
      pathname: `/messages/${encodeURIComponent(item.thread_key || item.id)}`,
      params: {
        listingTitle: item.listing_title,
        hostName: item.host_name,
        hostAvatar: item.host_avatar || "",
        tag: item.tag,
        isFounder: item.is_founder ? "1" : "",
      },
    });
  };

  const startFromListing = async (listing) => {
    if (startingChat) return;
    const existing = threads.find((t) => !t.archived && t.listing_title === listing.title);
    if (existing) {
      openThread(existing);
      return;
    }
    setStartingChat(true);
    try {
      const created = await createThread(listing);
      if (created) {
        setShowSearch(false);
        setSearchQuery("");
        openThread({
          thread_key: created.threadKey,
          id: created.id,
          listing_title: listing.title,
          host_name: listing.host_name,
          host_avatar: listing.image,
          tag: "Collab",
        });
      }
    } finally {
      setStartingChat(false);
    }
  };

  const headerTitle = viewAs === "host" ? "Inbox" : "Messages";

  const confirmDelete = (item) => {
    Alert.alert("Delete conversation", "This removes it from your inbox. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteThread(item.thread_key || item.id) },
    ]);
  };

  const renderRightActions = (item) => (
    <TouchableOpacity
      onPress={() => confirmDelete(item)}
      style={{
        width: 76,
        backgroundColor: "#C0392B",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Trash2 color="#fff" size={22} />
    </TouchableOpacity>
  );

  const renderLeftActions = (item, isPinned) => (
    <TouchableOpacity
      onPress={() => togglePin(item)}
      style={{
        width: 76,
        backgroundColor: colors.slate,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isPinned ? <PinOff color="#fff" size={22} /> : <Pin color="#fff" size={22} />}
    </TouchableOpacity>
  );

  const renderThread = ({ item }) => {
    const isCollabnb = item.tag === "Collabnb" || item.tag === "Notifications";
    const accentColor = threadTheme(item).dot;
    const isPinned = pinnedKeys.includes(threadKey(item));
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        renderLeftActions={() => renderLeftActions(item, isPinned)}
        overshootRight={false}
        overshootLeft={false}
      >
      <TouchableOpacity
        onPress={() => openThread(item)}
        onLongPress={() => togglePin(item)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: isDark() ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)",
          borderBottomWidth: 1,
          borderBottomColor: colors.hairline,
          borderLeftWidth: item.theme_color ? 3 : 0,
          borderLeftColor: accentColor,
        }}
      >
        <View style={{ marginRight: 12 }}>
          <Avatar name={item.host_name} uri={item.host_avatar} unread={item.unread} isFounder={item.is_founder} />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <Text
              style={{ flex: 1, marginRight: 8, fontSize: 16, fontWeight: item.unread ? "700" : "600", color: colors.ink }}
              numberOfLines={1}
            >
              {item.listing_title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {isPinned && <Pin color={colors.sage} size={12} />}
              <Text style={{ fontSize: 12, color: colors.sage }}>{item.timestamp}</Text>
            </View>
          </View>
          {!isCollabnb && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: TAG_COLORS[item.tag] || colors.stone,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: TAG_TEXT_COLORS[item.tag] || colors.slate }}>
                  {item.tag}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.sage, flexShrink: 1 }} numberOfLines={1}>
                {item.host_name}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, color: item.unread ? colors.ink : colors.slate, fontWeight: item.unread ? "500" : "400" }}
          >
            {item.last_message}
          </Text>
        </View>
      </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <AtmosphericBackground style={{ flex: 1, paddingTop: insets.top }}>
      <StatusBar style={statusBarStyle()} />

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        {showSearch ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.bone,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Search color={colors.sage} size={18} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages..."
                placeholderTextColor={colors.sage}
                autoFocus
                style={{ flex: 1, fontSize: 15, color: colors.ink, marginLeft: 8 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X color={colors.sage} size={18} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(""); }}>
              <Text style={{ fontSize: 15, color: colors.slate }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 28, fontWeight: "700", color: colors.ink }}>{headerTitle}</Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity onPress={() => setShowSearch(true)}>
                  <Search color={colors.ink} size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowSearch(true)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.ink,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus color={colors.bone} size={16} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings((s) => !s)}>
                  <Settings color={colors.ink} size={24} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
              {(() => {
                const chips = FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setActiveFilter(f)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: activeFilter === f ? colors.slate : isDark() ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.5)",
                      borderWidth: 1,
                      borderColor: activeFilter === f ? colors.slate : isDark() ? "rgba(255,255,255,0.14)" : "rgba(60,87,89,0.15)",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "500", color: activeFilter === f ? colors.bone : colors.slate }}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ));
                return filtersExpanded ? (
                  <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{chips}</View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ gap: 8, paddingRight: 8 }}
                  >
                    {chips}
                  </ScrollView>
                );
              })()}
              <TouchableOpacity
                onPress={() => setFiltersExpanded((e) => !e)}
                hitSlop={8}
                style={{
                  width: 30,
                  height: 30,
                  marginLeft: 8,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isDark() ? "rgba(255,255,255,0.14)" : "rgba(60,87,89,0.15)",
                  backgroundColor: isDark() ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.5)",
                }}
              >
                {filtersExpanded ? <ChevronUp color={colors.slate} size={16} /> : <ChevronDown color={colors.slate} size={16} />}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {showSettings && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 10 }}
        >
          <View
            style={{
              position: "absolute",
              top: insets.top + 70,
              right: 20,
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 8,
              minWidth: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                Alert.alert("Feedback", "Feedback feature coming soon");
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 15, color: colors.ink }}>Give feedback</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={visible}
          renderItem={renderThread}
          keyExtractor={(item) => item.thread_key || item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}
          ListFooterComponent={
            showSearch ? (
              <View>
                <Text
                  style={{
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 8,
                    fontSize: 11,
                    fontWeight: "700",
                    color: colors.sage,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Start new conversation
                </Text>
                {(searchQuery.trim() ? matchedListings : suggestedListings).length > 0 ? (
                  (searchQuery.trim() ? matchedListings : suggestedListings).map((listing) => (
                    <ListingRow key={listing.id} listing={listing} onPress={() => startFromListing(listing)} />
                  ))
                ) : (
                  <Text style={{ paddingHorizontal: 20, paddingVertical: 12, fontSize: 13, color: colors.sage }}>
                    {searchQuery.trim() ? "No listings match" : "Save a stay to start chatting"}
                  </Text>
                )}
              </View>
            ) : null
          }
        />
      )}
      <StatusBarBlur />
    </AtmosphericBackground>
  );
}
