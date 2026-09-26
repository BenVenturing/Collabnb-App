import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Real Convex-backed conversation — api.threadMessages.getByThread/sendMessage,
// read receipts via threads.markReadByMe + notifications.markReadForThread.
// Mirrors app/src/pages/Inbox.jsx's ConversationPanel.
export function useThreadMessages(threadKey, profile) {
  const rawMessages = useQuery(api.threadMessages.getByThread, threadKey ? { threadKey } : "skip");
  const sendMutation = useMutation(api.threadMessages.sendMessage);
  const markReadByMe = useMutation(api.threads.markReadByMe);
  const markNotifsRead = useMutation(api.notifications.markReadForThread);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const myId = profile?._id ? String(profile._id) : null;

  const messages = useMemo(
    () =>
      (rawMessages ?? []).map((m) => ({
        id: String(m._id),
        isMine: m.sender_id === myId,
        text: m.text,
        createdAt: m.created_at,
      })),
    [rawMessages, myId]
  );

  const send = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || !threadKey || !myId) return false;
      setSending(true);
      setError("");
      try {
        await sendMutation({
          threadKey,
          senderId: myId,
          senderName: profile?.full_name || "Member",
          senderAvatar: profile?.avatar_url,
          senderRole: profile?.role === "host" ? "host" : "creator",
          text: trimmed,
        });
        return true;
      } catch (err) {
        setError(err?.data || err?.message || "Couldn't send that message. Try again.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [threadKey, myId, profile, sendMutation]
  );

  const markRead = useCallback(() => {
    if (!threadKey || !myId) return;
    markReadByMe({ threadKey }).catch(() => {});
    markNotifsRead({ userId: myId, threadKey }).catch(() => {});
  }, [threadKey, myId, markReadByMe, markNotifsRead]);

  return {
    messages,
    isLoading: rawMessages === undefined,
    sending,
    error,
    send,
    markRead,
  };
}
