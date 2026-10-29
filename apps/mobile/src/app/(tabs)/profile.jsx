import {
  View,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useAction, useConvex } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import { useRoleSwitch } from "@/hooks/useRoleSwitch";
import { getCreatorTier, formatFollowers } from "@/utils/profileHelpers";
import {
  Instagram,
  Camera,
  Youtube,
  Globe,
  MapPin,
  Plane,
  Settings,
  Share2,
  UserRound,
  RefreshCw,
} from "lucide-react-native";
import { colors, radii, shadows } from "@/config/theme";
import {
  AtmosphericBackground,
  Glass,
  ProfileHeader,
  StatGrid,
  SectionHeading,
  PillButton,
  Chip,
  Body,
  Display,
  EyebrowLabel,
  LoadingScreen,
} from "@/components/ui";
import LinksSection from "@/components/Profile/LinksSection";
import SpecialtiesSection from "@/components/Profile/SpecialtiesSection";
import SettingsModal from "@/components/Profile/SettingsModal";
import RoleSwitchModal from "@/components/Profile/RoleSwitchModal";
import ShareProfileSheet from "@/components/Profile/ShareProfileSheet";
import StatusBarBlur from "@/components/StatusBarBlur";
import CommunityGlobe from "@/components/CommunityGlobe";
import { useBottomPull, PulledSection, usePullToast, PullToast } from "@/components/PullReveal";

const LOCATION_PREF_KEY = "@collabnb_creator_location_prefs_v1";
const DEFAULT_PHOTO = {
  uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
};
const BIO_LIMIT = 155;
const COLLAB_CARD_WIDTH = 220;

function buildSocialLinks(profile) {
  const links = [];
  if (profile.instagram_handle) {
    links.push({
      platform: "Instagram",
      username: `@${profile.instagram_handle.replace(/^@/, "")}`,
      url: `https://instagram.com/${profile.instagram_handle.replace(/^@/, "")}`,
      icon: Instagram,
    });
  }
  if (profile.tiktok_handle) {
    links.push({
      platform: "TikTok",
      username: `@${profile.tiktok_handle.replace(/^@/, "")}`,
      url: `https://tiktok.com/@${profile.tiktok_handle.replace(/^@/, "")}`,
      icon: Camera,
    });
  }
  if (profile.youtube_handle) {
    links.push({
      platform: "YouTube",
      username: `@${profile.youtube_handle.replace(/^@/, "")}`,
      url: `https://youtube.com/@${profile.youtube_handle.replace(/^@/, "")}`,
      icon: Youtube,
    });
  }
  return links;
}

function updatedLabel(ts) {
  if (!ts) return "Tap to refresh";
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  return days === 0 ? "Updated today" : `Updated ${days}d ago`;
}

const MIN_SPIN_MS = 900;

// Re-syncs every linked social account. Live linking is still dark on prod,
// so most taps end in a toast explaining why nothing changed.
function RefreshStats({ sources = [], updatedAt, onMessage }) {
  const convex = useConvex();
  const syncMine = useAction(api.creatorSocial.syncMine);
  const spin = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    const started = Date.now();
    let msg = null;
    try {
      const status = await convex.query(api.creatorSocial.getStatus, {});
      const conns = status?.enabled ? await convex.query(api.creatorSocial.getMyConnections, {}) : [];
      const linked = (conns ?? []).filter((c) => !c.needs_reconnect);
      if (!status?.enabled) msg = "Live stats are coming soon";
      else if (linked.length === 0) msg = "Link Instagram, TikTok or YouTube in Settings";
      else {
        const results = await Promise.allSettled(linked.map((c) => syncMine({ platform: c.platform })));
        const cooled = results.some((r) => r.status === "rejected" && String(r.reason?.data ?? r.reason).includes("cooldown"));
        const ok = results.some((r) => r.status === "fulfilled");
        msg = ok ? "Stats updated" : cooled ? "Already fresh, try again in an hour" : "Couldn't refresh right now";
      }
    } catch {
      msg = "Live stats are coming soon";
    }
    const wait = MIN_SPIN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    loop.stop();
    Animated.timing(spin, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    setBusy(false);
    onMessage?.(msg);
  }, [busy, convex, syncMine, spin, onMessage]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Pressable
      onPress={refresh}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Refresh stats"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <RefreshCw size={12} color={colors.sage} />
      </Animated.View>
      <Body size={12} color={colors.sage}>
        {busy
          ? "Updating…"
          : sources.length
            ? `Stats from ${sources.join(", ")} · ${updatedLabel(updatedAt).toLowerCase()}`
            : updatedLabel(updatedAt)}
      </Body>
    </Pressable>
  );
}

