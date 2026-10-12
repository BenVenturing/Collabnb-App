// Creator-side collaboration detail — the phone counterpart to the web app's
// per-collab page: where this collab stands (stage stepper), who/what/where,
// and the two things a creator does next (message the host, view the listing).
// Reads the same `collaborations.getByCreator` query as the list, so no new
// backend call is needed.

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft, Check, MapPin, User, MessageCircle, Home, Package, Clock } from "lucide-react-native";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { buildTimeline } from "@/utils/collabTimeline";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";

const IMG_FALLBACK = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800";

function parseStages(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 10 }}>
      <Icon color={colors.slate} size={16} style={{ marginTop: 2 }} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>{label}</Text>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function CollabDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const rows = useQuery(api.collaborations.getByCreator, profile?._id ? { creatorId: String(profile._id) } : "skip");

  const raw = useMemo(() => (rows || []).find((c) => String(c._id) === String(id)), [rows, id]);
  const stages = useMemo(() => parseStages(raw?.stages), [raw]);
  const collab = raw && {
    currentStage: raw.current_stage || "pending",
    status: raw.status,
    stageDates: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, v?.date])),
  };
  const steps = useMemo(() => (collab ? buildTimeline(collab) : []), [raw]); // eslint-disable-line react-hooks/exhaustive-deps
  const terminated = raw?.status === "terminated";

  const openMessages = () => {
    const threadKey = `thread_${raw.listing_id}_${String(profile._id)}`;
    router.push({
      pathname: `/messages/${encodeURIComponent(threadKey)}`,
      params: { listingTitle: raw.property_name || "", hostName: raw.host_name || "Host", hostAvatar: "", tag: "Collab" },
    });
  };

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" style={{ padding: 10 }}>
          <ArrowLeft color={colors.ink} size={24} />
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.ink, marginLeft: 4, letterSpacing: track(18, tracking.display) }}>
          Collaboration
        </Text>
      </View>

      {rows === undefined ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.slate} />
        </View>
      ) : !raw ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.ink, marginBottom: 6 }}>Collaboration not found</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, textAlign: "center" }}>
            It may have been removed. Head back to your collaborations.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
          <View style={{ borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.surface, ...shadows.md }}>
            <Image source={{ uri: raw.image || IMG_FALLBACK }} style={{ width: "100%", height: 170 }} contentFit="cover" transition={200} />
            <View style={{ padding: 16 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, letterSpacing: track(22, tracking.display) }}>
                {raw.property_name || "Collaboration"}
              </Text>
              {raw.location ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <MapPin color={colors.slate} size={13} />
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginLeft: 4 }}>{raw.location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {terminated && (
            <View style={{ marginTop: 16, padding: 14, borderRadius: radii.md, backgroundColor: "rgba(200,104,104,0.12)" }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: "#C86868" }}>This collaboration was ended</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginTop: 2 }}>
                Message the host if you have questions.
              </Text>
            </View>
          )}

          {/* Stage stepper — vertical on a phone (the web page lays it out horizontally) */}
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.sage, marginTop: 24, marginBottom: 10, letterSpacing: track(11, tracking.eyebrow) }}>PROGRESS</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, ...shadows.sm }}>
            {steps.map((s, i) => {
              const done = s.state === "done";
              const current = s.state === "current";
              const stopped = s.state === "stopped";
              const last = i === steps.length - 1;
              return (
                <View key={s.key} style={{ flexDirection: "row" }}>
                  <View style={{ alignItems: "center", width: 28 }}>
                    <View
                      style={{
                        width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
                        backgroundColor: stopped ? "#C86868" : done ? colors.slate : current ? colors.mint : colors.bone,
                        borderWidth: current ? 2 : 0, borderColor: colors.slate,
                      }}
                    >
                      {done && <Check color="#fff" size={14} strokeWidth={3} />}
                    </View>
                    {!last && <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: done ? colors.slate : colors.stone }} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12, paddingBottom: last ? 0 : 16 }}>
                    <Text style={{ fontFamily: current || stopped ? fonts.bodySemibold : fonts.bodyMedium, fontSize: 15, color: s.state === "upcoming" ? colors.sage : colors.ink }}>
                      {s.label}
                      {s.date ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>{`  ·  ${s.date}`}</Text> : null}
                    </Text>
                    {(current || stopped) && !terminated && (
                      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginTop: 2 }}>{s.hint}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.sage, marginTop: 24, marginBottom: 6, letterSpacing: track(11, tracking.eyebrow) }}>DETAILS</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 6, ...shadows.sm }}>
            <Row icon={User} label="Host" value={raw.host_name} />
            <Row icon={Package} label="Deliverables" value={raw.deliverables} />
            <Row icon={Clock} label="Due in" value={raw.days_left && raw.is_active !== false ? `${raw.days_left} days` : null} />
          </View>
        </ScrollView>
      )}

      {raw && (
        <View style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 12, flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/listing-detail", params: { id: raw.listing_id } })}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={{ flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stone }}
          >
            <Home color={colors.ink} size={16} />
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink }}>View listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openMessages}
            disabled={!profile?._id}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={{ flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radii.pill, backgroundColor: colors.slate, opacity: profile?._id ? 1 : 0.5 }}
          >
            <MessageCircle color={colors.surface} size={16} />
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.surface }}>Message host</Text>
          </TouchableOpacity>
        </View>
      )}
    </AtmosphericBackground>
  );
}
