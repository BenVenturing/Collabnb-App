// Creator-side collab stage stepper — mirrors Collabnb Website's
// CollabDetail.jsx (Pending/Accepted/Adjustments/Uploaded/Closed panels),
// scoped to the stepper itself: advance stage, share a Drive link, submit
// content stats, and rate on close. Contract creation/editing and the
// content-metrics (post performance) submission form are a deliberate later
// pass, matching how CollabDetail.jsx splits those into separate concerns.
//
// drive_url / content_stats / the upload checklist are local-only on web too
// (CollabContext's updateStageData never calls Convex — see
// useCollabStageData.js) so they're AsyncStorage-backed here the same way.

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import {
  ArrowLeft,
  Clock,
  ClipboardCheck,
  RefreshCw,
  Upload,
  CheckCircle2,
  Clapperboard,
  Camera,
  PenLine,
  Star,
} from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { useCollabStageData } from "@/hooks/useCollabStageData";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";

const STAGES = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "accepted", label: "Accepted", icon: ClipboardCheck },
  { key: "updated", label: "Adjustments", icon: RefreshCw },
  { key: "uploaded_tagged", label: "Uploaded", icon: Upload },
  { key: "closed", label: "Closed", icon: CheckCircle2 },
];

function PanelCard({ children }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.65)",
        borderRadius: radii.lg,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.8)",
      }}
    >
      {children}
    </View>
  );
}

function PanelHeading({ icon: Icon, children }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <Icon size={18} color={colors.slate} />
      <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 16, color: colors.ink }}>{children}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: colors.ink,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: radii.pill,
        alignItems: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.bone }}>{label}</Text>
    </TouchableOpacity>
  );
}

function GhostButton({ label, onPress, color = colors.slate }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PendingPanel({ onAdvance, onWithdraw, working }) {
  const [prompted, setPrompted] = useState(false);
  return (
    <PanelCard>
      <PanelHeading icon={Clock}>Application sent</PanelHeading>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20, marginBottom: 16 }}>
        The host hasn't responded yet. You can nudge them or withdraw if you've changed your mind.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <PrimaryButton
          label={prompted ? "Host notified" : "Notify host"}
          onPress={() => {
            setPrompted(true);
            setTimeout(() => setPrompted(false), 2500);
          }}
        />
        <GhostButton label="Mark as accepted" onPress={onAdvance} />
        <GhostButton label="Withdraw" onPress={onWithdraw} color="#C0392B" />
      </View>
      {working && <ActivityIndicator color={colors.slate} style={{ marginTop: 12 }} />}
    </PanelCard>
  );
}

function AcceptedPanel({ stageData, updateStageData, onAdvance, working }) {
  const [url, setUrl] = useState(stageData.drive_url || "");
  const [saved, setSaved] = useState(false);
  const hasLink = !!stageData.drive_url;

  const handleSave = () => {
    updateStageData({ drive_url: url });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PanelCard>
      <PanelHeading icon={ClipboardCheck}>Share your content folder</PanelHeading>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20, marginBottom: 16 }}>
        Drop a Google Drive (or similar) link so the host can review your raw content.
      </Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://drive.google.com/..."
        placeholderTextColor={colors.sage}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={{
          backgroundColor: "rgba(255,255,255,0.75)",
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radii.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.ink,
          marginBottom: 12,
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <PrimaryButton label={saved ? "Saved" : hasLink ? "Update link" : "Save link"} onPress={handleSave} />
        <GhostButton label="Advance to adjustments" onPress={onAdvance} />
      </View>
      {working && <ActivityIndicator color={colors.slate} style={{ marginTop: 12 }} />}
    </PanelCard>
  );
}

