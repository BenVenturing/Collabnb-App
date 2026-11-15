import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radii } from "@/config/theme";

export default function AppleButton({ onPress, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        borderRadius: radii.md,
        paddingVertical: 14,
        marginBottom: 12,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <Ionicons name="logo-apple" size={19} color="#FFFFFF" style={{ marginRight: 8, marginTop: -2 }} />
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: "#FFFFFF" }}>
        {loading ? "Opening Apple…" : "Continue with Apple"}
      </Text>
    </TouchableOpacity>
  );
}
