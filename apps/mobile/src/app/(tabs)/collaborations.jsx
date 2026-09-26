// Creator V1 screen (namespaced to avoid host collisions)
//
// Backed by the same `collaborations` Convex table as the web app — a
// creator's application *is* the collaboration record (current_stage starts
// at 'pending'), so there's no separate "applications" list to reconcile
// against this one. Stage keys/labels mirror
// Collabnb Website/app/src/lib/mockData.js's STAGES. A per-collab detail
// screen with the full stage stepper (CollabDetail.jsx on web) is a
// deliberate later pass, not this one — tapping a card opens the listing.

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
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
import ThemedBackground from "@/components/ThemedBackground";
import { colors, fonts, radii, shadows } from "@/config/theme";

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
    appliedDate: stages?.pending?.date,
  };
}

export default function CreatorCollaborationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const collabsRaw = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : "skip",
  );

  const [activeFilter, setActiveFilter] = useState("active");

  const isLoading = collabsRaw === undefined;
  const collabs = useMemo(() => (collabsRaw || []).map(normalizeCollab), [collabsRaw]);
  const filteredCollabs = collabs.filter((c) =>
    activeFilter === "active" ? c.isActive : !c.isActive,
  );

  return (
    <ThemedBackground>
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
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginBottom: 16 }}>
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.slate} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {filteredCollabs.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>✦</Text>
                <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.ink, marginBottom: 6 }}>
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
                      onPress={() => router.push("/(tabs)")}
                    >
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.surface }}>
                        Discover Stays
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              filteredCollabs.map((collab) => {
                const isTerminated = collab.status === "terminated";
                const meta = STAGE_META[collab.currentStage] || STAGE_META.pending;
                const StageIcon = meta.icon;
                return (
                  <TouchableOpacity
                    key={collab.id}
                    style={{
                      backgroundColor: colors.surface,
                      marginHorizontal: 20,
                      marginBottom: 16,
                      borderRadius: radii.lg,
                      overflow: "hidden",
                      ...shadows.md,
                    }}
                    onPress={() => router.push({ pathname: "/listing-detail", params: { id: collab.listingId } })}
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
                          style={{ fontFamily: fonts.displaySemibold, fontSize: 16, color: colors.ink, marginBottom: 4 }}
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
                            backgroundColor: isTerminated ? "rgba(200,104,104,0.12)" : colors.mint,
                          }}
                        >
                          <StageIcon color={isTerminated ? "#C86868" : colors.ink} size={13} />
                          <Text
                            style={{
                              fontFamily: fonts.bodySemibold,
                              fontSize: 12,
                              marginLeft: 6,
                              color: isTerminated ? "#C86868" : colors.ink,
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
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </ThemedBackground>
  );
}
