// Creator V1 screen (namespaced to avoid host collisions)
//
// Backed by the same `collaborations` Convex table as the web app — a
// creator's application *is* the collaboration record (current_stage starts
// at 'pending'), so there's no separate "applications" list to reconcile
// against this one. Stage keys/labels mirror
// Collabnb Website/app/src/lib/mockData.js's STAGES. A per-collab detail
// screen with the stage stepper (CollabDetail.jsx on web) is
// now /collab/[id] — tapping a card opens the stage stepper and next actions.

import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Calendar,
  MapPin,
  User,
  ChevronRight,
  Mail,
  Handshake,
  RefreshCw,
  Upload,
  CheckCircle2,
  Archive as ArchiveIcon,
} from "lucide-react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import CollabCrmOverview, { useCrmChart } from "@/components/collabs/CollabCrmOverview";
import { useCollabReminders } from "@/hooks/useCollabReminders";
import { CollabCardSkeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/ui/Reveal";
import { parseContract, waitingOn } from "@/utils/contract";
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
    isActive: c.is_active !== false,
    isDemo: c.is_demo === true,
    isSample: c.is_sample === true,
    appliedDate: stages?.pending?.date,
    // Inputs for reminder planning (utils/reminders.js).
    contractTurn: c.contract_draft ? waitingOn(parseContract(c.contract_draft)) : null,
    changesRequested: c.deliverable_submissions ? deliverableProgress(loadSubmissions(c.deliverable_submissions, c.deliverables)).changes : 0,
  };
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

  const [activeFilter, setActiveFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");

  const collabs = useMemo(() => (collabsRaw || []).map(normalizeCollab), [collabsRaw]);
  useCollabReminders(collabs);

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

  const stats = useMemo(() => {
    const uniqueListings = new Set(realActive.map((c) => c.propertyName).filter(Boolean));
    const pendingCount = (pitches || []).filter((p) => p.status === "pending").length;
    const paid = (contracts || []).filter((c) => c.paid);
    const earned = paid.reduce((sum, c) => sum + (c.payment_amount ?? c.cash_value ?? 0), 0);
    const due = realActive.filter(
      (c) => c.daysLeft != null && !OPEN_STAGES_EXCLUDED.includes(c.currentStage),
    );
    const soonest = due.length ? Math.min(...due.map((c) => c.daysLeft)) : null;

    return [
      {
        key: "active",
        label: "Active",
        value: String(realActive.length),
        sub: `Across ${uniqueListings.size} listing${uniqueListings.size === 1 ? "" : "s"}`,
        onPress: () => { setActiveFilter("active"); setStatusFilter("all"); },
      },
      {
        key: "pending",
        label: "Pending",
        value: String(pendingCount),
        sub: "Awaiting host reply",
        onPress: () => { setActiveFilter("active"); setStatusFilter("pending"); },
      },
      {
        key: "earned",
        label: "Earned",
        value: `$${earned.toLocaleString()}`,
        sub: `${paid.length} contract${paid.length === 1 ? "" : "s"} paid`,
        onPress: () => { setActiveFilter("active"); setStatusFilter("closed"); },
      },
      {
        key: "due",
        label: "Content due",
        value: String(due.length),
        sub: soonest !== null ? `Next due in ${soonest} day${soonest === 1 ? "" : "s"}` : "Nothing due",
        onPress: () => { setActiveFilter("active"); setStatusFilter("pending"); },
      },
    ];
  }, [realActive, pitches, contracts]);

  const todoItems = useMemo(() => {
    const items = [];
    realActive.forEach((c) => {
      if (c.daysLeft != null && !OPEN_STAGES_EXCLUDED.includes(c.currentStage)) {
        items.push({
          type: "deadline",
          title: `Upload content — ${c.propertyName}`,
          date: c.daysLeft === 0 ? "Due today" : `Due in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`,
        });
      }
    });
    (pitches || []).forEach((p) => {
      if (p.counter_pending === "creator") {
        items.push({
          type: "pending_action",
          title: `Respond to counter-pitch — ${p.listing_title || "listing"}`,
        });
      }
    });
    return items;
  }, [realActive, pitches]);

  const filteredCollabs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return collabs
      .filter((c) => (activeFilter === "active" ? c.isActive : !c.isActive))
      .filter((c) =>
        activeFilter !== "active" || statusFilter === "all"
          ? true
          : c.currentStage === statusFilter || c.status === statusFilter,
      )
      .filter((c) => listingFilter === "all" || c.propertyName === listingFilter)
      .filter((c) => {
        if (dueFilter === "all") return true;
        if (dueFilter === "none") return !c.daysLeft;
        if (!c.daysLeft) return false;
        if (dueFilter === "week") return c.daysLeft <= 7;
        if (dueFilter === "month") return c.daysLeft <= 30;
        return true;
      })
      .filter((c) => !term || c.propertyName?.toLowerCase().includes(term))
      // Soonest deadline first; anything without one sinks to the bottom.
      .sort((a, b) => {
        if (a.daysLeft == null && b.daysLeft == null) return 0;
        if (a.daysLeft == null) return 1;
        if (b.daysLeft == null) return -1;
        return a.daysLeft - b.daysLeft;
      });
  }, [collabs, activeFilter, statusFilter, listingFilter, dueFilter, search]);

  if (!isSignedIn) {
    return (
      <AtmosphericBackground>
        <StatusBar style="dark" />
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

  return (
    <AtmosphericBackground>
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar style="dark" />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: colors.surfaceTint,
            borderBottomWidth: 1,
            borderBottomColor: colors.stone,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              color: colors.ink,
              marginBottom: 16,
              letterSpacing: track(28, tracking.display),
              lineHeight: 28 * lineHeights.display,
            }}
          >
            Collaborations
          </Text>

          <View style={{ backgroundColor: colors.bone, borderRadius: radii.md, padding: 4, flexDirection: "row" }}>
            {["active", "archived"].map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveFilter(key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radii.sm,
                  backgroundColor: activeFilter === key ? colors.surface : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 14,
                    color: activeFilter === key ? colors.ink : colors.slate,
                    textTransform: "capitalize",
                  }}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, paddingTop: 16 }} accessibilityLabel="Loading collaborations">
            <CollabCardSkeleton />
            <CollabCardSkeleton />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          >
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
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: [
                      { value: "all", label: "All statuses" },
                      { value: "pending", label: "Application sent" },
                      { value: "accepted", label: "Accepted" },
                      { value: "uploaded_tagged", label: "Uploaded" },
                      { value: "closed", label: "Completed" },
                    ],
                  },
                  {
                    key: "listing",
                    value: listingFilter,
                    onChange: setListingFilter,
                    options: listingOptions.map((name) => ({
                      value: name,
                      label: name === "all" ? "All listings" : name,
                    })),
                  },
                  {
                    key: "due",
                    value: dueFilter,
                    onChange: setDueFilter,
                    options: [
                      { value: "all", label: "Any due date" },
                      { value: "week", label: "Due this week" },
                      { value: "month", label: "Due this month" },
                      { value: "none", label: "No deadline" },
                    ],
                  },
                ]}
              />
            </View>

            {filteredCollabs.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>✦</Text>
                <Text
                  style={{
                    fontFamily: fonts.displaySemibold,
                    fontSize: 18,
                    color: colors.ink,
                    marginBottom: 6,
                    letterSpacing: track(18, tracking.display),
                    lineHeight: 18 * lineHeights.display,
                  }}
                >
                  {activeFilter === "active" ? "No collabs yet" : "No archived collaborations"}
                </Text>
                {activeFilter === "active" && (
                  <>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.sage,
                        marginBottom: 20,
                        textAlign: "center",
                      }}
                    >
                      Apply to a stay to get started
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.slate,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        borderRadius: radii.pill,
                      }}
                      onPress={() => router.push("/explore")}
                    >
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.surface }}>
                        Discover Stays
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              filteredCollabs.map((collab, index) => {
                const isTerminated = collab.status === "terminated";
                const meta = STAGE_META[collab.currentStage] || STAGE_META.pending;
                const StageIcon = meta.icon;
                return (
                  <Reveal key={collab.id} index={index}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.surface,
                      marginHorizontal: 20,
                      marginBottom: 16,
                      borderRadius: radii.lg,
                      overflow: "hidden",
                      ...shadows.md,
                    }}
                    onPress={() => router.push({ pathname: "/collab-detail", params: { id: collab.id } })}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: "row" }}>
                      <Image
                        source={{ uri: collab.image }}
                        style={{ width: 120, height: 120 }}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={{ flex: 1, padding: 12 }}>
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
                          {collab.propertyName}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                          <MapPin color={colors.slate} size={12} />
                          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, marginLeft: 4 }}>
                            {collab.location}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          <User color={colors.slate} size={12} />
                          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, marginLeft: 4 }}>
                            Host: {collab.hostName}
                          </Text>
                        </View>
                        {collab.appliedDate && (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Calendar color={colors.slate} size={12} />
                            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate, marginLeft: 4 }}>
                              Applied {collab.appliedDate}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.bone }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: radii.md,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: isTerminated ? colors.dangerTint : colors.mint,
                          }}
                        >
                          <StageIcon color={isTerminated ? colors.danger : colors.ink} size={13} />
                          <Text
                            style={{
                              fontFamily: fonts.bodySemibold,
                              fontSize: 12,
                              marginLeft: 6,
                              color: isTerminated ? colors.danger : colors.ink,
                            }}
                          >
                            {isTerminated ? "Terminated" : meta.label}
                          </Text>
                        </View>
                        <ChevronRight color={colors.sage} size={20} />
                      </View>

                      <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between" }}>
                        {collab.deliverables ? (
                          <View>
                            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sage, marginBottom: 2 }}>
                              Deliverables
                            </Text>
                            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>
                              {collab.deliverables}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}
                        {collab.isActive && collab.daysLeft ? (
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sage, marginBottom: 2 }}>
                              Due in
                            </Text>
                            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.slate }}>
                              {collab.daysLeft} days
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                  </Reveal>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </AtmosphericBackground>
  );
}
