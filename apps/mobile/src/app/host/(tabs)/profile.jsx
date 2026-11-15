import { View, ScrollView, Pressable, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { statusBarStyle } from "@/utils/ColorModeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { Globe, Settings, Share2, UserRound } from "lucide-react-native";
import { colors } from "@/config/theme";
import {
  AtmosphericBackground,
  Glass,
  ProfileHeader,
  StatGrid,
  SectionHeading,
  PillButton,
  Body,
  Display,
  LoadingScreen,
} from "@/components/ui";
import LinksSection from "@/components/Profile/LinksSection";
import { PastCollabCard, buildSocialLinks } from "@/components/Profile/profileShared";
import ShareProfileSheet from "@/components/Profile/ShareProfileSheet";
import StatusBarBlur from "@/components/StatusBarBlur";
import CommunityGlobe from "@/components/CommunityGlobe";
import { useBottomPull, PulledSection, usePullToast, PullToast } from "@/components/PullReveal";

const DEFAULT_PHOTO = {
  uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
};
const BIO_LIMIT = 155;

export default function HostProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const hostId = profile?._id ? String(profile._id) : null;
  const collabs = useQuery(api.collaborations.getByHost, hostId ? { hostId } : "skip");
  const listings = useQuery(api.listings.getByHost, hostId ? { host_id: hostId } : "skip");

  const [showShare, setShowShare] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [pastRevealed, setPastRevealed] = useState(false);
  const toast = usePullToast();

  // Samples exist to populate an empty dashboard; counting them would inflate
  // the stats below.
  const realCollabs = useMemo(
    () => (collabs ?? []).filter((c) => c.is_sample !== true),
    [collabs],
  );
  const pastCollabs = useMemo(
    () => realCollabs.filter((c) => c.status === "completed" || c.status === "approved"),
    [realCollabs],
  );
  const publishedListings = useMemo(
    () => (listings ?? []).filter((l) => l.status === "published" && l.is_sample !== true),
    [listings],
  );

  const handlePull = useCallback(() => {
    if (collabs === undefined) return;
    if (pastCollabs.length > 0) setPastRevealed(true);
    else toast.show("No past collabs yet. Finish one to show it here");
  }, [collabs, pastCollabs.length, toast.show]);
  const bottomPull = useBottomPull(handlePull);

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

  const socialLinks = profile ? buildSocialLinks(profile) : [];
  const personalLink = profile?.portfolio
    ? { title: "Website", url: profile.portfolio, icon: Globe }
    : null;
  const bio = profile?.bio || "";
  const bioTruncated = !bioExpanded && bio.length > BIO_LIMIT;

  const locationLine = [profile?.city, profile?.region, profile?.country]
    .filter(Boolean)
    .join(" ");

  const stats = [
    { label: "Collabs", value: collabs === undefined ? null : realCollabs.length },
    {
      label: "Creators",
      value:
        collabs === undefined
          ? null
          : new Set(realCollabs.map((c) => c.creator_id).filter(Boolean)).size,
    },
    { label: "Live Listings", value: listings === undefined ? null : publishedListings.length },
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
              : profile?.is_verified
                ? "Verified Host"
                : "Host"
          }
          handle={profile?.username ? `@${profile.username}` : null}
          location={locationLine || null}
          topRight={
            <Pressable onPress={() => router.push("/host/settings")}>
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
              onPress={() => profile && setShowShare(true)}
              style={{ paddingVertical: 10, paddingHorizontal: 18 }}
            />
          }
          style={{ marginBottom: 24 }}
        />

        <View style={{ paddingHorizontal: 20 }}>
          <StatGrid compact columns={3} items={stats} style={{ marginBottom: 20 }} />

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

        <View style={{ marginTop: 8, marginBottom: 28 }}>
          <CommunityGlobe active={isFocused} />
        </View>

        {pastRevealed && pastCollabs.length > 0 ? (
          <PulledSection style={{ marginBottom: 28 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeading size={18} title="Past Collabs" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 4 }}
            >
              {pastCollabs.map((c) => (
                <PastCollabCard
                  key={String(c._id)}
                  collab={c}
                  onPress={() =>
                    router.push({
                      pathname: "/listing-detail",
                      params: { id: c.listing_id, isHost: "true" },
                    })
                  }
                />
              ))}
            </ScrollView>
          </PulledSection>
        ) : null}
      </Animated.ScrollView>

      <StatusBarBlur scrollY={scrollY} fadeStart={0} fadeLength={30} />
      <PullToast text={toast.text} />

      <ShareProfileSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        profile={profile}
      />
    </AtmosphericBackground>
  );
}
