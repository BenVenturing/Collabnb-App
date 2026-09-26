import { View, ScrollView, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";
import { useRoleSwitch } from "@/hooks/useRoleSwitch";
import { getCreatorTier } from "@/utils/profileHelpers";
import { Instagram, Camera, Youtube, Globe } from "lucide-react-native";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, tracking, track } from "@/config/theme";
import ProfileInfoCard from "@/components/Profile/ProfileInfoCard";
import LinksSection from "@/components/Profile/LinksSection";
import SpecialtiesSection from "@/components/Profile/SpecialtiesSection";
import SettingsModal from "@/components/Profile/SettingsModal";
import RoleSwitchModal from "@/components/Profile/RoleSwitchModal";
import { Settings } from "lucide-react-native";

const LOCATION_PREF_KEY = "@collabnb_creator_location_prefs_v1";
const DEFAULT_PHOTO = {
  uri: "https://ucarecdn.com/6d425040-e4c3-46f0-a774-91ac597ebe24/-/format/auto/",
};

function buildSocialLinks(profile) {
  const links = [];
  if (profile.instagram_handle) {
    links.push({
      platform: "Instagram",
      username: `@${profile.instagram_handle}`,
      url: `https://instagram.com/${profile.instagram_handle}`,
      icon: Instagram,
    });
  }
  if (profile.tiktok_handle) {
    links.push({
      platform: "TikTok",
      username: `@${profile.tiktok_handle}`,
      url: `https://tiktok.com/@${profile.tiktok_handle}`,
      icon: Camera,
    });
  }
  if (profile.youtube_handle) {
    links.push({
      platform: "YouTube",
      username: `@${profile.youtube_handle}`,
      url: `https://youtube.com/@${profile.youtube_handle}`,
      icon: Youtube,
    });
  }
  return links;
}

export default function CreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loadDraft: loadHostDraft } = useHostOnboardingStore();
  const { loadDraft: loadCreatorDraft } = useCreatorOnboardingStore();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const collabs = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );

  const [showSettings, setShowSettings] = useState(false);
  const [showVerificationTooltip, setShowVerificationTooltip] = useState(false);
  const [collabPrefs, setCollabPrefs] = useState(null);

  const stats = {
    followers: profile?.follower_count ?? 0,
    engagement: profile?.engagement_rate ?? 0,
    collabs: profile?.collab_count ?? (collabs?.length ?? 0),
  };
  const socialLinks = profile ? buildSocialLinks(profile) : [];
  const personalLink = profile?.portfolio
    ? { title: "My Link-in-Bio", url: profile.portfolio, icon: Globe }
    : null;
  const specialties = profile?.niches || [];

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
  const handleVerificationPress = (show) => setShowVerificationTooltip(show);

  if (profile === undefined) {
    return (
      <AtmosphericBackground style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.slate} />
      </AtmosphericBackground>
    );
  }

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Top bar — gear icon only */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          alignItems: "flex-end",
          backgroundColor: "transparent",
        }}
      >
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
          <Glass variant="small" contentStyle={{ padding: 10 }}>
            <Settings color={colors.slate} size={24} />
          </Glass>
        </TouchableOpacity>
      </View>

      {/* Profile photo — clean vertical stack, no overlap */}
      <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 0 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 3,
            borderColor: colors.surface,
            overflow: "hidden",
            marginBottom: 16,
            shadowColor: colors.ink,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Image
            source={profile?.avatar_url ? { uri: profile.avatar_url } : DEFAULT_PHOTO}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <ProfileInfoCard
          name={profile?.full_name || "Your profile"}
          creatorTier={profile?.tier || getCreatorTier(stats.followers)}
          bio={profile?.bio || ""}
          stats={stats}
          showVerificationTooltip={showVerificationTooltip}
          onVerificationPress={handleVerificationPress}
          isSelfView={true}
        />

        {(personalLink || socialLinks.length > 0) && (
          <LinksSection personalLink={personalLink} socialLinks={socialLinks} />
        )}
        {specialties.length > 0 && <SpecialtiesSection specialties={specialties} />}

        {/* Collab Preferences — only shown when prefs are saved */}
        {collabPrefs && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Glass variant="regular" contentStyle={{ padding: 16 }}>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 10,
                  color: colors.sage,
                  letterSpacing: track(10, tracking.eyebrow),
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Collab Preferences
              </Text>
              {!!collabPrefs.currentLocation && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, marginRight: 8 }}>📍</Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.slate,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bodySemibold, color: colors.ink }}>
                      Based in:{" "}
                    </Text>
                    {collabPrefs.currentLocation}
                  </Text>
                </View>
              )}
              {collabPrefs.collabPrefs &&
                collabPrefs.collabPrefs.length > 0 && (
                  <View
                    style={{ flexDirection: "row", alignItems: "flex-start" }}
                  >
                    <Text
                      style={{ fontSize: 14, marginRight: 8, marginTop: 1 }}
                    >
                      ✈️
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        color: colors.slate,
                        flex: 1,
                        lineHeight: 20,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.bodySemibold, color: colors.ink }}>
                        Open to:{" "}
                      </Text>
                      {collabPrefs.collabPrefs.join(", ")}
                    </Text>
                  </View>
                )}
            </Glass>
          </View>
        )}

        {/* Past Collabs */}
        <View
          style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              color: colors.ink,
              marginBottom: 12,
              letterSpacing: track(16, tracking.display),
            }}
          >
            Past Collabs
          </Text>
          {collabs === undefined ? (
            <ActivityIndicator color={colors.slate} />
          ) : collabs.length === 0 ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage }}>
              No past collaborations yet
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {collabs.map((collab) => (
                <TouchableOpacity
                  key={collab._id}
                  onPress={() =>
                    router.push({ pathname: "/listing-detail", params: { id: collab.listing_id } })
                  }
                  style={{
                    width: (400 - 56) / 3,
                    height: (400 - 56) / 3,
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: colors.bone,
                  }}
                >
                  {collab.image && (
                    <Image
                      source={{ uri: collab.image }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  )}
                  {collab.is_sample && (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        backgroundColor: "rgba(25,37,36,0.55)",
                        borderRadius: 6,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodySemibold,
                          fontSize: 9,
                          color: colors.bone,
                          letterSpacing: track(9, tracking.eyebrow),
                          textTransform: "uppercase",
                        }}
                      >
                        SAMPLE
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        insets={insets}
        isSwitching={isSwitching}
        onHostModePress={handleHostModePress}
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
