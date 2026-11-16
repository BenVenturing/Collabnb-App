import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Linking, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { colors } from "@/config/theme";

const TERMS_VERSION = "2026-11-15";

export default function TermsGate() {
  const { isSignedIn, user } = useUser();
  const email = isSignedIn ? user?.primaryEmailAddress?.emailAddress : null;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const acceptTerms = useMutation(api.profiles.acceptTerms);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!profile?._id || profile.terms_accepted_at) return null;

  const accept = async () => {
    if (!checked || busy) return;
    setBusy(true);
    try {
      await acceptTerms({ profileId: String(profile._id), version: TERMS_VERSION });
    } catch {}
    setBusy(false);
  };

  const link = { fontWeight: "700", color: colors.slate };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 22 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 8 }}>Before you continue</Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.ink, marginBottom: 14 }}>
            Collabnb has zero tolerance for objectionable content or abusive users, including nudity or sexual content, hate speech, harassment, threats, scams and illegal content. You can report or block anyone, and we review reports within 24 hours and remove offending content and accounts.
          </Text>
          <TouchableOpacity onPress={() => setChecked((c) => !c)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.slate, backgroundColor: checked ? colors.slate : "transparent", alignItems: "center", justifyContent: "center" }}>
              {checked ? <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.ink }}>
              I agree to the{" "}
              <Text style={link} onPress={() => Linking.openURL("https://collabnb.com/terms.html")}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={link} onPress={() => Linking.openURL("https://collabnb.com/privacy-policy.html")}>Privacy Policy</Text>
              , including the rules against objectionable content.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={accept} disabled={!checked || busy} style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: checked ? colors.slate : colors.stone }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontWeight: "600", color: checked ? "#fff" : colors.sage }}>Agree and continue</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
