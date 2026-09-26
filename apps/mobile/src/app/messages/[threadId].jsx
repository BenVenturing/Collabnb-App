import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { ArrowLeft, Send, MoreVertical } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import ConversationDetailsSheet from "@/components/ConversationDetailsSheet";
import { colors } from "@/config/theme";

export default function ThreadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { threadId, listingTitle, hostName, hostAvatar, tag } = useLocalSearchParams();
  const threadKey = decodeURIComponent(threadId || "");

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");

  const { messages, isLoading, sending, error, send, markRead } = useThreadMessages(threadKey, profile);
  const [draft, setDraft] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const flatListRef = useRef(null);
  const readMarked = useRef(false);

  useEffect(() => {
    if (readMarked.current || !profile?._id) return;
    readMarked.current = true;
    markRead();
  }, [profile, markRead]);

  const handleSend = async () => {
    const text = draft;
    if (!text.trim() || sending) return;
    const ok = await send(text);
    if (ok) {
      setDraft("");
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const isNotifications = tag === "Notifications";

  const renderMessage = ({ item }) => (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 4,
        flexDirection: "row",
        justifyContent: item.isMine ? "flex-end" : "flex-start",
      }}
    >
      {!item.isMine && (
        <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", marginRight: 8, alignSelf: "flex-end" }}>
          <Image source={{ uri: hostAvatar || undefined }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>
      )}
      <View style={{ maxWidth: "75%" }}>
        <View
          style={{
            borderRadius: 20,
            borderBottomLeftRadius: item.isMine ? 20 : 4,
            borderBottomRightRadius: item.isMine ? 4 : 20,
            padding: 12,
            paddingHorizontal: 16,
            backgroundColor: item.isMine ? colors.mint : colors.bone,
          }}
        >
          <Text style={{ fontSize: 15, color: colors.ink, lineHeight: 20 }}>{item.text}</Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            color: colors.sage,
            marginTop: 4,
            marginLeft: item.isMine ? 0 : 8,
            marginRight: item.isMine ? 8 : 0,
            textAlign: item.isMine ? "right" : "left",
          }}
        >
          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="dark" />

      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: colors.stone,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft color={colors.ink} size={24} />
        </TouchableOpacity>

        <View style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", marginLeft: 12, marginRight: 12 }}>
          <Image source={{ uri: hostAvatar || undefined }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
            {listingTitle}
          </Text>
          <Text style={{ fontSize: 13, color: colors.slate }} numberOfLines={1}>
            {hostName}
          </Text>
        </View>

        <TouchableOpacity onPress={() => setShowDetails(true)} style={{ padding: 4 }}>
          <MoreVertical color={colors.ink} size={24} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.slate }}>Loading...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.sage, fontSize: 14 }}>No messages yet — say hello.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {isNotifications ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: colors.stone,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.sage, textAlign: "center" }}>
            This is a one-way notification thread — replies aren't accepted.
          </Text>
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: colors.stone,
          }}
        >
          {error ? <Text style={{ fontSize: 12, color: "#c0392b", marginBottom: 6 }}>{error}</Text> : null}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, backgroundColor: colors.bone, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message..."
                placeholderTextColor={colors.sage}
                style={{ fontSize: 15, color: colors.ink, maxHeight: 100 }}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: draft.trim() ? colors.slate : colors.stone,
              }}
            >
              <Send color={draft.trim() ? "#fff" : colors.sage} size={20} fill={draft.trim() ? "#fff" : "transparent"} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showDetails && (
        <ConversationDetailsSheet
          hostName={hostName}
          hostAvatar={hostAvatar}
          onClose={() => setShowDetails(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}
