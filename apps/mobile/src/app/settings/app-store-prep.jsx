import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Copy, FileText } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import appStoreDraft from "@/data/appStoreDraft";

function SectionCard({ title, children }) {
  return (
    <BlurView
      intensity={60}
      tint="light"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.5)",
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        marginBottom: 14,
      }}
    >
      <View style={{ padding: 18 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
        {children}
      </View>
    </BlurView>
  );
}

export default function AppStorePrepScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const copyValue = async (label, value) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <ChevronLeft color="#3C5759" size={28} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
            App Store Prep
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
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <FileText color="#3C5759" size={40} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Submission Draft
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            This is the mobile-side source of truth for your TestFlight and App Store Connect copy.
          </Text>
        </View>

        <SectionCard title="Description">
          <Text style={{ fontSize: 14, lineHeight: 22, color: "#3C5759", marginBottom: 14 }}>
            {appStoreDraft.appDescription}
          </Text>
          <TouchableOpacity
            onPress={() => copyValue("Description", appStoreDraft.appDescription)}
            style={{
              backgroundColor: "#3C5759",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Copy color="#EFECE9" size={16} />
            <Text style={{ color: "#EFECE9", fontWeight: "600" }}>Copy Description</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Keywords">
          <Text style={{ fontSize: 14, lineHeight: 22, color: "#3C5759", marginBottom: 14 }}>
            {appStoreDraft.keywords}
          </Text>
          <TouchableOpacity
            onPress={() => copyValue("Keywords", appStoreDraft.keywords)}
            style={{
              backgroundColor: "#3C5759",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Copy color="#EFECE9" size={16} />
            <Text style={{ color: "#EFECE9", fontWeight: "600" }}>Copy Keywords</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Required URLs">
          {[
            ["Support URL", appStoreDraft.supportUrl],
            ["Privacy Policy URL", appStoreDraft.privacyPolicyUrl],
          ].map(([label, value]) => (
            <View key={label} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#192524", marginBottom: 6 }}>
                {label}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: "#3C5759", marginBottom: 8 }}>
                {value}
              </Text>
              <TouchableOpacity
                onPress={() => copyValue(label, value)}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy color="#3C5759" size={14} />
                <Text style={{ color: "#3C5759", fontWeight: "600" }}>Copy</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Age Rating Draft">
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#192524", marginBottom: 10 }}>
            Target: {appStoreDraft.ageRating.target}
          </Text>
          {appStoreDraft.ageRating.notes.map((note) => (
            <Text
              key={note}
              style={{ fontSize: 14, lineHeight: 21, color: "#3C5759", marginBottom: 8 }}
            >
              • {note}
            </Text>
          ))}
        </SectionCard>

        <SectionCard title="App Privacy Draft">
          {appStoreDraft.privacySummary.map((section) => (
            <View key={section.title} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#192524", marginBottom: 6 }}>
                {section.title}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: "#3C5759", marginBottom: 6 }}>
                {section.items.join(", ")}
              </Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: "#959D90" }}>
                {section.purpose}
              </Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Submission Notes">
          {appStoreDraft.submissionNotes.map((note) => (
            <Text
              key={note}
              style={{ fontSize: 14, lineHeight: 21, color: "#3C5759", marginBottom: 8 }}
            >
              • {note}
            </Text>
          ))}
        </SectionCard>
      </ScrollView>
    </View>
  );
}
