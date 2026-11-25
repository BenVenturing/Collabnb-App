// ============================================================
// COLLABNB — Host Dashboard
// Architecture: Listings-first + Activity Feed + Lifetime Stats
// File: /host/(tabs)/dashboard.jsx
// ============================================================

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  Alert,
  LayoutAnimation,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useHostDashboard from "@/hooks/useHostDashboard";
import { useRouter, useFocusEffect } from "expo-router";
import { Compass, Plus, Sparkles, House, CheckCircle2, MapPin, X } from "lucide-react-native";
import { useConversations } from "@/hooks/useConversations";
import ListingDraftStore from "@/utils/ListingDraftStore";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import StatusBarBlur from "@/components/StatusBarBlur";
import { Body } from "@/components/ui";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40; // 20px horizontal padding each side
const LISTING_CARD_HEIGHT = 420;
const DRAFT_KEY = "@collabnb_host_listing_draft_v1"; // ListingDraftStore's in-progress draft
const LOCAL_DRAFT_ID = "local_draft";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ─── SAMPLE DATA ─────────────────────────────────────────────
const ACTIVITY_KINDS = {
  applied: { Icon: Sparkles, iconBg: "rgba(60,87,89,0.10)", cta: "Review" },
  collab: { Icon: House, iconBg: "rgba(74,155,127,0.10)", cta: "Details" },
  completed: { Icon: CheckCircle2, iconBg: "rgba(212,168,67,0.10)", cta: "Details" },
};

