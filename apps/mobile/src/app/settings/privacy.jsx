import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { ChevronLeft, Shield } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, tracking, track } from "@/config/theme";

function PrivacyToggleRow({ label, sublabel, value, onChange, disabled }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 18,
        paddingHorizontal: 20,
      }}
    >
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 16,
            color: colors.ink,
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, lineHeight: 18 }}>
          {sublabel}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.stone, true: colors.mint }}
        thumbColor={value ? colors.slate : colors.sage}
        disabled={disabled}
      />
    </View>
  );
}

export default function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const allProfiles = useQuery(api.profiles.getAll);
  const updateProfileMutation = useMutation(api.profiles.updateProfile);
  const blockUserMutation = useMutation(api.profiles.blockUser);
  const unblockUserMutation = useMutation(api.profiles.unblockUser);
  const [blockQuery, setBlockQuery] = useState("");

  const profileId = profile?._id ? String(profile._id) : null;
  const profileVisible = profile?.profile_visible !== false;
  const showActivity = profile?.show_activity_to_hosts !== false;

  const blockedIds = profile?.blocked_user_ids ?? [];
  const blockedProfiles = (allProfiles ?? []).filter((p) =>
    blockedIds.includes(String(p._id)),
  );
  const blockResults =
    blockQuery.trim().length >= 2
      ? (allProfiles ?? [])
          .filter(
            (p) =>
              String(p._id) !== profileId &&
              !blockedIds.includes(String(p._id)) &&
              p.full_name?.toLowerCase().includes(blockQuery.trim().toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const handleBlock = (targetId) => {
    if (!profileId) return;
    setBlockQuery("");
    blockUserMutation({ profileId, targetId }).catch((error) => {
      console.error("Failed to block user:", error);
    });
  };

  const handleUnblock = (targetId) => {
    if (!profileId) return;
    unblockUserMutation({ profileId, targetId }).catch((error) => {
      console.error("Failed to unblock user:", error);
    });
  };

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.stone,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ChevronLeft color={colors.slate} size={28} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              color: colors.ink,
              letterSpacing: track(20, tracking.display),
            }}
          >
            Privacy & Security
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Shield color={colors.slate} size={40} />
          </View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 24,
              color: colors.ink,
              letterSpacing: track(24, tracking.display),
              marginBottom: 8,
            }}
          >
            Your Privacy Matters
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.slate,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            We're committed to protecting your personal information
          </Text>
        </View>

        {profile?.role === "creator" && (
          <Glass variant="small" style={{ marginBottom: 16 }}>
            <PrivacyToggleRow
              label={profileVisible ? "Profile is visible to hosts" : "Profile is hidden"}
              sublabel={
                profileVisible
                  ? "Hosts can find you on the Creators page and message you."
                  : "You won't appear in host search and hosts can't message you. Existing conversations stay open."
              }
              value={profileVisible}
              onChange={() =>
                profileId &&
                updateProfileMutation({
                  profileId,
                  updates: { profile_visible: !profileVisible },
                })
              }
              disabled={!profileId}
            />
          </Glass>
        )}

        <Glass variant="small" style={{ marginBottom: 16 }}>
          <PrivacyToggleRow
            label="Show my activity to hosts"
            sublabel="Applications, response time, and recent activity"
            value={showActivity}
            onChange={() =>
              profileId &&
              updateProfileMutation({
                profileId,
                updates: { show_activity_to_hosts: !showActivity },
              })
            }
            disabled={!profileId}
          />
        </Glass>

        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
            color: colors.sage,
            letterSpacing: track(11, tracking.eyebrow),
            paddingBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Blocked People
        </Text>
        <View style={{ position: "relative", marginBottom: 12 }}>
          <TextInput
            value={blockQuery}
            onChangeText={setBlockQuery}
            placeholder="Search by name to block someone…"
            placeholderTextColor={colors.sage}
            style={{
              borderWidth: 1,
              // colors.slate at 18% opacity
              borderColor: "rgba(60,87,89,0.18)",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.ink,
              // colors.surface at 62% opacity
              backgroundColor: "rgba(255,255,255,0.62)",
            }}
          />
          {blockResults.length > 0 && (
            <View
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                // colors.slate at 15% opacity
                borderColor: "rgba(60,87,89,0.15)",
                overflow: "hidden",
                zIndex: 20,
                elevation: 4,
              }}
            >
              {blockResults.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  onPress={() => handleBlock(String(p._id))}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink }}>
                    {p.full_name}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>Block</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {blockedProfiles.length === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, marginBottom: 16 }}>
            You haven't blocked anyone. Blocked people can't message you or see
            your profile.
          </Text>
        ) : (
          <Glass variant="small" style={{ marginBottom: 16 }}>
            {blockedProfiles.map((p, i) => (
              <View key={p._id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>
                      {p.full_name}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 2 }}>
                      Blocked — can't message you or view your profile
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleUnblock(String(p._id))}>
                    {/* No danger/error token exists in the 9-color palette — left as-is, see report */}
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: "#C86868" }}>
                      Unblock
                    </Text>
                  </TouchableOpacity>
                </View>
                {i < blockedProfiles.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      // colors.sage at 20% opacity
                      backgroundColor: "rgba(149, 157, 144, 0.2)",
                      marginLeft: 18,
                    }}
                  />
                )}
              </View>
            ))}
          </Glass>
        )}

        <Glass variant="small" style={{ marginBottom: 16 }}>
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 16,
                color: colors.ink,
                marginBottom: 12,
              }}
            >
              What We Collect
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.slate,
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              We store only the information needed to run Collabnb effectively:
              account details, role preferences, listings, messages, and
              activity history.
            </Text>

            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 16,
                color: colors.ink,
                marginBottom: 12,
              }}
            >
              How We Use It
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.slate,
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              Your data helps us connect creators with hosts, facilitate
              collaborations, and improve your experience. We don't sell
              personal data to third parties.
            </Text>

            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                fontSize: 16,
                color: colors.ink,
                marginBottom: 12,
              }}
            >
              Your Rights
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.slate,
                lineHeight: 22,
              }}
            >
              You can request data deletion at any time by contacting support.
              Use a strong passcode and keep your device secure to protect your
              account.
            </Text>
          </View>
        </Glass>

        <Glass
          variant="small"
          style={{
            // colors.mint at 40% opacity — preserved as an emphasis tint distinct from the other Glass panels above
            backgroundColor: "rgba(209, 235, 219, 0.4)",
          }}
        >
          <View style={{ padding: 16 }}>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: colors.ink,
                lineHeight: 20,
                textAlign: "center",
              }}
            >
              💡 Questions about privacy? Contact us at support@collabnb.com
            </Text>
          </View>
        </Glass>

        <TouchableOpacity
          onPress={() => router.push("/privacy-policy")}
          style={{
            backgroundColor: colors.slate,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone, fontSize: 16 }}>
            View Full Privacy Policy
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AtmosphericBackground>
  );
}
