import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useMemo, useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolation, runOnJS } from "react-native-reanimated";
import * as haptic from "@/utils/haptics";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import {
  Star,
  X,
  Send,
  Bookmark,
  Users,
  FileText,
  CheckCircle2,
  Heart,
  Search,
  LayoutGrid,
  Layers,
  MapPin,
} from "lucide-react-native";
import { formatFollowers } from "@/utils/profileHelpers";
import useHostCreators from "@/hooks/useHostCreators";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import StatusBarBlur from "@/components/StatusBarBlur";
import { BottomSheet } from "@/components/ui";
import { colors, fonts, tracking, track } from "@/config/theme";
import { api } from "@/convex/_generated/api";
import UserSafetySheet from "@/components/UserSafetySheet";
import { onTabScroll } from "@/utils/tabBarScroll";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FEED_CARD_GAP = 12;

const GRID_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
const MAX_CARD_TAGS = 3;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

// Horizontal swipe on a feed card: left passes, right hearts. Vertical motion
// fails the pan so the FlatList keeps its paging.
function SwipeableFeedCard({ children, onSwipeLeft, onSwipeRight, swipedRef }) {
  const x = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-14, 14])
    .onStart(() => {
      runOnJS(haptic.select)();
    })
    .onUpdate((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      const fling = Math.abs(e.velocityX) > 900;
      if (x.value > SWIPE_THRESHOLD || (fling && e.velocityX > 0)) {
        x.value = withTiming(SCREEN_WIDTH * 1.4, { duration: 220 }, () => runOnJS(onSwipeRight)());
      } else if (x.value < -SWIPE_THRESHOLD || (fling && e.velocityX < 0)) {
        x.value = withTiming(-SCREEN_WIDTH * 1.4, { duration: 220 }, () => runOnJS(onSwipeLeft)());
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    })
    .onFinalize(() => {
      runOnJS(markSwiped)(swipedRef);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { rotate: `${interpolate(x.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-10, 10])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ flex: 1 }, cardStyle]}>
        {children}
        <Animated.View pointerEvents="none" style={[swipeBadge, { left: 18, borderColor: "#E63946" }, likeStyle]}>
          <Heart size={22} color="#E63946" fill="#E63946" />
          <Text style={[swipeBadgeText, { color: "#E63946" }]}>SAVE</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[swipeBadge, { right: 18, borderColor: colors.slate }, passStyle]}>
          <X size={22} color={colors.slate} strokeWidth={2.5} />
          <Text style={[swipeBadgeText, { color: colors.slate }]}>PASS</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function markSwiped(ref) {
  ref.current = Date.now();
}

const swipeBadge = {
  position: "absolute",
  top: 22,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 14,
  borderWidth: 2,
  backgroundColor: "rgba(255,255,255,0.92)",
};
const swipeBadgeText = { fontFamily: fonts.bodySemibold, fontSize: 14, letterSpacing: 1.5 };

const proposalText = (creator, listing) =>
  `Hi ${creator.name} — I'd love to collaborate. Here's a proposal for you: ${listing.title}${listing.location ? ` in ${listing.location}` : ""}.`;

export default function HostCreatorsScreen() {
  const { realCreators: creators, isLoading } = useHostCreators();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showPastCollabsSheet, setShowPastCollabsSheet] = useState(false);
  const [selectedCreatorForCollabs, setSelectedCreatorForCollabs] =
    useState(null);
  const [showSavedCreators, setShowSavedCreators] = useState(false);
  const [selectedCreatorsForBulk, setSelectedCreatorsForBulk] = useState([]);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("swipe");
  const [detailCreator, setDetailCreator] = useState(null);
  const [pitchPreview, setPitchPreview] = useState(null);
  const [safetyCreator, setSafetyCreator] = useState(null);
  const [sendingPitch, setSendingPitch] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [workedWithOnly, setWorkedWithOnly] = useState(false);


  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const createThreadCvx = useMutation(api.threads.create);
  const sendMessageCvx = useMutation(api.threadMessages.sendMessage);
  const toggleSavedCvx = useMutation(api.profiles.toggleSavedCreator);
  const createInviteCvx = useMutation(api.pitches.createInvite);
  const hostId = profile?._id ? String(profile._id) : null;
  const pitches = useQuery(api.pitches.getByHost, hostId ? { hostId } : "skip");
  const collabs = useQuery(api.collaborations.getByHost, hostId ? { hostId } : "skip");
  const listings = useQuery(api.listings.getByHost, hostId ? { host_id: hostId } : "skip");

  const availableListings = useMemo(
    () =>
      (listings ?? [])
        .filter((l) => l.status === "published" && l.is_sample !== true)
        .map((l) => ({
          id: String(l._id),
          title: l.title,
          location:
            l.location || [l.location_city, l.location_country].filter(Boolean).join(", "),
        })),
    [listings],
  );

  // The account-wide shortlist shared with web. It can hold creators who are no
  // longer public, so only count the ones this page can actually show.
  const savedCreatorIds = useMemo(
    () =>
      (profile?.saved_creator_ids ?? []).filter((id) =>
        creators.some((c) => c.id === id),
      ),
    [profile?.saved_creator_ids, creators],
  );

  // Creators this host has actually booked — approved pitches, one per creator.
  const workedWith = useMemo(() => {
    const seen = new Map();
    (pitches ?? [])
      .filter((p) => p.status === "approved" && p.creator_id)
      .forEach((p) => {
        if (!seen.has(p.creator_id)) {
          seen.set(p.creator_id, {
            id: p.creator_id,
            name: p.creator_name || "Creator",
            username: p.creator_username,
            avatarUri: p.creator_avatar || null,
            tier: p.creator_tier,
            followers: formatFollowers(p.creator_followers ?? 0),
            tags: [],
            bio: "",
          });
        }
      });
    return [...seen.values()];
  }, [pitches]);

  // A booked creator can have left the public directory, so the pitch's own
  // details stand in when there's no live profile to show.
  const workedWithCreators = useMemo(
    () => workedWith.map((w) => creators.find((c) => c.id === w.id) ?? w),
    [workedWith, creators],
  );

  const visibleCreators = useMemo(() => {
    const pool = workedWithOnly ? workedWithCreators : creators;
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((c) =>
      [c.name, c.username, c.location, c.tier, ...c.tags].some((field) =>
        field?.toLowerCase().includes(q),
      ),
    );
  }, [creators, workedWithCreators, workedWithOnly, query]);

  const updateQuery = (text) => {
    setQuery(text);
  };

  const setWorkedWithFilter = (on) => {
    setWorkedWithOnly(on);
    if (on) Keyboard.dismiss();
  };

  const toggleSaved = async (creator) => {
    if (!profile?._id) return;
    await toggleSavedCvx({ profileId: profile._id, creatorId: creator.id });
  };

  const pitchTextFor = (creator, listing) =>
    listing
      ? proposalText(creator, listing)
      : `Hi ${creator.name} — I'd love to collaborate with you. Let me know if you're interested!`;

  const inviteArgs = (creator, listing, text, threadKey) => ({
    listingId: listing.id,
    creatorId: creator.id,
    creatorName: creator.name,
    creatorUsername: creator.username || undefined,
    creatorAvatar: creator.avatarUri || undefined,
    creatorTier: creator.tier || undefined,
    creatorFollowers: creator.followerCount || undefined,
    creatorEngagement: creator.engagement || undefined,
    message: text,
    threadKey,
  });

  const sendPitch = async (creator) => {
    if (!profile?._id) return;
    const listing = availableListings[0];
    const hostId = String(profile._id);
    const threadKey = `thread_host_${hostId}_${creator.id}`;
    const text = pitchTextFor(creator, listing);

    const invite = listing
      ? await createInviteCvx(inviteArgs(creator, listing, text, threadKey))
      : null;
    const alreadyInvited = invite?.created === false;

    if (!alreadyInvited) {
      await createThreadCvx({
        listingTitle: listing?.title || `Chat with ${creator.name}`,
        hostName: creator.name,
        hostAvatar: creator.avatarUri,
        tag: "Pitch",
        lastMessage: text.slice(0, 100),
        participantId: creator.id,
        threadKey,
      });

      await sendMessageCvx({
        threadKey,
        senderId: hostId,
        senderName: profile.full_name || "Host",
        senderAvatar: profile.avatar_url,
        senderRole: "host",
        text,
      });
    }

    router.push({
      pathname: `/messages/${threadKey}`,
      params: {
        listingTitle: listing?.title || `Chat with ${creator.name}`,
        hostName: creator.name,
        hostAvatar: creator.avatarUri || "",
        tag: "Pitch",
      },
    });
  };

  const openWorkedWith = (creatorId) => {
    setSelectedCreatorForCollabs(creatorId);
    setShowPastCollabsSheet(true);
  };

  const handleBulkMessage = async (listingId) => {
    if (!profile?._id) return;
    const listing = availableListings.find((l) => l.id === listingId);
    if (!listing) return;

    const hostId = String(profile._id);
    const selectedCreators = creators.filter((c) =>
      selectedCreatorsForBulk.includes(c.id),
    );

    for (const creator of selectedCreators) {
      const threadKey = `thread_host_${hostId}_${creator.id}`;
      const text = proposalText(creator, listing);

      const invite = await createInviteCvx(inviteArgs(creator, listing, text, threadKey));
      if (invite?.created === false) continue;

      await createThreadCvx({
        listingTitle: listing.title,
        hostName: creator.name,
        hostAvatar: creator.avatarUri,
        tag: "Pitch",
        lastMessage: text.slice(0, 100),
        participantId: creator.id,
        threadKey,
      });

      await sendMessageCvx({
        threadKey,
        senderId: hostId,
        senderName: profile.full_name || "Host",
        senderAvatar: profile.avatar_url,
        senderRole: "host",
        text,
      });

    }

    setShowListingPicker(false);
    setShowSavedCreators(false);
    setSelectedCreatorsForBulk([]);
    alert(
      `Sent listing proposal to ${selectedCreators.length} creator${selectedCreators.length > 1 ? "s" : ""}!`,
    );
  };

  return (
    <AtmosphericBackground>
      <StatusBar style={statusBarStyle()} />
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        {/* Search + swipe/grid switch */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Glass
            variant="small"
            style={{ flex: 1 }}
            contentStyle={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 44 }}
          >
            <Search color={colors.sage} size={18} />
            {workedWithOnly ? (
              <TouchableOpacity
                onPress={() => setWorkedWithFilter(false)}
                accessibilityLabel="Clear worked with filter"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: colors.mint,
                }}
              >
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>Worked with</Text>
                <X color={colors.ink} size={12} />
              </TouchableOpacity>
            ) : null}
            <TextInput
              value={query}
              onChangeText={updateQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={workedWithOnly ? "Search" : "Search name, niche or location"}
              placeholderTextColor={colors.sage}
              autoCorrect={false}
              returnKeyType="search"
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink }}
            />
            {query ? (
              <TouchableOpacity onPress={() => updateQuery("")} hitSlop={8}>
                <X color={colors.sage} size={16} />
              </TouchableOpacity>
            ) : null}
          </Glass>
          <Glass variant="small" contentStyle={{ flexDirection: "row", padding: 4, height: 44 }}>
            {[
              { mode: "swipe", Icon: Layers, label: "Swipe view" },
              { mode: "grid", Icon: LayoutGrid, label: "Grid view" },
            ].map(({ mode, Icon, label }) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={{
                  width: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: viewMode === mode ? colors.mint : "transparent",
                }}
              >
                <Icon color={colors.ink} size={18} />
              </TouchableOpacity>
            ))}
          </Glass>
        </View>

        {searchFocused && !workedWithOnly && workedWith.length > 0 ? (
          <TouchableOpacity
            onPress={() => setWorkedWithFilter(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: colors.mint,
              marginBottom: 12,
            }}
          >
            <Users color={colors.ink} size={14} />
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>
              Worked with ({workedWith.length})
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Top row — creator count + saved shortlist */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.sage }}>
            {isLoading
              ? "Loading creators"
              : `${visibleCreators.length} creator${visibleCreators.length === 1 ? "" : "s"}${viewMode === "swipe" ? " · swipe up for next, tap for details" : ""}`}
          </Text>
          {savedCreatorIds.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowSavedCreators(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: colors.mint,
              }}
            >
              <Bookmark color={colors.ink} size={14} fill={colors.ink} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>
                {savedCreatorIds.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {viewMode === "swipe" ? (
          <CreatorFeed
            key={`${query}|${workedWithOnly}`}
            isLoading={isLoading}
            creators={visibleCreators}
            savedCreatorIds={savedCreatorIds}
            bottomInset={insets.bottom + 90}
            emptyTitle={query || workedWithOnly ? "No creators match" : "No creators yet"}
            emptyDetail={query || workedWithOnly ? "Try a different name, niche or location" : "Check back later for new matches"}
            onToggleSave={toggleSaved}
            onOpenCreator={setDetailCreator}
          />
        ) : (
          <ScrollView
            style={{ marginHorizontal: -20 }}
            onScroll={onTabScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 110 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <CreatorGrid
              isLoading={isLoading}
              creators={visibleCreators}
              savedCreatorIds={savedCreatorIds}
              emptyTitle={query || workedWithOnly ? "No creators match" : "No creators yet"}
              onToggleSave={toggleSaved}
              onOpenCreator={setDetailCreator}
            />
          </ScrollView>
        )}
      </View>

      <StatusBarBlur />

      <CreatorDetailSheet
        creator={detailCreator}
        isSaved={!!detailCreator && savedCreatorIds.includes(detailCreator.id)}
        hasWorkedWith={!!detailCreator && workedWith.some((c) => c.id === detailCreator.id)}
        onViewPastCollabs={(creator) => {
          setDetailCreator(null);
          openWorkedWith(creator.id);
        }}
        onToggleSave={toggleSaved}
        onPitch={(creator) => {
          setDetailCreator(null);
          setPitchPreview(creator);
        }}
        onReport={(creator) => {
          setDetailCreator(null);
          setSafetyCreator(creator);
        }}
        onClose={() => setDetailCreator(null)}
      />

      {safetyCreator && profile?._id ? (
        <UserSafetySheet
          visible
          onClose={() => setSafetyCreator(null)}
          profileId={String(profile._id)}
          targetId={String(safetyCreator.id)}
          targetName={safetyCreator.name}
        />
      ) : null}

      <PitchPreviewSheet
        creator={pitchPreview}
        listing={availableListings[0]}
        text={pitchPreview ? pitchTextFor(pitchPreview, availableListings[0]) : ""}
        sending={sendingPitch}
        onCancel={() => !sendingPitch && setPitchPreview(null)}
        onConfirm={async () => {
          setSendingPitch(true);
          try {
            await sendPitch(pitchPreview);
            setPitchPreview(null);
          } catch (e) {
            alert(e?.data || e?.message || "Couldn't send the pitch. Try again.");
          } finally {
            setSendingPitch(false);
          }
        }}
      />

      {/* Past Collaborations Bottom Sheet */}
      <PastCollaborationsSheet
        visible={showPastCollabsSheet}
        creatorId={selectedCreatorForCollabs}
        allCollabs={collabs}
        onClose={() => setShowPastCollabsSheet(false)}
        insets={insets}
      />

      {/* Saved Creators Modal */}
      <SavedCreatorsModal
        visible={showSavedCreators}
        creators={creators}
        savedCreatorIds={savedCreatorIds}
        selectedForBulk={selectedCreatorsForBulk}
        onToggleSelect={(creatorId) => {
          if (selectedCreatorsForBulk.includes(creatorId)) {
            setSelectedCreatorsForBulk(
              selectedCreatorsForBulk.filter((id) => id !== creatorId),
            );
          } else {
            setSelectedCreatorsForBulk([...selectedCreatorsForBulk, creatorId]);
          }
        }}
        onSendBulk={() => setShowListingPicker(true)}
        onClose={() => setShowSavedCreators(false)}
        insets={insets}
      />

      {/* Listing Picker Modal */}
      <ListingPickerModal
        visible={showListingPicker}
        availableListings={availableListings}
        onSelectListing={handleBulkMessage}
        onClose={() => setShowListingPicker(false)}
      />
    </AtmosphericBackground>
  );
}

// Falls back to the same branded initial on every card when there's no image
// or it fails to load.
function CreatorPhoto({ uri, name, initialSize }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <LinearGradient
        colors={[colors.mint, colors.bone]}
        style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: initialSize * 2,
            height: initialSize * 2,
            borderRadius: initialSize,
            backgroundColor: colors.slate,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: initialSize, color: colors.surface }}>
            {name?.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      </LinearGradient>
    );
  }
  return (
    <Image
      key={uri}
      source={{ uri }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      contentPosition="top"
      transition={200}
      onError={() => setFailed(true)}
    />
  );
}

function HeartButton({ saved, onPress, size = 16 }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save creator"}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        width: size + 18,
        height: size + 18,
        borderRadius: (size + 18) / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.9)",
      }}
    >
      <Heart color={colors.ink} size={size} fill={saved ? colors.ink : "transparent"} />
    </Pressable>
  );
}

function CreatorGrid({ isLoading, creators, savedCreatorIds, emptyTitle, onToggleSave, onOpenCreator }) {
  if (isLoading) {
    return (
      <View style={{ height: 240, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.slate} />
      </View>
    );
  }
  if (creators.length === 0) {
    return (
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.slate, textAlign: "center", marginTop: 48 }}>
        {emptyTitle}
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {creators.map((creator) => (
        <Pressable
          key={creator.id}
          onPress={() => onOpenCreator(creator)}
          style={({ pressed }) => ({ width: GRID_CARD_WIDTH, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Glass variant="card">
            <View
              style={{
                height: GRID_CARD_WIDTH,
                backgroundColor: colors.bone,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <CreatorPhoto uri={creator.avatarUri} name={creator.name} initialSize={32} />
              <HeartButton saved={savedCreatorIds.includes(creator.id)} onPress={() => onToggleSave(creator)} />
            </View>
            <View style={{ padding: 12, gap: 3 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink }}>
                {creator.name}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate }}>
                {creator.followers} · {creator.tier}
              </Text>
            </View>
          </Glass>
        </Pressable>
      ))}
    </View>
  );
}

function PitchPreviewSheet({ creator, listing, text, sending, onCancel, onConfirm }) {
  if (!creator) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(25, 37, 36, 0.7)", justifyContent: "flex-end" }}>
        <TouchableOpacity activeOpacity={1} onPress={onCancel} style={{ flex: 1 }} />
        <BottomSheet horizontal={false}>
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 18, color: colors.ink }}>
              Send pitch to {creator.name}?
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
              {listing ? `Invites them to ${listing.title}.` : "No published listing yet, so this sends a message only."}
            </Text>
            <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.ink }}>{text}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={onCancel}
                disabled={sending}
                style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surface }}
              >
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={sending}
                style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: colors.slate, opacity: sending ? 0.6 : 1 }}
              >
                {sending ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function CreatorDetailSheet({ creator, isSaved, hasWorkedWith, onViewPastCollabs, onToggleSave, onPitch, onReport, onClose }) {
  if (!creator) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(25, 37, 36, 0.7)", justifyContent: "flex-end" }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1 }} />
        <BottomSheet horizontal={false}>
          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.66 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <View
              style={{
                height: 260,
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: colors.stone,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreatorPhoto uri={creator.avatarUri} name={creator.name} initialSize={48} />
            </View>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 24,
                color: colors.ink,
                letterSpacing: track(24, tracking.display),
              }}
            >
              {creator.name}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.slate }}>
              {creator.tier} · {creator.followers} followers
            </Text>
            {creator.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MapPin color={colors.sage} size={14} />
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                  {creator.location}
                </Text>
              </View>
            ) : null}
            {creator.tags.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {creator.tags.map((tag) => (
                  <View
                    key={tag}
                    style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.surface }}
                  >
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.slate }}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {creator.bio ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20 }}>
                {creator.bio}
              </Text>
            ) : null}
            {hasWorkedWith ? (
              <TouchableOpacity onPress={() => onViewPastCollabs(creator)} hitSlop={8}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink, textDecorationLine: "underline" }}>
                  View past collabs
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => onReport(creator)} hitSlop={8}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: "#c0392b" }}>Report or block</Text>
            </TouchableOpacity>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => onToggleSave(creator)}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: isSaved ? colors.mint : colors.surface,
              }}
            >
              <Bookmark color={colors.ink} size={16} fill={isSaved ? colors.ink : "transparent"} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>
                {isSaved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onPitch(creator)}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.slate,
              }}
            >
              <Send color={colors.surface} size={16} />
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}>Send pitch</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </View>
    </Modal>
  );
}

// Vertical full-card feed: native paging keeps the swipe tracking the finger
// and settling on the next creator, like an Instagram feed.
function CreatorFeed({
  isLoading,
  creators,
  savedCreatorIds,
  bottomInset,
  emptyTitle,
  emptyDetail,
  onToggleSave,
  onOpenCreator,
}) {
  const [pageHeight, setPageHeight] = useState(0);
  const [dismissedIds, setDismissedIds] = useState([]);
  const swipedRef = useRef(0);
  const cardHeight = pageHeight - FEED_CARD_GAP;
  const feedCreators = creators.filter((c) => !dismissedIds.includes(c.id));

  const dismiss = (creator) => setDismissedIds((ids) => [...ids, creator.id]);
  const swipeRight = (creator) => {
    haptic.success();
    if (!savedCreatorIds.includes(creator.id)) onToggleSave(creator);
    dismiss(creator);
  };
  const swipeLeft = (creator) => {
    haptic.tap();
    dismiss(creator);
  };

  const renderCard = ({ item: creator }) => (
    <View style={{ height: pageHeight, paddingBottom: FEED_CARD_GAP }}>
      <SwipeableFeedCard
        swipedRef={swipedRef}
        onSwipeRight={() => swipeRight(creator)}
        onSwipeLeft={() => swipeLeft(creator)}
      >
      <Pressable
        style={{ flex: 1 }}
        onPress={() => {
          if (Date.now() - swipedRef.current < 350) return;
          onOpenCreator(creator);
        }}
      >
        {/* radius here (24) is a touch looser than glass.card's 20 (radii.lg) —
            closest available token, kept for the feed's "hero" card. */}
        <Glass variant="card" style={{ height: cardHeight, borderRadius: 24 }}>
          <View
            style={{
              height: cardHeight - (creator.bio ? 212 : 150),
              width: "100%",
              backgroundColor: colors.bone,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CreatorPhoto uri={creator.avatarUri} name={creator.name} initialSize={48} />
            <HeartButton saved={savedCreatorIds.includes(creator.id)} onPress={() => onToggleSave(creator)} size={20} />
          </View>

          <View style={{ padding: 20 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.display,
                fontSize: 24,
                color: colors.ink,
                letterSpacing: track(24, tracking.display),
                marginBottom: 6,
              }}
            >
              {creator.name}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.mint }}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>
                  {creator.tier}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.bone }}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>
                  {creator.followers} followers
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
              {[
                ...creator.tags.slice(0, MAX_CARD_TAGS),
                ...(creator.tags.length > MAX_CARD_TAGS
                  ? [`+${creator.tags.length - MAX_CARD_TAGS}`]
                  : []),
              ].map((tag) => (
                <View
                  key={tag}
                  style={{ flexShrink: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.bone }}
                >
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.slate }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>

            {creator.bio ? (
              <>
                <Text
                  style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, lineHeight: 18 }}
                  numberOfLines={2}
                >
                  {creator.bio}
                </Text>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink, marginTop: 4 }}>
                  Read more
                </Text>
              </>
            ) : null}
          </View>
        </Glass>
      </Pressable>
      </SwipeableFeedCard>
    </View>
  );

  return (
    <View
      style={{ flex: 1, marginBottom: bottomInset }}
      onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
    >
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.slate} />
        </View>
      ) : feedCreators.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Users color={colors.sage} size={48} />
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 18, color: colors.ink, marginTop: 16, textAlign: "center" }}>
            {emptyTitle}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, marginTop: 8, textAlign: "center" }}>
            {emptyDetail}
          </Text>
        </View>
      ) : pageHeight > 0 ? (
        <FlatList
          data={feedCreators}
          extraData={savedCreatorIds}
          keyExtractor={(creator) => creator.id}
          renderItem={renderCard}
          pagingEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={2}
          windowSize={5}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        />
      ) : null}
    </View>
  );
}

// Past Collaborations Sheet
//
// A true bottom sheet: top-only rounded corners, flush with the screen's
// bottom edge. <Glass> always rounds all four corners (its `radius` isn't
// overridable per-corner without editing the locked Glass.jsx), so it can't
// reproduce this shape — left as a raw BlurView per STYLE-GUIDE.md's "when
// web and mobile genuinely can't match" guidance. Colors are still tokenized.
function PastCollaborationsSheet({ visible, creatorId, allCollabs, onClose, insets }) {
  if (!visible || !creatorId) return null;

  const collabs = (allCollabs ?? []).filter(
    (c) => String(c.creator_id) === String(creatorId) && c.is_sample !== true,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.7)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "75%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.stone,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: colors.ink,
                  letterSpacing: track(20, tracking.display),
                }}
              >
                Past Collaborations
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bone,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color={colors.slate} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {collabs.length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Users color={colors.sage} size={48} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 16,
                      color: colors.ink,
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    No past collaborations
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.slate,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    This would be a first collaboration
                  </Text>
                </View>
              ) : (
                collabs.map((collab) => (
                  <View
                    key={collab._id}
                    style={{
                      marginBottom: 12,
                      padding: 16,
                      backgroundColor: colors.bone,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.stone,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 16,
                        color: colors.ink,
                        letterSpacing: track(16, tracking.display),
                        marginBottom: 4,
                      }}
                    >
                      {collab.property_name || "Collaboration"}
                    </Text>
                    {!!collab.dates && (
                      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                        {collab.dates}
                      </Text>
                    )}
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.sage, marginTop: 6 }}>
                      {collab.status_text || collab.status}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// Saved Creators Modal
//
// Another true bottom sheet (top-only radius) — see the note above
// PastCollaborationsSheet for why this stays a raw BlurView.
function SavedCreatorsModal({
  visible,
  creators,
  savedCreatorIds,
  selectedForBulk,
  onToggleSelect,
  onSendBulk,
  onClose,
  insets,
}) {
  if (!visible) return null;

  const savedCreators = creators.filter((c) => savedCreatorIds.includes(c.id));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.7)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.stone,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: colors.ink,
                  letterSpacing: track(20, tracking.display),
                }}
              >
                Saved Creators ({savedCreatorIds.length})
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bone,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color={colors.slate} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {savedCreators.map((creator) => {
                const isSelected = selectedForBulk.includes(creator.id);
                return (
                  <TouchableOpacity
                    key={creator.id}
                    onPress={() => onToggleSelect(creator.id)}
                    style={{
                      marginBottom: 12,
                      padding: 16,
                      backgroundColor: isSelected ? colors.mint : colors.bone,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.slate : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        overflow: "hidden",
                        marginRight: 12,
                      }}
                    >
                      <CreatorPhoto uri={creator.avatarUri} name={creator.name} initialSize={14} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodySemibold,
                          fontSize: 16,
                          color: colors.ink,
                          marginBottom: 4,
                        }}
                      >
                        {creator.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: colors.surface,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.bodySemibold,
                              fontSize: 11,
                              color: colors.ink,
                            }}
                          >
                            {creator.tier}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate }}>
                          {creator.followers}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <CheckCircle2 color={colors.slate} size={24} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedForBulk.length > 0 && (
              <View
                style={{
                  padding: 20,
                  borderTopWidth: 1,
                  borderTopColor: colors.stone,
                }}
              >
                <TouchableOpacity
                  onPress={onSendBulk}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 12,
                    backgroundColor: colors.slate,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Send color={colors.surface} size={20} />
                  <Text
                    style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.surface }}
                  >
                    Send to {selectedForBulk.length} creator
                    {selectedForBulk.length > 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// Listing Picker Modal — a centered dialog (not a bottom sheet), so its
// uniform corner radius can use <Glass> like any other card.
function ListingPickerModal({
  visible,
  availableListings,
  onSelectListing,
  onClose,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.8)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Glass variant="card" style={{ borderRadius: 24, maxHeight: "70%" }}>
          <View
            style={{
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.stone,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.ink,
                letterSpacing: track(20, tracking.display),
                marginBottom: 8,
              }}
            >
              Choose a listing
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate }}>
              Select which listing to propose to selected creators
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 20 }}
          >
            {availableListings.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <FileText color={colors.sage} size={48} />
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 16,
                    color: colors.ink,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  No listings available
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.slate,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Create a listing first
                </Text>
              </View>
            ) : (
              availableListings.map((listing) => (
                <TouchableOpacity
                  key={listing.id}
                  onPress={() => onSelectListing(listing.id)}
                  style={{
                    marginBottom: 12,
                    padding: 16,
                    backgroundColor: colors.bone,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.stone,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 16,
                      color: colors.ink,
                      marginBottom: 4,
                    }}
                  >
                    {listing.title}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                    {listing.location}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View
            style={{
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: colors.stone,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.bone,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Glass>
      </View>
    </Modal>
  );
}
