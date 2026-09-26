import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Copy, FileText } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import appStoreDraft from "@/data/appStoreDraft";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, tracking, track } from "@/config/theme";

function SectionCard({ title, children }) {
  return (
    <Glass variant="small" style={{ marginBottom: 14 }}>
      <View style={{ padding: 18 }}>
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 16,
            color: colors.ink,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
        {children}
      </View>
    </Glass>
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
    <AtmosphericBackground>
      <StatusBar style="dark" />

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
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
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
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <FileText color={colors.slate} size={40} />
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
            Submission Draft
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
            This is the mobile-side source of truth for your TestFlight and App Store Connect copy.
          </Text>
        </View>

        <SectionCard title="Description">
          <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.slate, marginBottom: 14 }}>
            {appStoreDraft.appDescription}
          </Text>
          <TouchableOpacity
            onPress={() => copyValue("Description", appStoreDraft.appDescription)}
            style={{
              backgroundColor: colors.slate,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Copy color={colors.bone} size={16} />
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone }}>Copy Description</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Keywords">
          <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.slate, marginBottom: 14 }}>
            {appStoreDraft.keywords}
          </Text>
          <TouchableOpacity
            onPress={() => copyValue("Keywords", appStoreDraft.keywords)}
            style={{
              backgroundColor: colors.slate,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Copy color={colors.bone} size={16} />
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.bone }}>Copy Keywords</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Required URLs">
          {[
            ["Support URL", appStoreDraft.supportUrl],
            ["Privacy Policy URL", appStoreDraft.privacyPolicyUrl],
          ].map(([label, value]) => (
            <View key={label} style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink, marginBottom: 6 }}>
                {label}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate, marginBottom: 8 }}>
                {value}
              </Text>
              <TouchableOpacity
                onPress={() => copyValue(label, value)}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.stone,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy color={colors.slate} size={14} />
                <Text style={{ fontFamily: fonts.bodySemibold, color: colors.slate }}>Copy</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Age Rating Draft">
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink, marginBottom: 10 }}>
            Target: {appStoreDraft.ageRating.target}
          </Text>
          {appStoreDraft.ageRating.notes.map((note) => (
            <Text
              key={note}
              style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate, marginBottom: 8 }}
            >
              • {note}
            </Text>
          ))}
        </SectionCard>

        <SectionCard title="App Privacy Draft">
          {appStoreDraft.privacySummary.map((section) => (
            <View key={section.title} style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink, marginBottom: 6 }}>
                {section.title}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate, marginBottom: 6 }}>
                {section.items.join(", ")}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.sage }}>
                {section.purpose}
              </Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Submission Notes">
          {appStoreDraft.submissionNotes.map((note) => (
            <Text
              key={note}
              style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.slate, marginBottom: 8 }}
            >
              • {note}
            </Text>
          ))}
        </SectionCard>
      </ScrollView>
    </AtmosphericBackground>
  );
}