function StatField({ icon: Icon, label, value, onChange }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
        <Icon size={12} color={colors.sage} />
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.sage, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      </View>
      <TextInput
        value={String(value ?? 0)}
        onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
        keyboardType="number-pad"
        textAlign="center"
        style={{
          width: "100%",
          backgroundColor: "rgba(255,255,255,0.75)",
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radii.md,
          paddingVertical: 10,
          fontFamily: fonts.displaySemibold,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    </View>
  );
}

function AdjustmentsPanel({ collab, stageData, updateStageData, onAdvance, working }) {
  const parseDefault = (keyword) => {
    const m = (collab.deliverables || "").match(new RegExp(`(\\d+)\\s*${keyword}`, "i"));
    return m ? parseInt(m[1], 10) : 0;
  };
  const [stats, setStats] = useState(
    stageData.content_stats || {
      reels: parseDefault("Reel"),
      photos: parseDefault("Photo"),
      blog_posts: parseDefault("Blog"),
    },
  );

  return (
    <PanelCard>
      <PanelHeading icon={RefreshCw}>Log your deliverables</PanelHeading>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20, marginBottom: 12 }}>
        Track what you've produced so far against the agreement.
      </Text>
      {!!collab.deliverables && (
        <View
          style={{
            backgroundColor: "rgba(209,235,221,0.3)",
            borderWidth: 1,
            borderColor: "rgba(209,235,221,0.6)",
            borderRadius: radii.md,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.sage, textTransform: "uppercase", marginBottom: 2 }}>
            From agreement
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, fontStyle: "italic" }}>
            {collab.deliverables}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <StatField icon={Clapperboard} label="Reels" value={stats.reels} onChange={(v) => setStats((s) => ({ ...s, reels: v }))} />
        <StatField icon={Camera} label="Photos" value={stats.photos} onChange={(v) => setStats((s) => ({ ...s, photos: v }))} />
        <StatField icon={PenLine} label="Blog" value={stats.blog_posts} onChange={(v) => setStats((s) => ({ ...s, blog_posts: v }))} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <PrimaryButton label="Save stats" onPress={() => updateStageData({ content_stats: stats })} />
        <GhostButton label="Advance to upload" onPress={onAdvance} />
      </View>
      {working && <ActivityIndicator color={colors.slate} style={{ marginTop: 12 }} />}
    </PanelCard>
  );
}

const CHECKLIST_ITEMS = [
  { key: "drive", label: "Final content is in the shared folder" },
  { key: "tagged", label: "Host is tagged in all posts" },
  { key: "located", label: "Location is tagged" },
  { key: "met", label: "Deliverables match the agreement" },
];

function UploadedPanel({ stageData, updateStageData, onAdvance, working }) {
  const checklist = stageData.checklist || {};
  const stats = stageData.content_stats;
  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item.key]);

  const toggle = (key) => updateStageData({ checklist: { ...checklist, [key]: !checklist[key] } });

  return (
    <PanelCard>
      <PanelHeading icon={Upload}>Final review</PanelHeading>
      {stats && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {Object.entries(stats).map(([key, val]) => (
            <View
              key={key}
              style={{ flex: 1, alignItems: "center", backgroundColor: "rgba(209,235,219,0.3)", borderRadius: radii.md, paddingVertical: 10 }}
            >
              <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.slate }}>{val}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.sage, textTransform: "capitalize", marginTop: 2 }}>
                {key.replace(/_/g, " ")}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink, marginBottom: 10 }}>Before you request approval</Text>
      <View style={{ gap: 10, marginBottom: 16 }}>
        {CHECKLIST_ITEMS.map((item) => (
          <TouchableOpacity key={item.key} onPress={() => toggle(item.key)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: checklist[item.key] ? colors.slate : colors.stone,
                backgroundColor: checklist[item.key] ? colors.slate : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {checklist[item.key] && <CheckCircle2 size={14} color="#fff" />}
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, flex: 1 }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {allChecked ? (
        <PrimaryButton label="Request approval" onPress={onAdvance} />
      ) : (
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, fontStyle: "italic" }}>
          Check everything off to request approval.
        </Text>
      )}
      {working && <ActivityIndicator color={colors.slate} style={{ marginTop: 12 }} />}
    </PanelCard>
  );
}

function StarRow({ value, onChange }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Star size={28} color={value >= n ? "#D4A843" : colors.stone} fill={value >= n ? "#D4A843" : "transparent"} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ClosedPanel({ collab, router }) {
  const collabId = String(collab._id);
  const existingReviews = useQuery(api.reviews.getForCollab, { collabId }) || [];
  const myReview = existingReviews.find((r) => r.reviewer_role === "creator");
  const submitReview = useMutation(api.reviews.submit);
  const advanceStage = useMutation(api.collaborations.advanceStage);

  const [stars, setStars] = useState(myReview?.rating || 0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1 || submitting) return;
    setSubmitting(true);
    try {
      await submitReview({
        collabId,
        reviewerRole: "creator",
        rating: stars,
        comment: comment.trim() || undefined,
        revieweeName: collab.host_name || undefined,
        propertyName: collab.property_name || undefined,
      });
      await advanceStage({ id: collabId, nextStage: "archived" });
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelCard>
      <PanelHeading icon={CheckCircle2}>Rate this collaboration</PanelHeading>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20, marginBottom: 16 }}>
        How was working with {collab.host_name || "this host"}?
      </Text>
      <StarRow value={stars} onChange={setStars} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Optional comment"
        placeholderTextColor={colors.sage}
        multiline
        style={{
          backgroundColor: "rgba(255,255,255,0.75)",
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radii.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.ink,
          marginTop: 16,
          marginBottom: 16,
          minHeight: 70,
          textAlignVertical: "top",
        }}
      />
      <PrimaryButton label={submitting ? "Submitting..." : "Submit & close"} onPress={handleSubmit} disabled={stars < 1 || submitting} />
    </PanelCard>
  );
}

