import { useAuthStore } from "@/utils/auth/store";

const webAppUrl = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/$/, "");

const getUserId = () => useAuthStore.getState().auth?.user?.id;

async function request(path, options = {}) {
  if (!webAppUrl) throw new Error("EXPO_PUBLIC_BASE_URL is not configured.");
  const response = await fetch(`${webAppUrl}${path}`, options);
  if (!response.ok) throw new Error(`Messaging request failed (${response.status}).`);
  return response.json();
}

export const isWebMessagingConfigured = () => Boolean(webAppUrl && getUserId());

export async function getConversations() {
  const userId = getUserId();
  if (!userId) throw new Error("Sign in to load your conversations.");
  const { conversations } = await request(`/api/conversations/list?userId=${userId}`);
  return conversations;
}

export async function getConversationMessages(conversationId) {
  const { messages } = await request(`/api/messages/list?conversationId=${conversationId}`);
  return messages;
}

export async function sendConversationMessage(conversationId, content) {
  const senderId = getUserId();
  if (!senderId) throw new Error("Sign in to send a message.");
  const { message } = await request("/api/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: Number(conversationId), senderId, content }),
  });
  return message;
}

export async function markConversationRead(conversationId) {
  const userId = getUserId();
  if (!userId) return;
  await request("/api/conversations/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: Number(conversationId), userId }),
  });
}

export const getMessagingUserId = getUserId;