// Web's own past-collab card, not the marketplace ListingCard: shorter image
// with the location burnt into a bottom scrim, then name, dates, status.
//
// Status is a plain mint chip. Web tints it amber/blue/green per stage, but
// those values aren't in the palette yet — see COMPONENT-SPEC.md §3.
function PastCollabCard({ collab, sample = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: COLLAB_CARD_WIDTH,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...shadows.sm,
      })}
    >
      <View style={{ height: 140, backgroundColor: colors.stone }}>
        {collab.image ? (
          <Image
            source={{ uri: collab.image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            blurRadius={sample ? 4 : 0}
          />
        ) : null}
        <LinearGradient
          colors={["transparent", "rgba(25,37,36,0.45)"]}
          locations={[0.45, 1]}
          style={{ position: "absolute", inset: 0 }}
        />
        {sample ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(25,37,36,0.65)",
              borderRadius: 4,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <EyebrowLabel size={9} color={colors.bone}>
              Sample
            </EyebrowLabel>
          </View>
        ) : null}
        {collab.location ? (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              right: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MapPin size={11} color="rgba(239,236,233,0.9)" />
            <Body size={11} weight="medium" color="rgba(239,236,233,0.9)" numberOfLines={1}>
              {collab.location}
            </Body>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14, gap: 4 }}>
        <Display size={14} numberOfLines={2}>
          {collab.property_name || "Collab"}
        </Display>
        {collab.dates ? (
          <Body size={11} color={colors.sage}>
            {collab.dates}
          </Body>
        ) : null}
        <Chip
          label={collab.status_text || collab.status}
          style={{ alignSelf: "flex-start", marginTop: 4, paddingVertical: 4 }}
        />
      </View>
    </Pressable>
  );
}

