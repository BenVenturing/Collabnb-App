import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Alert, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { Flag, Ban, ChevronLeft } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { colors } from "@/config/theme";

export const REPORT_REASONS = [
  { id: "inaccurate_information", label: "Inaccurate or misleading information" },
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or abusive behavior" },
  { id: "poor_communication", label: "Poor communication" },
  { id: "unprofessional_behavior", label: "Unprofessional behavior" },
  { id: "failed_collaboration", label: "Failed to deliver on a collaboration" },
  { id: "other", label: "Something else" },
];

export default function UserSafetySheet({ visible, onClose, profileId, targetId, targetName, onBlocked }) {
  const insets = useSafeAreaInsets();
  const submitReport = useMutation(api.reports.submitReport);
  const blockUser = useMutation(api.profiles.blockUser);
  const [step, setStep] = useState("menu");
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const name = targetName || "this user";

  const close = () => {
    setStep("menu");
    setReason(null);
    setDetails("");
    onClose();
  };

  const confirmBlock = () => {
    Alert.alert(
      `Block ${name}?`,
      "They won't be able to message you, and you won't be able to message them. You can unblock them in Settings > Privacy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await blockUser({ profileId, targetId });
              close();
              Alert.alert("Blocked", `${name} has been blocked.`);
              onBlocked?.();
            } catch (err) {
              Alert.alert("Couldn't block", err?.data || err?.message || "Try again in a moment.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const sendReport = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await submitReport({
        reportedUserId: targetId,
        reporterId: profileId,
        reason,
        details: details.trim() || undefined,
      });
      close();
      Alert.alert("Report sent", "Thanks. Our team will review it.");
    } catch (err) {
      Alert.alert("Couldn't send report", err?.data || err?.message || "Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const row = { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16 };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          {step === "menu" ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 4 }}>{name}</Text>
              <TouchableOpacity style={row} onPress={() => setStep("reason")}>
                <Flag color={colors.ink} size={22} />
                <Text style={{ fontSize: 15, color: colors.ink }}>Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={row} onPress={confirmBlock} disabled={busy}>
                <Ban color="#c0392b" size={22} />
                <Text style={{ fontSize: 15, color: "#c0392b" }}>Block user</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={close} style={{ paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate }}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setStep("menu")}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
              >
                <ChevronLeft color={colors.ink} size={22} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>Report {name}</Text>
              </TouchableOpacity>
              {REPORT_REASONS.map((r) => {
                const active = reason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setReason(r.id)}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      marginTop: 8,
                      backgroundColor: active ? colors.mint : colors.bone,
                    }}
                  >
                    <Text style={{ fontSize: 15, color: colors.ink, fontWeight: active ? "700" : "500" }}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Add details (optional)"
                placeholderTextColor={colors.sage}
                multiline
                maxLength={500}
                style={{
                  marginTop: 12,
                  backgroundColor: colors.bone,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.ink,
                  height: 80,
                  textAlignVertical: "top",
                }}
              />
              <TouchableOpacity
                onPress={sendReport}
                disabled={!reason || busy}
                style={{
                  marginTop: 14,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: reason ? colors.slate : colors.stone,
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: "600", color: reason ? "#fff" : colors.sage }}>Submit report</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