export default function CollabDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const collabId = id ? String(id) : "";

  const collab = useQuery(api.collaborations.getById, collabId ? { id: collabId } : "skip");
  const advanceStageMutation = useMutation(api.collaborations.advanceStage);
  const removeMutation = useMutation(api.collaborations.remove);
  const { data: stageData, update: updateStageData } = useCollabStageData(collabId);

  const [working, setWorking] = useState(false);

  if (collab === undefined) {
    return (
      <AtmosphericBackground>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.slate} />
        </View>
      </AtmosphericBackground>
    );
  }

  if (!collab) {
    return (
      <AtmosphericBackground>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.ink, textAlign: "center" }}>
            Collaboration not found
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </AtmosphericBackground>
    );
  }

  const currentStage = collab.current_stage || "pending";
  const stageIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key === currentStage),
  );

  const handleAdvance = async (nextStage) => {
    setWorking(true);
    try {
      await advanceStageMutation({ id: collabId, nextStage });
    } finally {
      setWorking(false);
    }
  };

  const handleWithdraw = () => {
    Alert.alert("Withdraw application", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          await removeMutation({ id: collabId });
          router.back();
        },
      },
    ]);
  };

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <ArrowLeft color={colors.ink} size={24} />
        </TouchableOpacity>
        <Text
          style={{ fontFamily: fonts.displaySemibold, fontSize: 18, color: colors.ink, flex: 1, letterSpacing: track(18, tracking.display) }}
          numberOfLines={1}
        >
          {collab.property_name || "Collaboration"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {currentStage !== "archived" && (
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 24, marginTop: 8 }}>
            {STAGES.map((s, i) => {
              const isDone = i < stageIdx;
              const isActive = i === stageIdx;
              const StageIcon = s.icon;
              return (
                <View key={s.key} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
                    {i > 0 && <View style={{ flex: 1, height: 2, backgroundColor: isDone || isActive ? colors.mint : colors.stone }} />}
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDone ? colors.mint : isActive ? colors.ink : colors.bone,
                        borderWidth: isActive || isDone ? 0 : 1,
                        borderColor: colors.stone,
                      }}
                    >
                      <StageIcon size={13} color={isDone ? colors.slate : isActive ? "#fff" : colors.sage} />
                    </View>
                    {i < STAGES.length - 1 && (
                      <View style={{ flex: 1, height: 2, backgroundColor: isDone ? colors.mint : colors.stone }} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 9,
                      color: isActive ? colors.ink : colors.sage,
                      marginTop: 4,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {currentStage === "pending" && (
          <PendingPanel onAdvance={() => handleAdvance("accepted")} onWithdraw={handleWithdraw} working={working} />
        )}
        {currentStage === "accepted" && (
          <AcceptedPanel stageData={stageData} updateStageData={updateStageData} onAdvance={() => handleAdvance("updated")} working={working} />
        )}
        {currentStage === "updated" && (
          <AdjustmentsPanel
            collab={collab}
            stageData={stageData}
            updateStageData={updateStageData}
            onAdvance={() => handleAdvance("uploaded_tagged")}
            working={working}
          />
        )}
        {currentStage === "uploaded_tagged" && (
          <UploadedPanel stageData={stageData} updateStageData={updateStageData} onAdvance={() => handleAdvance("closed")} working={working} />
        )}
        {currentStage === "closed" && <ClosedPanel collab={collab} router={router} />}
        {currentStage === "archived" && (
          <PanelCard>
            <PanelHeading icon={CheckCircle2}>Archived</PanelHeading>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, lineHeight: 20 }}>
              This collaboration is complete.
            </Text>
          </PanelCard>
        )}

        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/listing-detail", params: { id: collab.listing_id } })
          }
          style={{ marginTop: 16, alignItems: "center", paddingVertical: 10 }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.sage }}>View listing</Text>
        </TouchableOpacity>
      </ScrollView>
    </AtmosphericBackground>
  );
}
