// Creator V1 screen (namespaced to avoid host collisions)
//
// Backed by the same `collaborations` Convex table as the web app — a
// creator's application *is* the collaboration record (current_stage starts
// at 'pending'), so there's no separate "applications" list to reconcile
// against this one. Stage keys/labels mirror
// Collabnb Website/app/src/lib/mockData.js's STAGES. A per-collab detail
// screen with the stage stepper (CollabDetail.jsx on web) is
// now /collab/[id] — tapping a card opens the stage stepper and next actions.

import { View, Text, TouchableOpacity, Pressable, Animated, ActionSheetIOS, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  MapPin,
  ChevronRight,
  ChevronDown,
  Mail,
  Handshake,
  RefreshCw,
  Upload,
  CheckCircle2,
  Archive as ArchiveIcon,
  ArchiveRestore,
  MessageCircle,
  Pin,
  PinOff,
  StickyNote,
} from "lucide-react-native";
import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import CollabCrmOverview, { useCrmChart } from "@/components/collabs/CollabCrmOverview";
import { useCollabReminders } from "@/hooks/useCollabReminders";
import { CollabCardSkeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import StatusBarBlur from "@/components/StatusBarBlur";
import Glass from "@/components/Glass";
import { useBottomPull, usePullToast, PullToast } from "@/components/PullReveal";
import { parseContract, waitingOn } from "@/utils/contract";
import { threadKeyFor } from "@/utils/threads";
import { loadSubmissions, progress as deliverableProgress } from "@/utils/deliverables";
import { colors, fonts, radii, shadows, tracking, track, lineHeights } from "@/config/theme";

const IMG_FALLBACK = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400";

const STAGE_META = {
  pending: { label: "Application Sent", icon: Mail },
  accepted: { label: "Accepted", icon: Handshake },
  updated: { label: "Adjustments", icon: RefreshCw },
  uploaded_tagged: { label: "Uploaded", icon: Upload },
  closed: { label: "Completed", icon: CheckCircle2 },
  archived: { label: "Archived", icon: ArchiveIcon },
};

function normalizeCollab(c) {
  let stages = {};
  try {
    stages = c.stages ? JSON.parse(c.stages) : {};
  } catch {}
  return {
    id: String(c._id),
    listingId: c.listing_id,
    propertyName: c.property_name || "Collaboration",
    location: c.location,
    hostName: c.host_name || "Host",
    image: c.image || IMG_FALLBACK,
    currentStage: c.current_stage || "pending",
    status: c.status,
    deliverables: c.deliverables,
    daysLeft: c.days_left,
    // isActive is the creator's view: ended collabs and ones they archived both
    // drop out. `ended` keeps the difference, since only live ones can be restored.
    isActive: c.is_active !== false && c.creator_archived !== true,
    ended: c.is_active === false,
    creatorArchived: c.creator_archived === true,
    pinned: c.creator_pinned === true,
    note: c.creator_note || "",
    createdAt: c._creationTime ?? 0,
    isDemo: c.is_demo === true,
    isSample: c.is_sample === true,
    appliedDate: stages?.pending?.date,
    // Inputs for reminder planning (utils/reminders.js).
    contractTurn: c.contract_draft ? waitingOn(parseContract(c.contract_draft)) : null,
    changesRequested: c.deliverable_submissions ? deliverableProgress(loadSubmissions(c.deliverable_submissions, c.deliverables)).changes : 0,
  };
}

// Linear pipeline for the card's progress bar; 'updated' sits with 'accepted'.
const PIPELINE = ["pending", "accepted", "uploaded_tagged", "closed"];
const pipelineIndex = (stage) => (stage === "updated" ? 1 : Math.max(0, PIPELINE.indexOf(stage)));

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function nextAction(collab) {
  if (collab.status === "terminated") return { text: "Collaboration ended", urgent: false };
  if (!collab.isActive) return { text: "Archived", urgent: false };
  switch (collab.currentStage) {
    case "pending":
      return { text: "Waiting on host reply", urgent: false };
    case "accepted":
    case "updated":
      if (collab.contractTurn === "creator") return { text: "Review the contract", urgent: true };
      if (collab.changesRequested > 0) return { text: `Host requested ${plural(collab.changesRequested, "change")}`, urgent: true };
      if (collab.daysLeft != null) {
        return {
          text: collab.daysLeft === 0 ? "Upload content · due today" : `Upload content · ${plural(collab.daysLeft, "day")} left`,
          urgent: collab.daysLeft <= 3,
        };
      }
      return { text: "Plan your stay and content", urgent: false };
    case "uploaded_tagged":
      return { text: "Waiting on host review", urgent: false };
    case "closed":
      return { text: "Completed · leave a rating", urgent: false };
    default:
      return { text: "", urgent: false };
  }
}

export default function CreatorCollaborationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const collabsRaw = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );
  const pitches = useQuery(
    api.pitches.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );
  const contracts = useQuery(
    api.contracts.getForParty,
    profile?._id ? { userId: String(profile._id) } : "skip",
  );

  const toast = usePullToast();
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [sortBy, setSortBy] = useState("all");
  const setCreatorCrm = useMutation(api.collaborations.setCreatorCrm);
  const crm = (c, patch) =>
    setCreatorCrm({ id: c.id, ...patch }).catch(() => Alert.alert("Couldn't save", "Check your connection and try again."));
  const scrollY = useRef(new Animated.Value(0)).current;
  const swipeRefs = useRef({});

  const collabs = useMemo(() => (collabsRaw || []).map(normalizeCollab), [collabsRaw]);
  useCollabReminders(collabs, profile?.notification_prefs);

  // Demo and sample rows are there to show an empty state what it will look
  // like; counting them would overstate every number on the dashboard.
  const realActive = useMemo(
    () => collabs.filter((c) => c.isActive && !c.isDemo && !c.isSample),
    [collabs],
  );

  const chart = useCrmChart(pitches, contracts);

  const listingOptions = useMemo(() => {
    const names = new Set(collabs.map((c) => c.propertyName).filter(Boolean));
    return ["all", ...Array.from(names)];
  }, [collabs]);

  const OPEN_STAGES_EXCLUDED = ["uploaded_tagged", "closed", "archived"];

  const applyStat = (status, due) => {
    setStatusFilter(status);
    setDueFilter(due);
    setListingFilter("all");
  };

  const stats = useMemo(() => {
    const pendingCount = (pitches || []).filter((p) => p.status === "pending").length;
    const paid = (contracts || []).filter((c) => c.paid);
    const earned = paid.reduce((sum, c) => sum + (c.payment_amount ?? c.cash_value ?? 0), 0);
    const due = realActive.filter(
      (c) => c.daysLeft != null && !OPEN_STAGES_EXCLUDED.includes(c.currentStage),
    );
    // Signed by both sides but not paid out yet — money on its way. Same rule as web /collabs.
    const upcoming = (contracts || [])
      .filter((c) => c.creator_signed && c.host_signed && !c.paid && !["terminated", "cancelled", "declined"].includes(c.status))
      .reduce((sum, c) => sum + (c.payment_amount ?? c.cash_value ?? 0), 0);
    const noListing = listingFilter === "all";

    return [
      {
        key: "active",
        label: "Active",
        value: String(realActive.length),
        active: statusFilter === "all" && dueFilter === "all" && noListing,
        onPress: () => applyStat("all", "all"),
      },
      {
        key: "pending",
        label: "Pending",
        value: String(pendingCount),
        active: statusFilter === "pending" && dueFilter === "all",
        onPress: () => applyStat("pending", "all"),
      },
      {
        key: "earned",
        label: "Earned",
        value: `$${earned.toLocaleString()}`,
        hint: upcoming > 0 ? `+$${upcoming.toLocaleString()} soon` : null,
        active: statusFilter === "closed",
        onPress: () => applyStat("closed", "all"),
      },
      {
        key: "due",
        label: "Due",
        value: String(due.length),
        active: dueFilter === "any",
        onPress: () => applyStat("all", "any"),
      },
    ];
  }, [realActive, pitches, contracts, statusFilter, dueFilter, listingFilter]);

  const todoItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const open = (c) => () => router.push({ pathname: "/collab-detail", params: { id: c.id } });
    const items = [];
    realActive.forEach((c) => {
      if (c.daysLeft != null && !OPEN_STAGES_EXCLUDED.includes(c.currentStage)) {
        const date = new Date(today);
        date.setDate(today.getDate() + c.daysLeft);
        items.push({
          type: "deadline",
          title: `Upload content — ${c.propertyName}`,
          label: c.daysLeft === 0 ? "Due today" : `Due in ${plural(c.daysLeft, "day")}`,
          date,
          sort: c.daysLeft,
          onPress: open(c),
        });
      }
    });
    (contracts || []).forEach((k) => {
      if (!k.check_in || k.check_in < today.getTime()) return;
      const days = Math.round((k.check_in - today.getTime()) / 86400000);
      if (days > 30) return;
      const collab = realActive.find((c) => c.propertyName === k.property_name);
      items.push({
        type: "stay_date",
        title: `Check in — ${k.property_name || "your stay"}`,
        label: days === 0 ? "Today" : `In ${plural(days, "day")}`,
        date: new Date(k.check_in),
        sort: days,
        onPress: collab ? open(collab) : undefined,
      });
    });
    (pitches || []).forEach((p) => {
      if (p.counter_pending === "creator") {
        // No creator-side counter screen yet, so this opens the collab for that listing.
        const collab = realActive.find((c) => String(c.listingId) === String(p.listing_id));
        items.push({
          type: "pending_action",
          title: `Respond to counter-pitch — ${p.listing_title || "listing"}`,
          label: "Waiting on you",
          sort: -1,
          onPress: collab ? open(collab) : undefined,
        });
      }
    });
    return items.sort((a, b) => a.sort - b.sort);
  }, [realActive, pitches, contracts, router]);

  const matchesFilters = useCallback(
    (c) => {
      const term = search.trim().toLowerCase();
      if (statusFilter !== "all" && c.currentStage !== statusFilter && c.status !== statusFilter) return false;
      if (listingFilter !== "all" && c.propertyName !== listingFilter) return false;
      if (dueFilter === "none" && c.daysLeft) return false;
      if (["any", "week", "month"].includes(dueFilter)) {
        if (c.daysLeft == null || OPEN_STAGES_EXCLUDED.includes(c.currentStage)) return false;
        if (dueFilter === "week" && c.daysLeft > 7) return false;
        if (dueFilter === "month" && c.daysLeft > 30) return false;
      }
      if (term && !c.propertyName?.toLowerCase().includes(term) && !c.hostName?.toLowerCase().includes(term)) return false;
      return true;
    },
    [search, statusFilter, listingFilter, dueFilter],
  );

  const bySoonest = (a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sortBy === "newest") return b.createdAt - a.createdAt;
    if (sortBy === "az") return a.propertyName.localeCompare(b.propertyName);
    if (a.daysLeft == null && b.daysLeft == null) return 0;
    if (a.daysLeft == null) return 1;
    if (b.daysLeft == null) return -1;
    return a.daysLeft - b.daysLeft;
  };

  const activeCollabs = useMemo(
    () => collabs.filter((c) => c.isActive && matchesFilters(c)).sort(bySoonest),
    [collabs, matchesFilters, sortBy],
  );
  const archivedCollabs = useMemo(
    () => collabs.filter((c) => !c.isActive && matchesFilters(c)).sort(bySoonest),
    [collabs, matchesFilters, sortBy],
  );
  // A search reaches into the archive automatically, so nothing needs a mode switch to be found.
  const searching = search.trim().length > 0;
  const showArchived = searching || archivedOpen;

  const handlePull = useCallback(() => {
    if (archivedCollabs.length === 0) toast.show("No archived collaborations");
    else setArchivedOpen(true);
  }, [archivedCollabs.length, toast.show]);
  const bottomPull = useBottomPull(handlePull);
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: false,
      listener: bottomPull.onScroll,
    }),
    [scrollY, bottomPull.onScroll],
  );

  if (!isSignedIn) {
    return (
      <AtmosphericBackground>
        <StatusBar style={statusBarStyle()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 80, marginBottom: 16, opacity: 0.2 }}>✦</Text>
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
            Sign in to see your collaborations
          </Text>
          <Text
            style={{ fontFamily: fonts.body, fontSize: 15, color: colors.slate, textAlign: "center", marginBottom: 24 }}
          >
            Applications and collabs sync to your account once you're signed in.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/signin")}
            style={{ backgroundColor: colors.slate, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    );
  }

  const isLoading = collabsRaw === undefined;
  const barOpacity = scrollY.interpolate({ inputRange: [24, 52], outputRange: [0, 1], extrapolate: "clamp" });
  const titleScale = scrollY.interpolate({ inputRange: [-80, 0], outputRange: [1.12, 1], extrapolate: "clamp" });

  const closeSwipe = (id) => swipeRefs.current[id]?.close();
  const messageHost = (c) => {
    const threadId = threadKeyFor(c.listingId, profile?._id ? String(profile._id) : null);
    if (threadId) router.push({ pathname: "/messages/[threadId]", params: { threadId } });
  };
  const editNote = (c) =>
    Alert.prompt("Private note", "Only you can see this.", (text) => crm(c, { note: text ?? "" }), "plain-text", c.note);
  const toggleArchive = (c) => crm(c, { archived: !c.creatorArchived });
  const openMenu = (c) => {
    if (c.isDemo || c.isSample) return;
    const actions = [
      [c.pinned ? "Unpin" : "Pin to top", () => crm(c, { pinned: !c.pinned })],
      [c.note ? "Edit note" : "Add note", () => editNote(c)],
      ["Message host", () => messageHost(c)],
      ...(c.ended ? [] : [[c.creatorArchived ? "Move back to active" : "Archive", () => toggleArchive(c)]]),
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...actions.map((a) => a[0]), "Cancel"], cancelButtonIndex: actions.length },
      (i) => actions[i]?.[1](),
    );
  };

  const SwipeAction = ({ icon: Icon, label, onPress, tint }) => (
    <Pressable
      onPress={onPress}
      style={{ width: 76, alignItems: "center", justifyContent: "center", gap: 4 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint,
        }}
      >
        <Icon size={18} color="#fff" />
      </View>
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.slate }}>{label}</Text>
    </Pressable>
  );

  const renderCard = (collab, index) => {
    const isTerminated = collab.status === "terminated";
    const meta = STAGE_META[collab.currentStage] || STAGE_META.pending;
    const StageIcon = meta.icon;
    const action = nextAction(collab);
    const step = pipelineIndex(collab.currentStage);
    return (
      <Reveal key={collab.id} index={index}>
        <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
        <Swipeable
          ref={(ref) => { swipeRefs.current[collab.id] = ref; }}
          enabled={!collab.isDemo && !collab.isSample}
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={() => (
            <SwipeAction
              icon={collab.pinned ? PinOff : Pin}
              label={collab.pinned ? "Unpin" : "Pin"}
              tint={colors.slate}
              onPress={() => { closeSwipe(collab.id); crm(collab, { pinned: !collab.pinned }); }}
            />
          )}
          renderRightActions={() => (
            <View style={{ flexDirection: "row" }}>
              <SwipeAction
                icon={MessageCircle}
                label="Message"
                tint={colors.slate}
                onPress={() => { closeSwipe(collab.id); messageHost(collab); }}
              />
              {!collab.ended ? (
                <SwipeAction
                  icon={collab.creatorArchived ? ArchiveRestore : ArchiveIcon}
                  label={collab.creatorArchived ? "Restore" : "Archive"}
                  tint="#8a6d1f"
                  onPress={() => { closeSwipe(collab.id); toggleArchive(collab); }}
                />
              ) : null}
            </View>
          )}
        >
        <TouchableOpacity
          style={{ opacity: collab.isActive ? 1 : 0.7 }}
          onPress={() => router.push({ pathname: "/collab-detail", params: { id: collab.id } })}
          onLongPress={() => openMenu(collab)}
          activeOpacity={0.85}
        >
          <Glass variant="card" contentStyle={{ padding: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Image
                source={{ uri: collab.image }}
                style={{ width: 72, height: 72, borderRadius: radii.sm }}
                contentFit="cover"
                transition={200}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: fonts.displaySemibold,
                      fontSize: 16,
                      color: colors.ink,
                      letterSpacing: track(16, tracking.display),
                    }}
                    numberOfLines={1}
                  >
                    {collab.propertyName}
                  </Text>
                  {collab.pinned ? <Pin size={13} color={colors.slate} fill={colors.slate} style={{ marginRight: 4 }} /> : null}
                  <ChevronRight color={colors.sage} size={18} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                  <MapPin color={colors.sage} size={11} />
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginLeft: 4 }}
                  >
                    {[collab.location, collab.hostName].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radii.pill,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isTerminated ? colors.dangerTint : colors.mint,
                    }}
                  >
                    <StageIcon color={isTerminated ? colors.danger : colors.ink} size={11} />
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 11,
                        marginLeft: 4,
                        color: isTerminated ? colors.danger : colors.ink,
                      }}
                    >
                      {isTerminated ? "Terminated" : meta.label}
                    </Text>
                  </View>
                  {!collab.isActive ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.hairline }}>
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.slate }}>Archived</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {collab.isActive && !isTerminated ? (
              <View style={{ flexDirection: "row", gap: 4, marginTop: 12 }}>
                {PIPELINE.map((s, i) => (
                  <View
                    key={s}
                    style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? colors.ink : colors.stone }}
                  />
                ))}
              </View>
            ) : null}

            {collab.note ? (
              <Pressable onPress={() => editNote(collab)} style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                <StickyNote size={12} color={colors.sage} style={{ marginTop: 2 }} />
                <Text numberOfLines={2} style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.slate }}>
                  {collab.note}
                </Text>
              </Pressable>
            ) : null}

            {action.text && collab.isActive ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: action.urgent ? "#B4403A" : colors.sage,
                  }}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontFamily: action.urgent ? fonts.bodySemibold : fonts.body,
                    fontSize: 13,
                    color: action.urgent ? colors.ink : colors.slate,
                  }}
                >
                  {action.text}
                </Text>
                {collab.deliverables ? (
                  <Text numberOfLines={1} style={{ maxWidth: "45%", fontFamily: fonts.body, fontSize: 11, color: colors.sage }}>
                    {collab.deliverables}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Glass>
        </TouchableOpacity>
        </Swipeable>
        </View>
      </Reveal>
    );
  };

  return (
    <AtmosphericBackground>
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar style={statusBarStyle()} />

        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          {...bottomPull}
          onScroll={onScroll}
        >
          <Animated.Text
            style={{
              fontFamily: fonts.display,
              fontSize: 34,
              color: colors.ink,
              paddingHorizontal: 20,
              marginBottom: 16,
              letterSpacing: track(34, tracking.display),
              lineHeight: 34 * lineHeights.display,
              transform: [{ scale: titleScale }],
              transformOrigin: "left",
            }}
          >
            Collaborations
          </Animated.Text>

          {isLoading ? (
            <View accessibilityLabel="Loading collaborations">
              <CollabCardSkeleton />
              <CollabCardSkeleton />
            </View>
          ) : (
            <>
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <CollabCrmOverview
                  stats={stats}
                  chart={chart}
                  todoItems={todoItems}
                  search={search}
                  onSearchChange={setSearch}
                  filters={[
                    {
                      key: "status",
                      title: "Stage",
                      value: statusFilter,
                      onChange: setStatusFilter,
                      options: [
                        { value: "all", label: "All stages" },
                        { value: "pending", label: "Application sent" },
                        { value: "accepted", label: "Accepted" },
                        { value: "uploaded_tagged", label: "Uploaded" },
                        { value: "closed", label: "Completed" },
                      ],
                    },
                    {
                      key: "listing",
                      title: "Listing",
                      value: listingFilter,
                      onChange: setListingFilter,
                      options: listingOptions.map((name) => ({
                        value: name,
                        label: name === "all" ? "All listings" : name,
                      })),
                    },
                    {
                      key: "due",
                      title: "Due date",
                      value: dueFilter,
                      onChange: setDueFilter,
                      options: [
                        { value: "all", label: "Any" },
                        { value: "any", label: "Has a deadline" },
                        { value: "week", label: "This week" },
                        { value: "month", label: "This month" },
                        { value: "none", label: "No deadline" },
                      ],
                    },
                    {
                      key: "sort",
                      title: "Sort",
                      value: sortBy,
                      onChange: setSortBy,
                      options: [
                        { value: "all", label: "Soonest due" },
                        { value: "newest", label: "Newest" },
                        { value: "az", label: "A–Z" },
                      ],
                    },
                  ]}
                />
              </View>

              {activeCollabs.map(renderCard)}

              {archivedCollabs.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Pressable
                    onPress={() => setArchivedOpen((o) => !o)}
                    disabled={searching}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12, gap: 8 }}
                  >
                    <ArchiveIcon size={14} color={colors.sage} />
                    <Text style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.sage }}>
                      Archived ({archivedCollabs.length})
                    </Text>
                    {!searching ? (
                      <ChevronDown
                        size={16}
                        color={colors.sage}
                        style={{ transform: [{ rotate: showArchived ? "180deg" : "0deg" }] }}
                      />
                    ) : null}
                  </Pressable>
                  {showArchived ? archivedCollabs.map(renderCard) : null}
                </View>
              ) : null}
            </>
          )}
        </Animated.ScrollView>

        {/* Compact glass bar that takes over from the large title once it scrolls away. */}
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 60, opacity: barOpacity }}
        >
          <Glass
            variant="regular"
            style={{ borderRadius: 0, borderWidth: 0 }}
            contentStyle={{ paddingTop: insets.top + 8, paddingBottom: 12, alignItems: "center" }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink }}>Collaborations</Text>
          </Glass>
        </Animated.View>
      </View>
      <StatusBarBlur scrollY={scrollY} fadeStart={0} fadeLength={24} />
      <PullToast text={toast.text} />
    </AtmosphericBackground>
  );
}
