import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";

// Real Convex-backed inbox list — mirrors the merge order in the website's
// CollabContext (mergedThreads): admin-persona thread first, then any
// incoming thread not already known, then threads I own. There's no mobile
// equivalent of the web's local/localStorage thread cache, so "mine" comes
// from threads.getMine instead.
export function useConversations() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const ownerId = profile?._id ? String(profile._id) : null;

  const mineQuery = useQuery(api.threads.getMine, ownerId ? {} : "skip");
  const incomingQuery = useQuery(api.threads.getIncomingForMe, ownerId ? {} : "skip");
  const adminThread = useQuery(api.adminThreads.getMineAsUser, ownerId ? {} : "skip");

  const mine = mineQuery ?? [];
  const incoming = incomingQuery ?? [];

  const threads = useMemo(() => {
    let result = mine;
    if (adminThread && !result.some((t) => t.thread_key === adminThread.thread_key)) {
      result = [adminThread, ...result];
    }
    const knownKeys = new Set(result.map((t) => t.thread_key).filter(Boolean));
    const newIncoming = incoming.filter((t) => !knownKeys.has(t.thread_key));
    if (newIncoming.length) result = [...newIncoming, ...result];
    return result;
  }, [mine, incoming, adminThread]);

  const isLoading = email != null && (profile === undefined || mineQuery === undefined || incomingQuery === undefined);
  const unreadCount = threads.reduce((sum, t) => sum + (t.unread || 0), 0);

  return { threads, profile, isLoading, unreadCount };
}
