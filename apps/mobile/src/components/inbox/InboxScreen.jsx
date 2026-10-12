import { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Search, Settings, MessageCircle, X } from "lucide-react-native";
import { useConversations } from "@/hooks/useConversations";
import { colors } from "@/config/theme";

const FILTERS = ["All", "Applications", "Collabs", "Pitches"];

const TAG_COLORS = {
  Collab: colors.mint,
  Application: colors.stone,
  Pitch: "#F7DCD3",
  Collabnb: colors.ink,
  Notifications: colors.slate,
};
const TAG_TEXT_COLORS = {
  Collab: colors.slate,
  Application: colors.slate,
  Pitch: "#B5502F",
  Collabnb: colors.bone,
  Notifications: colors.bone,
};

function Avatar({ name, uri, size = 54, isFounder = false }) {
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
    </View>
  );
}

export default function SharedInboxScreen({ viewAs = "creator" }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { threads, isLoading } = useConversations();
  const [activeFilter, setActiveFilter] = useState("All");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const tagFiltered = useMemo(() => {
    if (activeFilter === "All") return threads;
    const singular = activeFilter.slice(0, -1);
    return threads.filter((t) => t.tag === singular || t.tag === activeFilter);
  }, [threads, activeFilter]);

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

  const headerTitle = viewAs === "host" ? "Inbox" : "Messages";
  const emptyStateText =
    viewAs === "host"
      ? "Start chatting with creators about collaborations"
      : "Start chatting with hosts about collaborations";

  const renderThread = ({ item }) => {
    const isCollabnb = item.tag === "Collabnb" || item.tag === "Notifications";
    const unread = item.unread > 0;
    return (
      <TouchableOpacity
        onPress={() => openThread(item)}
        activeOpacity={0.6}
        style={{ flexDirection: "row", paddingLeft: 16, backgroundColor: "#fff" }}
      >
        <View style={{ marginRight: 14, paddingVertical: 10 }}>
          <Avatar name={item.host_name} uri={item.host_avatar} isFounder={item.is_founder} />
        </View>
        {/* Text column carries the divider, inset from the avatar like WhatsApp */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingVertical: 12,
            paddingRight: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.stone,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
            <Text
              style={{ flex: 1, marginRight: 8, fontSize: 16.5, fontWeight: "600", color: colors.ink }}
              numberOfLines={1}
            >
              {item.listing_title}
            </Text>
            <Text style={{ fontSize: 12, color: unread ? colors.slate : colors.sage, fontWeight: unread ? "600" : "400" }}>
              {item.timestamp}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 14.5, color: unread ? colors.ink : colors.sage, fontWeight: unread ? "500" : "400" }}
            >
              {!isCollabnb && item.host_name ? `${item.host_name}: ` : ""}
              {item.last_message}
            </Text>
            {!isCollabnb && (
              <View
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  backgroundColor: TAG_COLORS[item.tag] || colors.stone,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: "600", color: TAG_TEXT_COLORS[item.tag] || colors.slate }}>
                  {item.tag}
                </Text>
              </View>
            )}
            {unread && (
              <View
                style={{
                  marginLeft: 8,
                  minWidth: 21,
                  height: 21,
                  borderRadius: 11,
                  paddingHorizontal: 6,
                  backgroundColor: colors.slate,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 4,
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
                borderRadius: 22,
                paddingHorizontal: 14,
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
              <Text style={{ fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 }}>{headerTitle}</Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity onPress={() => setShowSearch(true)}>
                  <Search color={colors.ink} size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings((s) => !s)}>
                  <Settings color={colors.ink} size={24} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: activeFilter === f ? colors.mint : colors.bone,
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: "500", color: activeFilter === f ? colors.slate : colors.sage }}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
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

      {visible.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <MessageCircle color={colors.stone} size={64} />
          <Text style={{ fontSize: 20, fontWeight: "600", color: colors.ink, marginTop: 20 }}>
            {isLoading ? "Loading..." : searchQuery ? "No matches found" : "No messages yet"}
          </Text>
          {!isLoading && (
            <Text style={{ fontSize: 14, color: colors.slate, textAlign: "center", marginTop: 8 }}>
              {searchQuery ? "Try a different search term" : emptyStateText}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          renderItem={renderThread}
          keyExtractor={(item) => item.thread_key || item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}
        />
      )}
    </View>
  );
}
