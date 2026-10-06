import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { X, AlertCircle, Archive, Check } from "lucide-react-native";
import { useState } from "react";
import { TAG_OPTIONS, TAG_COLORS, TAG_TEXT_COLORS } from "@/lib/threadTags";
import { THEME_COLORS, THEME_COLOR_IDS } from "@/lib/threadColors";
import { colors } from "@/config/theme";

export default function ConversationDetailsSheet({
  hostName,
  hostAvatar,
  tag,
  themeColor,
  onArchive,
  onUpdateTag,
  onSetColor,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");

  const isCollabnb = tag === "Collabnb" || tag === "Notifications";

  const handleArchive = () => {
    Alert.alert("Archive conversation", "You can't undo this from the app yet.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        onPress: () => {
          onArchive?.();
          onClose();
        },
      },
    ]);
  };

  const handleSubmitHelp = () => {
    if (!helpSubject.trim() || !helpMessage.trim()) {
      Alert.alert("Error", "Please fill in both subject and message");
      return;
    }

    Alert.alert(
      "Help Request Submitted",
      "We'll get back to you soon. Check your email for updates.",
      [
        {
          text: "OK",
          onPress: () => {
            setShowHelpForm(false);
            setHelpSubject("");
            setHelpMessage("");
            onClose();
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onClose}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100 }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom,
          maxHeight: "80%",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.stone,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink }}>
            {showHelpForm ? "Help Center Request" : "Details"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color={colors.ink} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {showHelpForm ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Text style={{ fontSize: 14, color: colors.slate, marginBottom: 16 }}>
                Describe your issue and we'll help resolve it.
              </Text>

              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 8 }}>Subject</Text>
              <TextInput
                value={helpSubject}
                onChangeText={setHelpSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor={colors.sage}
                style={{
                  backgroundColor: colors.bone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.ink,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 8 }}>Message</Text>
              <TextInput
                value={helpMessage}
                onChangeText={setHelpMessage}
                placeholder="Provide details about your issue..."
                placeholderTextColor={colors.sage}
                multiline
                maxLength={500}
                style={{
                  backgroundColor: colors.bone,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.ink,
                  height: 120,
                  textAlignVertical: "top",
                  marginBottom: 8,
                }}
              />
              <Text style={{ fontSize: 12, color: colors.sage, textAlign: "right", marginBottom: 20 }}>
                {helpMessage.length}/500
              </Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowHelpForm(false)}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bone, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitHelp}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.slate, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.sage,
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  In this conversation
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden" }}>
                    <Image source={{ uri: hostAvatar || undefined }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>{hostName}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.slate,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}>You</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>You</Text>
                  </View>
                </View>
              </View>

              {!isCollabnb && (
                <>
                  <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: colors.sage,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Stage
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {TAG_OPTIONS.map((option) => {
                        const active = tag === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            onPress={() => onUpdateTag?.(option)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 10,
                              alignItems: "center",
                              backgroundColor: active ? TAG_COLORS[option] : colors.bone,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: active ? "700" : "500",
                                color: active ? TAG_TEXT_COLORS[option] : colors.slate,
                              }}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: colors.sage,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Color
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {THEME_COLOR_IDS.map((id) => {
                        const active = (themeColor || "grey") === id;
                        return (
                          <TouchableOpacity
                            key={id}
                            onPress={() => onSetColor?.(id)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: THEME_COLORS[id].dot,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: active ? 2 : 0,
                              borderColor: colors.ink,
                            }}
                          >
                            {active && <Check color="#fff" size={16} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <TouchableOpacity
                      onPress={handleArchive}
                      style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16 }}
                    >
                      <Archive color={colors.ink} size={22} />
                      <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }}>Archive conversation</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setShowHelpForm(true)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16 }}
                >
                  <AlertCircle color={colors.ink} size={22} />
                  <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }}>Help Center request</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
