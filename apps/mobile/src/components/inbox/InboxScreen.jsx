import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Search, Settings, MessageCircle, X, Pin, PinOff, BellOff, Bell, Archive, ArchiveRestore, ChevronLeft, Check } from "lucide-react-native";
import { useConversations } from "@/hooks/useConversations";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, tracking, track, lineHeights } from "@/config/theme";

const FILTERS = ["All", "Unread", "Applications", "Collabs", "Pitches"];
const PREFS_KEY = "inbox.prefs.v1";
const keyOf = (t) => t.thread_key || t.id;

// Pin / mute / archive are per-device (no backend field for them yet), kept in
// AsyncStorage as plain id lists.
function useInboxPrefs() {
  const [prefs, setPrefs] = useState({ pinned: [], muted: [], archived: [] });
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => raw && setPrefs((p) => ({ ...p, ...JSON.parse(raw) })))
      .catch(() => {});
  }, []);
  // Toggle `ids` in `list`: if every id is already in it, remove them; else add.
  const toggle = useCallback((list, ids) => {
    setPrefs((p) => {
      const cur = new Set(p[list]);
      const allIn = ids.every((id) => cur.has(id));
      ids.forEach((id) => (allIn ? cur.delete(id) : cur.add(id)));
      const next = { ...p, [list]: [...cur] };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  return { prefs, toggle };
}

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
          <Text style={{ fontSize: size * 0.32, fontFamily: fonts.display, color: colors.slate }}>{initials}</Text>
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
            borderColor: colors.surface,
          }}
        >
          <Text style={{ fontSize: 9, color: colors.surface }}>★</Text>
        </View>
      )}
    </View>
  );
}

