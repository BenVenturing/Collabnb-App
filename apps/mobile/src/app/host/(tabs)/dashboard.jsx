// ============================================================
// COLLABNB — Host Dashboard
// Architecture: Listings-first + Activity Feed + Lifetime Stats
// File: /host/(tabs)/dashboard.jsx
// ============================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import PricingTool from "@/components/PricingTool";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_INNER_WIDTH = SCREEN_WIDTH - 40; // 20px horizontal padding each side
const LISTINGS_KEY = "@collabnb_host_listings_local_v1";

// ─── SAMPLE DATA ─────────────────────────────────────────────
const SAMPLE_LISTINGS = [
  {
    id: "l1",
    title: "Treehouse Suite — Summer Escape",
    location: "Asheville, NC",
    tierRequired: "Micro Influencer",
    compType: "Complimentary Stay",
    status: "active",
    applicants: 4,
    confirmed: 1,
    completed: 0,
    deliverablesLoad: "Moderate",
    photos: [
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
      },
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80",
      },
      { type: "gradient", colors: [colors.mint, colors.slate] },
    ],
  },
  {
    id: "l2",
    title: "Cliffside Villa — Weekend Collab",
    location: "Big Sur, CA",
    tierRequired: "UGC Pro",
    compType: "Stay + Content Fee",
    status: "active",
    applicants: 2,
    confirmed: 1,
    completed: 0,
    deliverablesLoad: "Light",
    photos: [
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
      },
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
      },
      { type: "gradient", colors: ["#BCC8D4", colors.slate] }, // #BCC8D4: decorative placeholder-photo accent, no brand equivalent
    ],
  },
  {
    id: "l3",
    title: "Desert Dome — Content Weekend",
    location: "Joshua Tree, CA",
    tierRequired: "UGC Beginner",
    compType: "Complimentary Stay",
    status: "paused",
    applicants: 6,
    confirmed: 2,
    completed: 2,
    deliverablesLoad: "Heavy",
    photos: [
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80",
      },
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
      },
      { type: "gradient", colors: ["#CCC0A8", colors.slate] }, // #CCC0A8: decorative placeholder-photo accent, no brand equivalent
    ],
  },
  {
    id: "l4",
    title: "Lake House — Fall Series",
    location: "Lake Tahoe, CA",
    tierRequired: "Influencer",
    compType: "Complimentary Stay",
    status: "draft",
    applicants: 0,
    confirmed: 0,
    completed: 0,
    deliverablesLoad: "Moderate",
    photos: [
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
      },
      {
        type: "image",
        uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      },
      { type: "gradient", colors: ["#BCC8B0", colors.slate] }, // #BCC8B0: decorative placeholder-photo accent, no brand equivalent
    ],
  },
];

const SAMPLE_ACTIVITY = [
  {
    id: "a1",
    icon: "✦",
    iconBg: "rgba(60,87,89,0.10)",
    text: "Priya Nair applied to Treehouse Suite",
    sub: "2h ago",
    cta: "Review",
  },
  {
    id: "a2",
    icon: "💬",
    iconBg: "rgba(123,104,200,0.10)",
    text: "Jordan Ellis sent you a message",
    sub: "5h ago",
    cta: "Reply",
  },
  {
    id: "a3",
    icon: "🏡",
    iconBg: "rgba(74,155,127,0.10)",
    text: "Maya Chen's stay starts in 3 days",
    sub: "June 14 · Treehouse Suite",
    cta: "Details",
  },
  {
    id: "a4",
    icon: "✦",
    iconBg: "rgba(60,87,89,0.10)",
    text: "Lena Park applied to Desert Dome",
    sub: "1d ago",
    cta: "Review",
  },
  {
    id: "a5",
    icon: "✓",
    iconBg: "rgba(212,168,67,0.10)",
    text: "Sam Kowalski completed their collab",
    sub: "Desert Dome · 2d ago",
    cta: "Rate",
  },
];

const IMPACT_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

// Multi-value status/tier/chart-legend colors need to stay visually distinct
// per value (green/amber/grey; grey/teal/purple/red). Only #3C5759 and #959D90
// have brand equivalents (slate, sage); #4A9B7F, #D4A843, #7B68C8 and #C86868
// have no token in the 9-color palette — left as literals per
// "don't add a new color, ask" in STYLE-GUIDE.md. Flagged for design review.
const LIFETIME_STATS = [
  {
    key: "collabs",
    num: "14",
    label: "Total Collabs",
    dot: "#4A9B7F", // no brand token — semantic chart-series green
    type: "line",
    data: [1, 3, 5, 7, 10, 14],
  },
  {
    key: "creators",
    num: "31",
    label: "Creators Worked With",
    dot: colors.slate,
    type: "bar",
    data: [3, 8, 14, 20, 26, 31],
  },
  {
    key: "content",
    num: "148",
    label: "Content Pieces",
    dot: "#7B68C8", // no brand token — semantic chart-series purple
    type: "line",
    data: [10, 35, 60, 90, 120, 148],
  },
  {
    key: "reach",
    num: "2.4M",
    label: "Est. Reach",
    dot: "#D4A843", // no brand token — semantic chart-series gold
    type: "line",
    data: [0.3, 0.8, 1.2, 1.6, 2.0, 2.4],
  },
];

