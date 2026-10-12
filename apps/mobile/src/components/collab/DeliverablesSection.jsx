// Deliverables card, shared by both sides of a collab. The creator submits a
// link per deliverable; the host approves it or asks for changes. Everything
// is driven by the model in utils/deliverables.js — this file is presentation
// and the two input sheets only.
//
//   role="creator"  -> "Submit link" / "Resubmit"
//   role="host"     -> "Approve" / "Request changes" on submitted items

import { useState } from "react";
import { View, Text, Pressable, Modal, KeyboardAvoidingView, Platform, Alert, Linking } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";
import { BottomSheet } from "@/components/ui/Chrome";
import { PillButton } from "@/components/ui/Chip";
import { FormField } from "@/components/ui/Inputs";
import { STATUS } from "@/utils/deliverables";
import * as haptic from "@/utils/haptics";

const eyebrow = { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.sage, letterSpacing: track(11, tracking.eyebrow) };

const CHIP = {
  todo: { bg: colors.bone, fg: colors.slate },
  submitted: { bg: colors.stone, fg: colors.ink },
  changes_requested: { bg: colors.dangerTint, fg: colors.danger },
  approved: { bg: colors.mint, fg: colors.ink },
};

function SheetModal({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(25,37,36,0.4)" }}>
        <BottomSheet title={title} horizontal={false}>{children}</BottomSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SmallButton({ label, onPress, dark }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderRadius: radii.pill,
        backgroundColor: dark ? colors.ink : colors.surface, borderWidth: dark ? 0 : 1, borderColor: colors.stone,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: dark ? colors.surface : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export default function DeliverablesSection({ role, api, enabled = true, onComplete }) {
  const { submissions: subs, progress } = api;
  const [sheet, setSheet] = useState(null); // { type: "submit" | "changes", id }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn, after) => {
    setBusy(true);
    try {
      await fn();
      haptic.success();
      setSheet(null);
      after?.();
    } catch (e) {
      haptic.warning();
      Alert.alert("Couldn't save", e?.message || "Try again.");
    }
    setBusy(false);
  };

  const open = (type, id, initial = "") => { setText(initial); setSheet({ type, id }); };

  const onApprove = (id) => run(() => api.approve(id), () => {
    // The last approval completes the collab.
    if (progress.approved + 1 === progress.total) onComplete?.();
  });

  return (
    <View>
      <Text style={{ ...eyebrow, marginTop: 24, marginBottom: 10 }}>DELIVERABLES</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, ...shadows.sm }}>
        {!enabled ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
            Deliverables open once the contract is signed by both of you.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink }}>
                {progress.complete ? "All approved" : `${progress.approved} of ${progress.total} approved`}
              </Text>
              {progress.changes > 0 && (
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: CHIP.changes_requested.fg }}>
                  {progress.changes} need{progress.changes === 1 ? "s" : ""} changes
                </Text>
              )}
            </View>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: progress.total, now: progress.approved }} style={{ height: 6, borderRadius: 3, backgroundColor: colors.bone, overflow: "hidden", marginBottom: 6 }}>
              <View style={{ width: `${progress.total ? (progress.approved / progress.total) * 100 : 0}%`, height: 6, backgroundColor: colors.slate }} />
            </View>

            {subs.order.map((id, i) => {
              const item = subs.items[id];
              const chip = CHIP[item.status];
              return (
                <View key={id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}>{item.label}</Text>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: chip.bg }}>
                      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: chip.fg }}>{STATUS[item.status].label}</Text>
                    </View>
                  </View>

                  {!!item.url && (
                    <Pressable onPress={() => Linking.openURL(item.url).catch(() => {})} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, minHeight: 32 }}>
                      <ExternalLink color={colors.slate} size={14} />
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.slate, textDecorationLine: "underline" }}>{item.url}</Text>
                    </Pressable>
                  )}
                  {item.status === "changes_requested" && !!item.note && (
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginTop: 4 }}>Host: "{item.note}"</Text>
                  )}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    {role === "creator" && item.status !== "approved" && (
                      <SmallButton
                        dark={item.status !== "submitted"}
                        label={item.status === "todo" ? "Submit link" : item.status === "submitted" ? "Edit link" : "Resubmit"}
                        onPress={() => open("submit", id, item.url)}
                      />
                    )}
                    {role === "host" && item.status === "submitted" && (
                      <>
                        <SmallButton dark label="Approve" onPress={() => onApprove(id)} />
                        <SmallButton label="Request changes" onPress={() => open("changes", id)} />
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>

      <SheetModal visible={sheet?.type === "submit"} onClose={() => setSheet(null)} title={`Submit ${sheet ? subs.items[sheet.id]?.label : ""}`}>
        <FormField
          label="Link to your post"
          value={text}
          onChangeText={setText}
          placeholder="https://instagram.com/reel/..."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <PillButton label="Submit for review" loading={busy} disabled={!text.trim()} onPress={() => run(() => api.submit(sheet.id, text))} />
      </SheetModal>

      <SheetModal visible={sheet?.type === "changes"} onClose={() => setSheet(null)} title={`Changes for ${sheet ? subs.items[sheet.id]?.label : ""}`}>
        <FormField label="What should change?" value={text} onChangeText={setText} placeholder="e.g. Tag @property and add the location" multiline />
        <PillButton label="Send to creator" loading={busy} disabled={!text.trim()} onPress={() => run(() => api.requestChanges(sheet.id, text))} />
      </SheetModal>
    </View>
  );
}