export default function CreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  const [showShare, setShowShare] = useState(false);
  const router = useRouter();
  const { loadDraft: loadHostDraft } = useHostOnboardingStore();
  const { loadDraft: loadCreatorDraft } = useCreatorOnboardingStore();
  const { user, isSignedIn } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const collabs = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );

  const [showSettings, setShowSettings] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [collabPrefs, setCollabPrefs] = useState(null);
  const [pastRevealed, setPastRevealed] = useState(false);
  const toast = usePullToast();

  const {
    showRoleSwitchModal,
    setShowRoleSwitchModal,
    pendingTargetRole,
    isSwitching,
    attemptRoleSwitch,
    startOnboarding,
  } = useRoleSwitch();

  useEffect(() => {
    loadHostDraft();
    loadCreatorDraft();
    loadCollabPrefs();
  }, []);

  const loadCollabPrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCATION_PREF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          !parsed.skipped &&
          (parsed.currentLocation ||
            (parsed.collabPrefs && parsed.collabPrefs.length > 0))
        ) {
          setCollabPrefs(parsed);
        }
      }
    } catch (e) {}
  };

  const handleHostModePress = () => {
    setShowSettings(false);
    attemptRoleSwitch("host");
  };

  const handleShare = () => {
    if (!profile) return;
    setShowShare(true);
  };

  // Web treats only real, finished collabs as content; samples exist purely to
  // show what the section will look like once you've done one.
  const realCollabs = useMemo(
    () =>
      (collabs ?? []).filter(
        (c) => !c.is_sample && (c.status === "completed" || c.status === "approved"),
      ),
    [collabs],
  );
  const handlePull = useCallback(() => {
    if (collabs === undefined) return;
    if (realCollabs.length > 0) setPastRevealed(true);
    else toast.show("No past collabs yet. Finish one to show it here");
  }, [collabs, realCollabs.length, toast.show]);
  const bottomPull = useBottomPull(handlePull);

  // Signed out, the Convex query is skipped and never resolves, so the loading
  // screen below would spin forever with no way off it. Same shape as the
  // Saved tab's gate.
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
          <UserRound size={44} color={colors.stone} style={{ marginBottom: 18 }} />
          <Display size={20} style={{ textAlign: "center", marginBottom: 8 }}>
            Sign in to see your profile
          </Display>
          <Body size={15} color={colors.slate} style={{ textAlign: "center", marginBottom: 24 }}>
            Your stats, links, and past collabs live on your account.
          </Body>
          <PillButton label="Sign in" onPress={() => router.push("/signin")} />
        </View>
      </AtmosphericBackground>
    );
  }

  if (profile === undefined) {
    return <LoadingScreen label="Loading profile" />;
  }

  const followers = profile?.follower_count;
  const socialLinks = profile ? buildSocialLinks(profile) : [];
  const personalLink = profile?.portfolio
    ? { title: "My Link-in-Bio", url: profile.portfolio, icon: Globe }
    : null;
  const specialties = profile?.niches || [];
  const bio = profile?.bio || "";
  const bioTruncated = !bioExpanded && bio.length > BIO_LIMIT;

  const locationLine = [profile?.city, profile?.region, profile?.country]
    .filter(Boolean)
    .join(" ");

  const statSources = [
    profile?.metrics_instagram_followers ? "Instagram" : null,
    profile?.metrics_tiktok_followers ? "TikTok" : null,
    profile?.metrics_youtube_subscribers ? "YouTube" : null,
  ].filter(Boolean);

  // Counted from the collabs themselves: profile.collab_count is only written
  // by the admin backfill, so it lags real completions.
  const stats = [
    { label: "Collabs", value: collabs === undefined ? null : realCollabs.length },
    { label: "Followers", value: followers ? formatFollowers(followers) : null },
    profile?.engagement_rate
      ? { label: "Profile ER", value: `${profile.engagement_rate}%` }
      : { label: "Profile ER", comingSoon: true, placeholder: "4.2%" },
    // No collab carries a content ER yet.
    { label: "Content ER", comingSoon: true, placeholder: "6.8%" },
  ];

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      {isFocused ? <StatusBar style={statusBarStyle()} /> : null}

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        {...bottomPull}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: bottomPull.onScroll,
          },
        )}
      >
        <ProfileHeader
          avatar={profile?.avatar_url ? { uri: profile.avatar_url } : DEFAULT_PHOTO}
          name={profile?.full_name || "Your profile"}
          badgeTone={profile?.is_founder ? "gold" : undefined}
          badgeLabel={
            profile?.is_founder
              ? "★ Founding Member"
              : profile?.tier || getCreatorTier(followers ?? 0)
          }
          handle={profile?.username ? `@${profile.username}` : null}
          location={locationLine || null}
          topRight={
            <Pressable onPress={() => router.push("/(tabs)/settings")}>
              <Glass variant="small" contentStyle={{ padding: 10 }}>
                <Settings color={colors.ink} size={22} />
              </Glass>
            </Pressable>
          }
          action={
            <PillButton
              label="Share Profile"
              variant="glass"
              size={13}
              icon={<Share2 size={15} color={colors.ink} />}
              onPress={handleShare}
              style={{ paddingVertical: 10, paddingHorizontal: 18 }}
            />
          }
          style={{ marginBottom: 24 }}
        />

        <View style={{ paddingHorizontal: 20 }}>
          <StatGrid
            columns={2}
            items={stats}
            footer={
              <View
                style={{ alignSelf: "stretch", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hairline }}
              >
                <RefreshStats
                  sources={statSources}
                  updatedAt={profile?.metrics_synced_at ?? profile?.metrics_updated_at}
                  onMessage={toast.show}
                />
              </View>
            }
            style={{ marginBottom: 20 }}
          />

          {bio ? (
            <View style={{ marginBottom: 28 }}>
              <Body size={15} color={colors.slate}>
                {bioTruncated ? `${bio.slice(0, BIO_LIMIT)}…` : bio}
              </Body>
              {bio.length > BIO_LIMIT ? (
                <Pressable onPress={() => setBioExpanded(!bioExpanded)} hitSlop={8}>
                  <Body
                    size={14}
                    weight="semibold"
                    style={{ marginTop: 6, textDecorationLine: "underline" }}
                  >
                    {bioExpanded ? "Show less" : "Show more"}
                  </Body>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {personalLink || socialLinks.length > 0 ? (
          <LinksSection personalLink={personalLink} socialLinks={socialLinks} />
        ) : null}

        {specialties.length > 0 ? <SpecialtiesSection specialties={specialties} /> : null}

        {collabPrefs ? (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Glass variant="card" contentStyle={{ padding: 16, gap: 10 }}>
              <EyebrowLabel size={10}>Collab Preferences</EyebrowLabel>
              {collabPrefs.currentLocation ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MapPin size={14} color={colors.slate} />
                  <Body size={13} color={colors.slate} style={{ flex: 1 }}>
                    <Body size={13} weight="semibold">
                      Based in:{" "}
                    </Body>
                    {collabPrefs.currentLocation}
                  </Body>
                </View>
              ) : null}
              {collabPrefs.collabPrefs?.length > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Plane size={14} color={colors.slate} style={{ marginTop: 3 }} />
                  <Body size={13} color={colors.slate} style={{ flex: 1 }}>
                    <Body size={13} weight="semibold">
                      Open to:{" "}
                    </Body>
                    {collabPrefs.collabPrefs.join(", ")}
                  </Body>
                </View>
              ) : null}
            </Glass>
          </View>
        ) : null}

        <View style={{ marginTop: 8, marginBottom: 28 }}>
          <CommunityGlobe active={isFocused} />
        </View>

        {pastRevealed && realCollabs.length > 0 ? (
          <PulledSection style={{ marginBottom: 28 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeading
                size={18}
                title="Past Collabs"
                actionLabel="View all →"
                onAction={() => router.push("/(tabs)/collaborations")}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 4 }}
            >
              {realCollabs.map((c) => (
                <PastCollabCard
                  key={String(c._id)}
                  collab={c}
                  onPress={() =>
                    router.push({ pathname: "/listing-detail", params: { id: c.listing_id } })
                  }
                />
              ))}
            </ScrollView>
          </PulledSection>
        ) : null}
      </Animated.ScrollView>

      <StatusBarBlur scrollY={scrollY} fadeStart={0} fadeLength={30} />
      <PullToast text={toast.text} />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        insets={insets}
        isSwitching={isSwitching}
        onHostModePress={handleHostModePress}
      />
      <ShareProfileSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        profile={profile}
      />

      <RoleSwitchModal
        visible={showRoleSwitchModal}
        onClose={() => setShowRoleSwitchModal(false)}
        pendingTargetRole={pendingTargetRole}
        onStartOnboarding={startOnboarding}
      />
    </AtmosphericBackground>
  );
}