const STATUS_CONFIG = {
  active: { label: "Active", color: "#4A9B7F", bg: "rgba(74,155,127,0.12)" }, // no brand token — semantic status green
  paused: { label: "Paused", color: "#D4A843", bg: "rgba(212,168,67,0.12)" }, // no brand token — semantic status amber
  draft: { label: "Draft", color: colors.sage, bg: "rgba(100,107,98,0.12)" },
};

const SAMPLE_IDS = new Set(SAMPLE_LISTINGS.map((s) => s.id));

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
  if (status === "unpublished") return "paused";
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
  isSample,
  onToggleStatus,
  onDuplicate,
  onDelete,
  onEdit,
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const statusKey = displayStatus(listing.status);
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

  const confirmDelete = () => {
    setMenuOpen(false);
    Alert.alert(
      isSample ? "Remove sample listing?" : "Delete listing?",
      isSample
        ? `"${listing.title}" will be removed from your dashboard.`
        : `"${listing.title}" will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isSample ? "Remove" : "Delete",
          style: "destructive",
          onPress: () => onDelete(listing),
        },
      ],
    );
  };

  return (
    <View style={styles.listingCardWrap}>
      <TouchableOpacity
        style={styles.listingCardShadow}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: "/listing-detail",
            params: { id: listing.id, isHost: "true" },
          })
        }
      >
      <Glass variant="card" contentStyle={styles.listingCardContent}>
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
            <View style={{ width: CARD_INNER_WIDTH - 32, height: 180 }}>
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
            </View>
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

      {/* Status + Location */}
      <View style={styles.listingCardTop}>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <View style={[styles.dot6, { backgroundColor: status.color }]} />
          <Text style={[styles.statusLabel, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <Text style={styles.listingLocation}>📍 {listing.location}</Text>
      </View>

      <Text style={styles.listingTitle} numberOfLines={2}>
        {listing.title}
      </Text>

      <View style={styles.listingMeta}>
        <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
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
            {i < arr.length - 1 && <View style={styles.statDividerV} />}
          </React.Fragment>
        ))}
      </View>
      </Glass>
      </TouchableOpacity>

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
            {isSample ? (
              <TouchableOpacity style={styles.cardMenuItem} onPress={confirmDelete}>
                <Text style={[styles.cardMenuItemText, styles.cardMenuItemDanger]}>
                  Remove
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.cardMenuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    onEdit(listing);
                  }}
                >
                  <Text style={styles.cardMenuItemText}>Edit</Text>
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
                <TouchableOpacity
                  style={styles.cardMenuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    onDuplicate(listing);
                  }}
                >
                  <Text style={styles.cardMenuItemText}>Duplicate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardMenuItem} onPress={confirmDelete}>
                  <Text style={[styles.cardMenuItemText, styles.cardMenuItemDanger]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
          <Text style={{ fontSize: 14 }}>{item.icon}</Text>
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
function sparkPath(data, w, h, pad = 3) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function MiniLineChart({ data, color, width = 80, height = 34 }) {
  const d = sparkPath(data, width, height);
  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path
        d={`${d} L${(width - 3).toFixed(1)} ${height} L3 ${height} Z`}
        fill={`url(#${gradId})`}
      />
      <Path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MiniBarChart({ data, color, width = 80, height = 34 }) {
  const max = Math.max(...data, 1);
  const bw = width / data.length - 2.5;
  return (
    <Svg width={width} height={height}>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * (height - 4));
        const x = i * (width / data.length) + 1;
        return (
          <Rect
            key={i}
            x={x}
            y={height - bh}
            width={bw}
            height={bh}
            rx={2}
            fill={color}
            fillOpacity={0.75}
          />
        );
      })}
    </Svg>
  );
}

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
              <Text style={chartModalStyles.closeText}>✕</Text>
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
            {IMPACT_MONTHS.map((m) => (
              <Text key={m} style={chartModalStyles.monthText}>
                {m}
              </Text>
            ))}
          </View>
          <Text style={chartModalStyles.previewNote}>Preview data — updates once your listings go live.</Text>
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
  previewNote: { fontFamily: fonts.body, fontSize: 11, color: colors.sage, textAlign: "center", marginTop: 12 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState(SAMPLE_LISTINGS);
  const [listingFilter, setListingFilter] = useState("all");
  const [pricingToolOpen, setPricingToolOpen] = useState(false);
  const [expandedStat, setExpandedStat] = useState(null);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const stored = await AsyncStorage.getItem(LISTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge stored listings with sample photos if photos missing
          const merged = SAMPLE_LISTINGS.map((sample) => {
            const found = parsed.find((p) => p.id === sample.id);
            if (found) return { ...sample, ...found, photos: sample.photos };
            return sample;
          });
          // Add any new user-created listings not in SAMPLE_LISTINGS
          const sampleIds = new Set(SAMPLE_LISTINGS.map((s) => s.id));
          const userListings = parsed.filter((p) => !sampleIds.has(p.id));
          setListings([...merged, ...userListings]);
        } else {
          await AsyncStorage.setItem(
            LISTINGS_KEY,
            JSON.stringify(SAMPLE_LISTINGS),
          );
          setListings(SAMPLE_LISTINGS);
        }
      } catch (error) {
        console.error("Failed to load listings:", error);
        setListings(SAMPLE_LISTINGS);
      }
    };
    loadListings();
  }, []);

  const persistListings = async (next) => {
    setListings(next);
    try {
      await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to save listings:", error);
    }
  };

  const toggleListingStatus = (id) => {
    persistListings(
      listings.map((l) => {
        if (l.id !== id) return l;
        // Real listings use published/unpublished (shared with creators.jsx
        // and profile.jsx); samples use active/paused — keep each vocab.
        if (l.status === "published") return { ...l, status: "unpublished" };
        if (l.status === "unpublished") return { ...l, status: "published" };
        return { ...l, status: l.status === "paused" ? "active" : "paused" };
      }),
    );
  };

  const duplicateListing = (listing) => {
    const copy = {
      ...listing,
      id: `listing_${Date.now()}`,
      title: `${listing.title} (Copy)`,
      status: "draft",
      applicants: 0,
      confirmed: 0,
      completed: 0,
    };
    persistListings([copy, ...listings]);
  };

  const deleteListing = (listing) => {
    persistListings(listings.filter((l) => l.id !== listing.id));
  };

  const editListing = (listing) => {
    router.push({
      pathname: "/host/listings/create/basics",
      params: { id: listing.id, editMode: "true" },
    });
  };

  const filtered =
    listingFilter === "all"
      ? listings
      : listings.filter((l) => displayStatus(l.status) === listingFilter);

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.headerTitle}>Your Stays</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/host/(tabs)/profile")}
              style={styles.hostAvatarWrap}
            >
              <Image
                source={{
                  uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
                }}
                style={styles.hostAvatarImg}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          </View>

          {/* ── Quick Stats Strip ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsStrip}
            style={styles.statsStripWrap}
          >
            {[
              {
                num: listings.filter((l) => displayStatus(l.status) === "active")
                  .length,
                label: "Active Listings",
                onPress: () => setListingFilter("active"),
              },
              {
                num: listings.reduce((a, l) => a + (l.applicants || 0), 0),
                label: "New Applicants",
                onPress: () => router.push("/host/(tabs)/proposals"),
              },
              {
                num: 3,
                label: "Upcoming Stays",
                onPress: () => router.push("/host/(tabs)/proposals"),
              },
              {
                num: 5,
                label: "Unread Messages",
                onPress: () => router.push("/host/(tabs)/inbox"),
              },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <TouchableOpacity style={styles.quickStat} onPress={s.onPress}>
                  <Text style={styles.quickStatNum}>{s.num}</Text>
                  <Text style={styles.quickStatLabel}>{s.label}</Text>
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={styles.statDividerV} />}
              </React.Fragment>
            ))}
          </ScrollView>

          {/* ── My Listings ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>My Listings</Text>
                <Text style={styles.sectionSub}>{listings.length} total</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/host/listings/create/index")}
              >
                <Text style={styles.primaryBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
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
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.browseMarketplaceBtn}
              onPress={() => router.push("/host/browse-marketplace")}
            >
              <Text style={styles.browseMarketplaceText}>🧭 Browse Marketplace</Text>
            </TouchableOpacity>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏡</Text>
                <Text style={styles.emptyText}>No listings here yet</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push("/host/listings/create/index")}
                >
                  <Text style={styles.primaryBtnText}>
                    Create your first listing
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={normalizeForDisplay(l)}
                  isSample={SAMPLE_IDS.has(l.id)}
                  onToggleStatus={toggleListingStatus}
                  onDuplicate={duplicateListing}
                  onDelete={deleteListing}
                  onEdit={editListing}
                />
              ))
            )}
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
                {SAMPLE_ACTIVITY.map((item, i) => (
                  <ActivityItem
                    key={item.id}
                    item={item}
                    isLast={i === SAMPLE_ACTIVITY.length - 1}
                    router={router}
                  />
                ))}
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
            <View style={styles.statsGrid}>
              {LIFETIME_STATS.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={styles.statCardShadow}
                  activeOpacity={0.85}
                  onPress={() => setExpandedStat(s)}
                >
                  <Glass variant="card" contentStyle={styles.statCardContent}>
                    <View style={[styles.dot8, { backgroundColor: s.dot }]} />
                    <Text style={styles.statNum}>{s.num}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <View style={{ marginTop: 8 }}>
                      {s.type === "bar" ? (
                        <MiniBarChart data={s.data} color={s.dot} />
                      ) : (
                        <MiniLineChart data={s.data} color={s.dot} />
                      )}
                    </View>
                  </Glass>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Floating pricing tool widget */}
      <TouchableOpacity
        style={[styles.pricingFab, { bottom: insets.bottom + 24 }]}
        onPress={() => setPricingToolOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.pricingFabDollar}>$</Text>
        <Text style={styles.pricingFabText}>Pricing</Text>
      </TouchableOpacity>

      <Modal
        visible={pricingToolOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPricingToolOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bone }}>
          <View style={[styles.pricingModalHeader, { paddingTop: insets.top || 16 }]}>
            <TouchableOpacity onPress={() => setPricingToolOpen(false)}>
              <Text style={styles.pricingModalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <PricingTool />
        </View>
      </Modal>

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

  pricingFab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    ...shadows.md,
  },
  pricingFabDollar: { fontFamily: fonts.displayExtrabold, fontSize: 15, color: colors.ink },
  pricingFabText: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: colors.ink },
  pricingModalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pricingModalDone: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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

  hostAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  hostAvatarImg: { width: 44, height: 44 },

  statsStripWrap: { marginHorizontal: 20, marginBottom: 4 },
  statsStrip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 4,
  },
  quickStat: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  quickStatNum: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: track(20, tracking.display),
  },
  quickStatLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.sage, marginTop: 1 },
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

  filterRow: { maxHeight: 40, marginBottom: 14 },
  filterContent: { gap: 8, alignItems: "center" },
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
  browseMarketplaceBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.15)",
    marginBottom: 14,
  },
  browseMarketplaceText: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: colors.slate },

  listingCardWrap: { position: "relative", marginBottom: 16 },
  // Shadow lives on this outer node — Glass's own View sets overflow:"hidden",
  // which would otherwise clip an RN shadow drawn on the same layer.
  listingCardShadow: { ...shadows.md, borderRadius: radii.lg },
  listingCardContent: { padding: 16 },
  cardMenuWrap: { position: "absolute", top: 12, right: 12, zIndex: 10 },
  cardMenuBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  cardMenuDots: { fontSize: 16, color: colors.ink, lineHeight: 16 },
  cardMenuDropdown: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 140,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 4,
    ...shadows.lg,
  },
  cardMenuItem: { paddingHorizontal: 16, paddingVertical: 10 },
  cardMenuItemText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  cardMenuItemDanger: { color: "#C86868" }, // no brand token — semantic danger red, flagged
  cardMenuItemMuted: { color: colors.sage },
  photoContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
  },
  dotIndicators: {
    position: "absolute",
    bottom: 8,
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
  },
  statusLabel: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  listingLocation: { fontFamily: fonts.body, fontSize: 11, color: colors.sage },
  listingTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 10,
    lineHeight: 21,
  },
  listingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tierText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  compType: { fontFamily: fonts.body, fontSize: 11, color: colors.sage },
  listingStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(25,37,36,0.04)",
    borderRadius: 12,
    padding: 10,
  },
  listingStat: { flex: 1, alignItems: "center" },
  listingStatNum: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  listingStatLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.sage, marginTop: 1 },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.sage, marginBottom: 16 },

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
  activityDivider: {
    height: 1,
    backgroundColor: "rgba(60,87,89,0.06)",
    marginHorizontal: 14,
  },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCardShadow: { ...shadows.md, borderRadius: radii.lg, width: "47.5%" },
  statCardContent: { padding: 16 },
  dot8: { width: 8, height: 8, borderRadius: 4, marginBottom: 10 },
  dot6: { width: 6, height: 6, borderRadius: 3 },
  statNum: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: track(26, tracking.display),
  },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 3 },
});