function timeAgo(ms) {
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function compact(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// Multi-value status/tier/chart-legend colors need to stay visually distinct
// per value (green/amber/grey; grey/teal/purple/red). Only #3C5759 and #959D90
// have brand equivalents (slate, sage); #4A9B7F, #D4A843, #7B68C8 and #C86868
// have no token in the 9-color palette — left as literals per
// "don't add a new color, ask" in STYLE-GUIDE.md. Flagged for design review.
const IMPACT_STATS = [
  { key: "collabs", label: "Total Collabs", short: "Collabs", dot: "#4A9B7F", type: "line" }, // no brand token — semantic chart-series green
  { key: "creators", label: "Creators Worked With", short: "Creators", dot: colors.slate, type: "bar" },
  { key: "content", label: "Content Pieces", short: "Content", dot: "#7B68C8", type: "line" }, // no brand token — semantic chart-series purple
  { key: "reach", label: "Est. Reach", short: "Reach", dot: "#D4A843", type: "line" }, // no brand token — semantic chart-series gold
];

const STATUS_CONFIG = {
  active: { label: "Active", color: "#4A9B7F", bg: "rgba(74,155,127,0.12)" }, // no brand token — semantic status green
  paused: { label: "Paused", color: "#D4A843", bg: "rgba(212,168,67,0.12)" }, // no brand token — semantic status amber
  draft: { label: "Draft", color: colors.sage, bg: "rgba(100,107,98,0.12)" },
};

const TIER_CONFIG = {
  "UGC Beginner": { color: colors.sage, bg: "rgba(100,107,98,0.12)" },
  "UGC Pro": { color: colors.slate, bg: "rgba(60,87,89,0.12)" },
  "Micro Influencer": { color: "#7B68C8", bg: "rgba(123,104,200,0.12)" }, // no brand token — semantic tier purple
  Influencer: { color: "#C86868", bg: "rgba(200,104,104,0.12)" }, // no brand token — semantic tier red
};

const TIER_LABELS = {
  ugc_beginner: "UGC Beginner",
  ugc_pro: "UGC Pro",
  micro: "Micro Influencer",
  mid: "Influencer",
};

// Real listings (from the creation flow / ListingDraftStore) use
// published/unpublished; sample cards use active/paused/draft. Both are
// read from the same local store, so map to one vocabulary for display.
function displayStatus(status) {
  if (status === "published") return "active";
  if (status === "unpublished" || status === "rejected") return "paused";
  return status || "draft";
}

// Real listings are stored in the creation flow's draft shape
// (location_city, creator_tier_required, images, ...) — map to the
// dashboard card's display shape without touching the stored fields, so
// editing a listing still finds its raw fields intact.
function normalizeForDisplay(l) {
  if (l.location !== undefined && l.tierRequired !== undefined) return l;
  const location = [l.location_city, l.location_country]
    .filter(Boolean)
    .join(", ");
  const compType =
    l.compensation_type === "paid"
      ? `$${l.cash_payout || 0} cash`
      : l.compensation_type === "hybrid"
        ? `${l.stay_nights || 0}N + $${l.cash_payout || 0}`
        : `${l.stay_nights || 0} night${l.stay_nights === 1 ? "" : "s"} free stay`;
  return {
    ...l,
    location,
    tierRequired: TIER_LABELS[l.creator_tier_required] || "UGC Beginner",
    compType,
    photos: (l.images || []).map((uri) => ({ type: "image", uri })),
    applicants: l.applicants ?? 0,
    confirmed: l.confirmed ?? 0,
    completed: l.completed ?? 0,
  };
}

// ─── LISTING CARD ────────────────────────────────────────────
function ListingCard({
  listing,
  onToggleStatus,
  onDelete,
  onEdit,
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const statusKey = displayStatus(listing.status);
  const isLocalDraft = listing.id === LOCAL_DRAFT_ID;
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.active;
  const tier = TIER_CONFIG[listing.tierRequired] || TIER_CONFIG["UGC Beginner"];

  const photos =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : [{ type: "gradient", colors: [colors.mint, colors.slate] }];

  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 50 });
  const onViewableItemsChanged = React.useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index || 0);
  });

  const openListing = () =>
    isLocalDraft
      ? onEdit(listing)
      : router.push({ pathname: "/listing-detail", params: { id: listing.id, isHost: "true" } });

  const confirmDelete = () => {
    setMenuOpen(false);
    Alert.alert(
      isLocalDraft ? "Discard draft?" : "Delete listing?",
      `"${listing.title}" will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isLocalDraft ? "Discard" : "Delete",
          style: "destructive",
          onPress: () => onDelete(listing),
        },
      ],
    );
  };

  return (
    <View style={styles.listingCardWrap}>
      {/* Plain View, not a touchable: a wrapping TouchableOpacity steals the
          horizontal pan, so the photo swiper couldn't page. Each photo opens it. */}
      <View style={styles.listingCardShadow}>
      <Glass variant="card" style={styles.listingCardGlass} contentStyle={styles.listingCardContent}>
      {/* Photo Swiper */}
      <View style={styles.photoContainer}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          keyExtractor={(_, i) => `photo-${i}`}
          renderItem={({ item }) => (
            <Pressable style={{ width: CARD_WIDTH, height: LISTING_CARD_HEIGHT }} onPress={openListing}>
              {item.type === "image" ? (
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <LinearGradient colors={item.colors} style={{ flex: 1 }} />
              )}
            </Pressable>
          )}
        />
        {/* Dot indicators */}
        <View style={styles.dotIndicators}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dotSmall,
                i === currentIndex && styles.dotSmallActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* pointerEvents none so swipes reach the photo list underneath */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(25,37,36,0)", "rgba(25,37,36,0.62)", "rgba(25,37,36,0.9)"]}
        locations={[0, 0.3, 1]}
        style={styles.listingOverlay}
      >
      {/* Status + Location */}
      <View style={styles.listingCardTop}>
        <View style={styles.statusPill}>
          <View style={[styles.dot6, { backgroundColor: status.color }]} />
          <Text style={[styles.statusLabel, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MapPin size={12} color={colors.bone} strokeWidth={2} />
          <Text style={styles.listingLocation}>{listing.location}</Text>
        </View>
      </View>

      <Text style={styles.listingTitle} numberOfLines={2}>
        {listing.title}
      </Text>

      <View style={styles.listingMeta}>
        <View style={styles.tierBadge}>
          <Text style={[styles.tierText, { color: tier.color }]}>
            {listing.tierRequired}
          </Text>
        </View>
        <Text style={styles.compType}>{listing.compType}</Text>
      </View>

      {/* Mini stats row */}
      <View style={styles.listingStats}>
        {[
          { num: listing.applicants, label: "Applied" },
          { num: listing.confirmed, label: "Confirmed" },
          { num: listing.completed, label: "Done" },
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            <View style={styles.listingStat}>
              <Text style={styles.listingStatNum}>{s.num}</Text>
              <Text style={styles.listingStatLabel}>{s.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.listingStatDivider} />}
          </React.Fragment>
        ))}
      </View>
      </LinearGradient>
      </Glass>
      </View>

      {/* 3-dot menu — outside the card's overflow:hidden so the dropdown isn't clipped */}
      <View style={styles.cardMenuWrap}>
        <TouchableOpacity
          style={styles.cardMenuBtn}
          onPress={() => setMenuOpen((v) => !v)}
        >
          <Text style={styles.cardMenuDots}>⋮</Text>
        </TouchableOpacity>
        {menuOpen && (
          <View style={styles.cardMenuDropdown}>
            <>
                <TouchableOpacity
                  style={styles.cardMenuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    onEdit(listing);
                  }}
                >
                  <Text style={styles.cardMenuItemText}>
                    {isLocalDraft ? "Continue editing" : "Edit"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardMenuItem}
                  disabled={statusKey === "draft"}
                  onPress={() => {
                    setMenuOpen(false);
                    onToggleStatus(listing.id);
                  }}
                >
                  <Text
                    style={[
                      styles.cardMenuItemText,
                      statusKey === "draft" && styles.cardMenuItemMuted,
                    ]}
                  >
                    {statusKey === "paused" ? "Unpause" : "Pause"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardMenuItem} onPress={confirmDelete}>
                  <Text style={[styles.cardMenuItemText, styles.cardMenuItemDanger]}>
                    {isLocalDraft ? "Discard" : "Delete"}
                  </Text>
                </TouchableOpacity>
            </>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── ACTIVITY ITEM ───────────────────────────────────────────
function ActivityItem({ item, isLast, router }) {
  const handleCtaPress = () => {
    if (item.cta === "Review" || item.cta === "Details")
      router.push("/host/(tabs)/proposals");
    else if (item.cta === "Reply") router.push("/host/(tabs)/inbox");
  };

  return (
    <>
      <View style={styles.activityItem}>
        <View style={[styles.activityIcon, { backgroundColor: item.iconBg }]}>
          {item.Icon ? <item.Icon size={18} color={colors.ink} strokeWidth={1.6} /> : null}
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityText} numberOfLines={2}>
            {item.text}
          </Text>
          <Text style={styles.activitySub}>{item.sub}</Text>
        </View>
        <TouchableOpacity style={styles.activityCta} onPress={handleCtaPress}>
          <Text style={styles.activityCtaText}>{item.cta}</Text>
        </TouchableOpacity>
      </View>
      {!isLast && <View style={styles.activityDivider} />}
    </>
  );
}

// ─── IMPACT CHARTS ───────────────────────────────────────────


function ImpactChartModal({ stat, visible, onClose }) {
  if (!stat) return null;
  const W = 320;
  const H = 160;
  const pad = 24;
  const iW = W - pad * 2;
  const iH = H - pad * 2 - 20;
  const max = Math.max(...stat.data, 1);
  const min = stat.type === "line" ? Math.min(...stat.data) : 0;
  const range = max - min || 1;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={chartModalStyles.overlay}>
        <View style={chartModalStyles.card}>
          <View style={chartModalStyles.header}>
            <View style={{ flex: 1 }}>
              <View style={[chartModalStyles.dot, { backgroundColor: stat.dot }]} />
              <Text style={chartModalStyles.total}>{stat.num}</Text>
              <Text style={chartModalStyles.subtitle}>{stat.label} · all time</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={chartModalStyles.closeBtn}>
              <X size={16} color={colors.slate} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <Svg width={W} height={H}>
            {stat.type === "line" ? (
              <Path
                d={stat.data
                  .map((v, i) => {
                    const x = pad + (i / (stat.data.length - 1)) * iW;
                    const y = pad + iH - ((v - min) / range) * iH;
                    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={stat.dot}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              stat.data.map((v, i) => {
                const slotW = iW / stat.data.length;
                const bw = slotW * 0.6;
                const bh = (v / max) * iH;
                const x = pad + i * slotW + (slotW - bw) / 2;
                const y = pad + iH - bh;
                return (
                  <Rect key={i} x={x} y={y} width={bw} height={bh} rx={4} fill={stat.dot} fillOpacity={0.85} />
                );
              })
            )}
          </Svg>
          <View style={chartModalStyles.monthsRow}>
            {stat.months.map((m) => (
              <Text key={m} style={chartModalStyles.monthText}>
                {m}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const chartModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(25,37,36,0.45)", // ink @ 45%, no dedicated alpha token
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
  },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  total: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: track(30, tracking.display),
  },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(25,37,36,0.07)", // ink @ 7%, no dedicated alpha token
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 13, color: colors.ink },
  monthsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24, marginTop: 4 },
  monthText: { fontFamily: fonts.body, fontSize: 10, color: colors.sage },
});

// ─── GREETING ────────────────────────────────────────────────
// Types itself out once per app launch, holds, then folds away so the
// dashboard opens straight onto the stats.
let greetingShown = false;

function TypewriterGreeting() {
  const full = `${greeting()},\nYour Stays`;
  const [chars, setChars] = useState(greetingShown ? full.length : 0);
  const [visible, setVisible] = useState(!greetingShown);
  const opacity = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    if (chars < full.length) {
      const t = setTimeout(() => setChars((c) => c + 1), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        greetingShown = true;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setVisible(false);
      });
    }, 1600);
    return () => clearTimeout(t);
  }, [chars, visible]);

  if (!visible) return null;
  const [line1, line2 = ""] = full.slice(0, chars).split("\n");
  return (
    <Animated.View style={[styles.header, { opacity }]}>
      <Text style={styles.greeting}>{line1}</Text>
      <Text style={styles.headerTitle}>{line2 || " "}</Text>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    listings: convexListings,
    activeCollabs,
    activity,
    impact,
    setListingStatus,
    deleteListing: deleteConvexListing,
  } = useHostDashboard();
  const { unreadCount } = useConversations();
  const [localDraft, setLocalDraft] = useState(null);
  const [listingFilter, setListingFilter] = useState("all");
  const [expandedStat, setExpandedStat] = useState(null);

  // An unfinished listing lives only in the creation flow's local draft until
  // it's submitted — surface it so the host can resume it.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(DRAFT_KEY)
        .then((stored) => {
          const draft = stored ? JSON.parse(stored) : null;
          setLocalDraft(
            draft?.title?.trim() && !draft._editingId
              ? { ...draft, id: LOCAL_DRAFT_ID, status: "draft" }
              : null,
          );
        })
        .catch(() => setLocalDraft(null));
    }, []),
  );

  const listings = localDraft ? [localDraft, ...convexListings] : convexListings;

  const toggleListingStatus = (id) => {
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;
    const next = listing.status === "published" ? "unpublished" : "published";
    setListingStatus(id, next).catch((error) => {
      console.error("Failed to update listing status:", error);
    });
  };

  const deleteListing = (listing) => {
    if (listing.id === LOCAL_DRAFT_ID) {
      ListingDraftStore.clearDraft().then(() => setLocalDraft(null));
      return;
    }
    deleteConvexListing(listing.id).catch((error) => {
      console.error("Failed to delete listing:", error);
      Alert.alert("Error", "Couldn't delete that listing. Please try again.");
    });
  };

  // A draft left behind by an abandoned edit still carries _editingId, and
  // publishing it would overwrite that live listing instead of creating one.
  const startNewListing = async () => {
    await ListingDraftStore.init();
    if (ListingDraftStore.getDraft()?._editingId) {
      await ListingDraftStore.clearDraft();
    }
    router.push("/host/listings/create/index");
  };

  const editListing = (listing) => {
    if (listing.id === LOCAL_DRAFT_ID) {
      router.push("/host/listings/create/basics");
      return;
    }
    router.push({
      pathname: "/host/listings/create/basics",
      params: { id: listing.id, editMode: "true" },
    });
  };

  const countFor = (f) =>
    f === "all"
      ? listings.length
      : listings.filter((l) => displayStatus(l.status) === f).length;

  const filtered =
    listingFilter === "all"
      ? listings
      : listings.filter((l) => displayStatus(l.status) === listingFilter);

  const impactStats = IMPACT_STATS.map((s) => {
    const data = impact[s.key];
    const last = data[data.length - 1] || 0;
    return { ...s, data, num: compact(last), months: impact.monthLabels };
  });

  // Floating Browse pill sits just above GlassTabBar (64pt pill + 6pt pad + inset).
  const browseBottom = 70 + Math.max(insets.bottom, 8) + 12;

  return (
    <AtmosphericBackground>
      <StatusBar style={statusBarStyle()} />
      <View style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 12, paddingBottom: browseBottom + 60 },
          ]}
        >
          <TypewriterGreeting />

          {/* ── Quick Stats Strip ── */}
          <View style={styles.statsStrip}>
            {[
              {
                num: countFor("active"),
                label: "Active Listings",
                onPress: () => setListingFilter("active"),
              },
              {
                num: listings.reduce((a, l) => a + (l.applicants || 0), 0),
                label: "New Applicants",
                onPress: () => router.push("/host/(tabs)/proposals"),
              },
              {
                num: activeCollabs,
                label: "Active Collabs",
                onPress: () => router.push("/host/(tabs)/proposals"),
              },
              {
                num: unreadCount || 0,
                label: "Inbox",
                onPress: () => router.push("/host/(tabs)/inbox"),
              },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <TouchableOpacity style={styles.quickStat} onPress={s.onPress}>
                  <Text style={styles.quickStatNum} numberOfLines={1}>{s.num}</Text>
                  <Text style={styles.quickStatLabel} numberOfLines={2}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={styles.statDividerV} />}
              </React.Fragment>
            ))}
          </View>

          {/* ── Listings ── */}
          <View style={styles.section}>
            <View style={styles.filterBar}>
              <View style={styles.filterRow}>
                {["all", "active", "paused", "draft"].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      listingFilter === f && styles.filterChipActive,
                    ]}
                    onPress={() => setListingFilter(f)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        listingFilter === f && styles.filterChipTextActive,
                      ]}
                    >
                      {f === "all"
                        ? "All"
                        : f.charAt(0).toUpperCase() + f.slice(1)}
                      {` ${countFor(f)}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={startNewListing}
                accessibilityRole="button"
                accessibilityLabel="New listing"
              >
                <Plus color={colors.bone} size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={normalizeForDisplay(l)}
                  onToggleStatus={toggleListingStatus}
                  onDelete={deleteListing}
                  onEdit={editListing}
                />
              ))}
          </View>

          {/* ── Activity Feed ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Activity</Text>
                <Text style={styles.sectionSub}>What needs your attention</Text>
              </View>
            </View>
            <View style={styles.feedCardShadow}>
              <Glass variant="card">
                {activity.length === 0 ? (
                  <Text style={styles.activityEmpty}>
                    You're all caught up. New applications and collabs show up here.
                  </Text>
                ) : (
                  activity.map((item, i) => (
                    <ActivityItem
                      key={item.id}
                      item={{
                        ...ACTIVITY_KINDS[item.kind],
                        ...item,
                        sub: item.detail ? `${item.detail} · ${timeAgo(item.at)}` : timeAgo(item.at),
                      }}
                      isLast={i === activity.length - 1}
                      router={router}
                    />
                  ))
                )}
              </Glass>
            </View>
          </View>

          {/* ── Lifetime Stats ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Impact</Text>
                <Text style={styles.sectionSub}>All time</Text>
              </View>
            </View>
            <View style={styles.statRowShadow}>
              <Glass variant="card" contentStyle={styles.statRow}>
                {impactStats.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <TouchableOpacity
                      style={styles.statRowItem}
                      activeOpacity={0.7}
                      onPress={() => setExpandedStat(s)}
                    >
                      <Text style={styles.statRowNum} numberOfLines={1}>{s.num}</Text>
                      <Text style={styles.statRowLabel} numberOfLines={1}>
                        {s.short}
                      </Text>
                    </TouchableOpacity>
                    {i < impactStats.length - 1 && <View style={styles.statRowDivider} />}
                  </React.Fragment>
                ))}
              </Glass>
            </View>
          </View>
        </ScrollView>
      </View>

      <StatusBarBlur />

      <Pressable
        onPress={() => router.push("/host/browse-marketplace")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Browse marketplace"
        style={({ pressed }) => [
          styles.browseBtn,
          { bottom: browseBottom, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
      >
        <Glass
          variant="small"
          style={{ borderRadius: 999 }}
          contentStyle={styles.browseContent}
        >
          <Compass color={colors.ink} size={17} />
          <Body size={14} weight="semibold">Browse</Body>
        </Glass>
      </Pressable>

      <ImpactChartModal
        stat={expandedStat}
        visible={!!expandedStat}
        onClose={() => setExpandedStat(null)}
      />
    </AtmosphericBackground>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scrollContent: {},

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: { fontFamily: fonts.body, fontSize: 13, color: colors.sage },
  headerTitle: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: track(28, tracking.display),
    marginTop: 2,
  },

  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 4,
  },
  quickStat: {
    flex: 1,
    alignSelf: "stretch",
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  quickStatNum: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
    letterSpacing: track(20, tracking.display),
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  quickStatLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 13,
    color: colors.sage,
    marginTop: 1,
    textAlign: "center",
  },
  statRowShadow: { ...shadows.md, borderRadius: radii.lg },
  statRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  statRowItem: { flex: 1, alignItems: "center" },
  statRowNum: { fontFamily: fonts.bodySemibold, fontSize: 17, lineHeight: 22, color: colors.ink, textAlign: "center", fontVariant: ["tabular-nums"], includeFontPadding: false },
  statRowLabel: { fontFamily: fonts.body, fontSize: 11, lineHeight: 14, color: colors.sage, marginTop: 2, textAlign: "center" },
  statRowDivider: { width: 1, height: 26, backgroundColor: colors.hairline },
  statDividerV: { width: 1, height: 28, backgroundColor: "rgba(60,87,89,0.1)" },

  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: track(20, tracking.display),
  },
  sectionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 2 },

  primaryBtn: {
    backgroundColor: colors.slate,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  primaryBtnText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.bone },

  filterBar: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  filterRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.slate,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.15)",
  },
  filterChipActive: { backgroundColor: colors.slate, borderColor: colors.slate },
  filterChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate },
  filterChipTextActive: { color: colors.bone },
  browseBtn: { position: "absolute", alignSelf: "center", ...shadows.md },
  browseContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  listingCardWrap: { position: "relative", marginBottom: 16 },
  // Shadow lives on this outer node — Glass's own View sets overflow:"hidden",
  // which would otherwise clip an RN shadow drawn on the same layer.
  listingCardShadow: { ...shadows.md, borderRadius: radii.lg },
  listingCardGlass: { borderWidth: 0 },
  listingCardContent: { height: LISTING_CARD_HEIGHT },
  listingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 64,
  },
  cardMenuWrap: { position: "absolute", top: 12, right: 12, zIndex: 10 },
  cardMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardMenuDots: { fontSize: 16, color: colors.ink, lineHeight: 16 },
  cardMenuDropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 140,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardMenuItem: { paddingHorizontal: 16, paddingVertical: 10 },
  cardMenuItemText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  cardMenuItemDanger: { color: "#C86868" }, // no brand token — semantic danger red, flagged
  cardMenuItemMuted: { color: colors.sage },
  photoContainer: StyleSheet.absoluteFillObject,
  dotIndicators: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotSmallActive: { backgroundColor: colors.surface, width: 16 },
  listingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  statusLabel: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  listingLocation: { fontFamily: fonts.body, fontSize: 11, color: colors.bone },
  listingTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.bone,
    marginBottom: 10,
    lineHeight: 21,
  },
  listingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  tierText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  compType: { fontFamily: fonts.body, fontSize: 11, color: colors.bone },
  listingStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 10,
  },
  listingStat: { flex: 1, alignItems: "center" },
  listingStatNum: { fontFamily: fonts.display, fontSize: 15, color: colors.bone },
  listingStatLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.bone, marginTop: 1 },
  listingStatDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)" },


  feedCardShadow: { ...shadows.md, borderRadius: radii.lg },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityContent: { flex: 1 },
  activityText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  activitySub: { fontFamily: fonts.body, fontSize: 11, color: colors.sage, marginTop: 2 },
  activityCta: {
    backgroundColor: "rgba(60,87,89,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  activityCtaText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate },
  activityEmpty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sage,
    textAlign: "center",
    padding: 20,
  },
  activityDivider: {
    height: 1,
    backgroundColor: "rgba(60,87,89,0.06)",
    marginHorizontal: 14,
  },

  dot6: { width: 6, height: 6, borderRadius: 3 },
});
