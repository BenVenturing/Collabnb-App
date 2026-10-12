// Creator-side contract card for the collab detail screen. Mirrors the host
// CRM's contract vocabulary (terms table, negotiation pills, counter + sign
// sheets) from the creator's chair: review the host's terms, counter, or sign.

import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";
import { CONTRACT_FIELDS, latestFields, waitingOn } from "@/utils/contract";
import * as haptic from "@/utils/haptics";

const eyebrow = { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.sage, letterSpacing: track(11, tracking.eyebrow) };

function Sheet({ visible, onClose, title, sub, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(25,37,36,0.4)" }}>
        <View style={{ maxHeight: "88%", backgroundColor: colors.bone, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: insets.bottom + 12 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.stone, alignSelf: "center", marginTop: 10 }} />
          <View style={{ padding: 20, paddingBottom: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink, letterSpacing: track(20, tracking.display) }}>{title}</Text>
            {!!sub && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage, marginTop: 2 }}>{sub}</Text>}
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          <View style={{ paddingHorizontal: 20 }}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PillButton({ label, onPress, dark = true, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={{
        minHeight: 48, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: radii.pill,
        backgroundColor: dark ? colors.ink : colors.surface, borderWidth: dark ? 0 : 1, borderColor: colors.stone, opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: dark ? colors.surface : colors.ink }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ContractSection({ contract, seed, onCounter, onSign }) {
  const [mode, setMode] = useState(null); // "counter" | "sign"
  const [fields, setFields] = useState({});
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const terms = latestFields(contract, seed);
  const rows = CONTRACT_FIELDS.filter((f) => terms[f.key]);
  const hasTerms = contract.history.length > 0;
  const turn = waitingOn(contract);
  const sigs = contract.signatures || {};

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); haptic.success(); setMode(null); } catch (e) { haptic.warning(); Alert.alert("Couldn't save", e?.message || "Try again."); }
    setBusy(false);
  };

  const status = contract.locked
    ? { text: "Contract locked — both parties signed", bg: colors.mint, fg: colors.ink }
    : !hasTerms
      ? { text: "Waiting for the host to send terms", bg: colors.bone, fg: colors.slate }
      : turn === "creator"
        ? { text: sigs.hostSignature ? "Host signed — your turn" : "Your turn to review", bg: colors.mint, fg: colors.ink }
        : { text: "Waiting for the host", bg: colors.bone, fg: colors.slate };

  return (
    <View>
      <Text style={{ ...eyebrow, marginTop: 24, marginBottom: 10 }}>CONTRACT</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, ...shadows.sm }}>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: status.bg, marginBottom: 12 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: status.fg }}>{status.text}</Text>
        </View>

        {rows.length === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage }}>
            No terms yet. You'll see the host's offer here as soon as they send one.
          </Text>
        ) : (
          rows.map((f, i) => (
            <View key={f.key} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage }}>{f.label}</Text>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink, marginTop: 1 }}>{terms[f.key]}</Text>
            </View>
          ))
        )}

        {hasTerms && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 12 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.bone }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.slate }}>Creator pitch</Text>
            </View>
            {contract.history.map((h, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: colors.sage }}>→</Text>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: h.modifiedBy === "host" ? colors.mint : colors.stone }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.ink }}>
                    {h.modifiedBy === "host" ? "Host" : "You"} v{h.version}{i === contract.history.length - 1 ? " · latest" : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {!!contract.history.at(-1)?.note && (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, marginTop: 8 }}>"{contract.history.at(-1).note}"</Text>
        )}

        {(sigs.hostSignature || sigs.creatorSignature) && (
          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline }}>
            {[["Host", sigs.hostSignature, sigs.hostSignedAt], ["You", sigs.creatorSignature, sigs.creatorSignedAt]].map(([who, s, at]) => (
              <Text key={who} style={{ fontFamily: fonts.body, fontSize: 13, color: s ? colors.ink : colors.sage, paddingVertical: 2 }}>
                {who}: {s ? `${s} · ${new Date(at).toLocaleDateString()}` : "not yet signed"}
              </Text>
            ))}
          </View>
        )}

        {hasTerms && !contract.locked && turn === "creator" && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <PillButton dark={false} label="Counter" onPress={() => { setFields(terms); setNote(""); setMode("counter"); }} />
            <PillButton label="Accept & sign" onPress={() => { setName(""); setMode("sign"); }} />
          </View>
        )}
      </View>

      <Sheet
        visible={mode === "counter"}
        onClose={() => setMode(null)}
        title="Counter the terms"
        sub={`Sending version ${contract.history.length + 1}. Signatures reset when terms change.`}
        footer={<View style={{ flexDirection: "row", gap: 10 }}><PillButton dark={false} label="Cancel" onPress={() => setMode(null)} /><PillButton label={busy ? "Sending…" : "Send counter"} disabled={busy} onPress={() => run(() => onCounter(fields, note.trim()))} /></View>}
      >
        {CONTRACT_FIELDS.map((f) => (
          <View key={f.key} style={{ marginBottom: 14 }}>
            <Text style={{ ...eyebrow, marginBottom: 6 }}>{f.label.toUpperCase()}</Text>
            <TextInput
              value={fields[f.key] || ""}
              onChangeText={(t) => setFields((p) => ({ ...p, [f.key]: t }))}
              placeholder={f.placeholder}
              placeholderTextColor={colors.sage}
              multiline={f.key === "extra_terms"}
              style={{ minHeight: 48, borderWidth: 1, borderColor: colors.hairline, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
            />
          </View>
        ))}
        <Text style={{ ...eyebrow, marginBottom: 6 }}>NOTE TO HOST</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Why these changes?"
          placeholderTextColor={colors.sage}
          multiline
          style={{ minHeight: 72, borderWidth: 1, borderColor: colors.hairline, borderRadius: radii.md, backgroundColor: colors.surface, padding: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
        />
      </Sheet>

      <Sheet
        visible={mode === "sign"}
        onClose={() => setMode(null)}
        title="Sign contract"
        sub="Type your full name to accept these terms."
        footer={<View style={{ flexDirection: "row", gap: 10 }}><PillButton dark={false} label="Cancel" onPress={() => setMode(null)} /><PillButton label={busy ? "Signing…" : "Sign"} disabled={busy || name.trim().length < 2} onPress={() => run(() => onSign(name))} /></View>}
      >
        {rows.map((f) => (
          <Text key={f.key} style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate, paddingVertical: 3 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.ink }}>{f.label}: </Text>{terms[f.key]}
          </Text>
        ))}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={colors.sage}
          autoCapitalize="words"
          style={{ marginTop: 16, minHeight: 52, borderWidth: 1, borderColor: colors.hairline, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: fonts.display, fontSize: 20, color: colors.ink }}
        />
      </Sheet>
    </View>
  );
}