export default function SharedInboxScreen({ viewAs = "creator" }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { threads, isLoading } = useConversations();
  const { prefs, toggle } = useInboxPrefs();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState([]); // thread keys; non-empty = selection mode
  const rows = useRef({}); // thread key -> swipeable, so an action can close its row

  const pinned = useMemo(() => new Set(prefs.pinned), [prefs.pinned]);
  const muted = useMemo(() => new Set(prefs.muted), [prefs.muted]);
  const archived = useMemo(() => new Set(prefs.archived), [prefs.archived]);
  const selecting = selected.length > 0;

  const archivedCount = useMemo(() => threads.filter((t) => archived.has(keyOf(t))).length, [threads, archived]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = threads.filter((t) => archived.has(keyOf(t)) === showArchived);
    if (activeFilter === "Unread") list = list.filter((t) => t.unread > 0);
    else if (activeFilter !== "All") {
      const singular = activeFilter.slice(0, -1);
      list = list.filter((t) => t.tag === singular || t.tag === activeFilter);
    }
    if (q) {
      list = list.filter(
        (t) =>
          (t.listing_title || "").toLowerCase().includes(q) ||
          (t.host_name || "").toLowerCase().includes(q) ||
          (t.last_message || "").toLowerCase().includes(q)
      );
    }
    // Pinned first, otherwise keep the server order (stable sort).
    return [...list].sort((a, b) => Number(pinned.has(keyOf(b))) - Number(pinned.has(keyOf(a))));
  }, [threads, archived, showArchived, activeFilter, searchQuery, pinned]);

  const openThread = (item) => {
    router.push({
      pathname: `/messages/${encodeURIComponent(keyOf(item))}`,
      params: {
        listingTitle: item.listing_title,
        hostName: item.host_name,
        hostAvatar: item.host_avatar || "",
        tag: item.tag,
        isFounder: item.is_founder ? "1" : "",
      },
    });
  };

  const toggleSelected = (key) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const act = (list, ids) => {
    toggle(list, ids);
    setSelected([]);
  };

  const headerTitle = viewAs === "host" ? "Inbox" : "Messages";
  const emptyStateText =
    viewAs === "host"
      ? "Start chatting with creators about collaborations"
      : "Start chatting with hosts about collaborations";

  const swipeAction = (bg, Icon, label, onPress) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ width: 84, backgroundColor: bg, alignItems: "center", justifyContent: "center", gap: 4 }}
    >
      <Icon color={colors.surface} size={20} />
      <Text style={{ color: colors.surface, fontSize: 11, fontFamily: fonts.bodySemibold }}>{label}</Text>
    </TouchableOpacity>
  );

  const renderThread = ({ item }) => {
    const key = keyOf(item);
    const isCollabnb = item.tag === "Collabnb" || item.tag === "Notifications";
    const unread = item.unread > 0;
    const isSel = selected.includes(key);
    const isPinned = pinned.has(key);
    const isMuted = muted.has(key);
    const close = () => rows.current[key]?.close();

    return (
      <ReanimatedSwipeable
        enabled={!selecting}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        onSwipeableWillOpen={() => {
          // one open row at a time, like WhatsApp
          Object.entries(rows.current).forEach(([k, r]) => k !== key && r?.close());
        }}
        renderLeftActions={() =>
          swipeAction(colors.slate, isPinned ? PinOff : Pin, isPinned ? "Unpin" : "Pin", () => {
            close();
            toggle("pinned", [key]);
          })
        }
        renderRightActions={() =>
          swipeAction(colors.sage, archived.has(key) ? ArchiveRestore : Archive, archived.has(key) ? "Unarchive" : "Archive", () => {
            close();
            toggle("archived", [key]);
          })
        }
        ref={(r) => {
          rows.current[key] = r;
        }}
      >
        <TouchableOpacity
          onPress={() => (selecting ? toggleSelected(key) : openThread(item))}
          onLongPress={() => !selecting && setSelected([key])}
          delayLongPress={250}
          activeOpacity={0.6}
          style={{ flexDirection: "row", paddingLeft: 16, backgroundColor: isSel ? colors.mint : colors.surface }}
        >
          <View style={{ marginRight: 14, paddingVertical: 10 }}>
            <Avatar name={item.host_name} uri={item.host_avatar} isFounder={item.is_founder} />
            {isSel && (
              <View
                style={{
                  position: "absolute", right: -2, bottom: 8, width: 22, height: 22, borderRadius: 11,
                  backgroundColor: colors.slate, alignItems: "center", justifyContent: "center",
                  borderWidth: 2, borderColor: colors.surface,
                }}
              >
                <Check color={colors.surface} size={12} strokeWidth={3} />
              </View>
            )}
          </View>
          <View
            style={{
              flex: 1, justifyContent: "center", paddingVertical: 12, paddingRight: 16,
              borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.stone,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
              <Text style={{ flex: 1, marginRight: 8, fontSize: 16.5, fontFamily: fonts.bodySemibold, color: colors.ink }} numberOfLines={1}>
                {item.listing_title}
              </Text>
              <Text style={{ fontSize: 12, color: unread && !isMuted ? colors.slate : colors.sage, fontFamily: unread && !isMuted ? fonts.bodySemibold : fonts.body }}>
                {item.timestamp}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 14.5, color: unread ? colors.ink : colors.sage, fontFamily: unread ? fonts.bodyMedium : fonts.body }}
              >
                {!isCollabnb && item.host_name ? `${item.host_name}: ` : ""}
                {item.last_message}
              </Text>
              {!isCollabnb && (
                <View
                  style={{
                    marginLeft: 8, paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 6,
                    backgroundColor: TAG_COLORS[item.tag] || colors.stone,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontFamily: fonts.bodySemibold, color: TAG_TEXT_COLORS[item.tag] || colors.slate }}>
                    {item.tag}
                  </Text>
                </View>
              )}
              {isMuted && <BellOff color={colors.sage} size={14} style={{ marginLeft: 8 }} />}
              {isPinned && <Pin color={colors.sage} size={14} style={{ marginLeft: 8 }} />}
              {unread && (
                <View
                  style={{
                    marginLeft: 8, minWidth: 21, height: 21, borderRadius: 11, paddingHorizontal: 6,
                    backgroundColor: isMuted ? colors.sage : colors.slate, alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: fonts.bodySemibold, color: colors.surface }}>{item.unread}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    );
  };

  const selectedItems = threads.filter((t) => selected.includes(keyOf(t)));
  const allPinned = selectedItems.length > 0 && selectedItems.every((t) => pinned.has(keyOf(t)));
  const allMuted = selectedItems.length > 0 && selectedItems.every((t) => muted.has(keyOf(t)));

  const iconBtn = { padding: 6 };

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header — title, or the selection action bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        {selecting ? (
          <View style={{ flexDirection: "row", alignItems: "center", height: 42, marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setSelected([])} style={iconBtn}>
              <X color={colors.ink} size={24} />
            </TouchableOpacity>
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 20, fontFamily: fonts.bodySemibold, color: colors.ink }}>{selected.length}</Text>
            <TouchableOpacity onPress={() => act("pinned", selected)} style={iconBtn}>
              {allPinned ? <PinOff color={colors.ink} size={22} /> : <Pin color={colors.ink} size={22} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => act("muted", selected)} style={iconBtn}>
              {allMuted ? <Bell color={colors.ink} size={22} /> : <BellOff color={colors.ink} size={22} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => act("archived", selected)} style={iconBtn}>
              {showArchived ? <ArchiveRestore color={colors.ink} size={22} /> : <Archive color={colors.ink} size={22} />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            {showArchived && (
              <TouchableOpacity onPress={() => setShowArchived(false)} style={{ ...iconBtn, marginLeft: -6 }}>
                <ChevronLeft color={colors.ink} size={28} />
              </TouchableOpacity>
            )}
            <Text style={{ flex: 1, fontSize: showArchived ? 22 : 30, fontFamily: fonts.display, color: colors.ink, letterSpacing: track(showArchived ? 22 : 30, tracking.display), lineHeight: (showArchived ? 22 : 30) * lineHeights.display }}>
              {showArchived ? "Archived" : headerTitle}
            </Text>
            <TouchableOpacity onPress={() => setShowSettings((v) => !v)} style={iconBtn}>
              <Settings color={colors.ink} size={24} />
            </TouchableOpacity>
          </View>
        )}

        {/* Always-visible search, as in WhatsApp's chat list */}
        <View
          style={{
            flexDirection: "row", alignItems: "center", backgroundColor: colors.bone,
            borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 10,
          }}
        >
          <Search color={colors.sage} size={18} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={colors.sage}
            style={{ flex: 1, fontSize: 15, color: colors.ink, marginLeft: 8, padding: 0 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X color={colors.sage} size={18} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f}
          contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(f)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: activeFilter === f ? colors.ink : colors.mint,
                borderWidth: 1, borderColor: activeFilter === f ? colors.ink : colors.hairline,
              }}
            >
              <Text style={{ fontSize: 13.5, fontFamily: fonts.bodyMedium, color: activeFilter === f ? colors.bone : colors.ink }}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {showSettings && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 10 }}
        >
          <View
            style={{
              position: "absolute", top: insets.top + 56, right: 16, backgroundColor: colors.surface, borderRadius: 16,
              padding: 8, minWidth: 200, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
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

      {visible.length === 0 && !(archivedCount > 0 && !showArchived) ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <MessageCircle color={colors.stone} size={64} />
          <Text style={{ fontSize: 20, fontFamily: fonts.bodySemibold, color: colors.ink, marginTop: 20 }}>
            {isLoading ? "Loading..." : searchQuery ? "No matches found" : showArchived ? "Nothing archived" : activeFilter === "Unread" ? "No unread messages" : "No messages yet"}
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
          keyExtractor={keyOf}
          extraData={[selected, prefs]}
          ListHeaderComponent={
            archivedCount > 0 && !showArchived && !searchQuery ? (
              <TouchableOpacity
                onPress={() => setShowArchived(true)}
                activeOpacity={0.6}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 24 }}
              >
                <Archive color={colors.slate} size={20} style={{ marginLeft: 17 }} />
                <Text style={{ flex: 1, fontSize: 15, fontFamily: fonts.bodySemibold, color: colors.ink }}>Archived</Text>
                <Text style={{ fontSize: 13, color: colors.sage }}>{archivedCount}</Text>
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}
        />
      )}
      </View>
    </AtmosphericBackground>
  );
}
