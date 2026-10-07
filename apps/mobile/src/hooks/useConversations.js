import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/convex/_generated/api";
import { AUTO_COLOR_IDS, counterpartKey, threadColorKey } from "@/lib/threadColors";

const OVERLAY_KEY = "collabnb_thread_overlay";

// Archive/delete/tag/color are per-device display preferences on web too
// (CollabContext's archiveThread/deleteThread/updateThreadTag/setThreadColor
// all only touch local state, never Convex) — this mirrors that with
// AsyncStorage standing in for localStorage, keyed by thread_key so it
// applies the same way to Convex-sourced threads.
async function loadOverlay() {
  try {
    const raw = await AsyncStorage.getItem(OVERLAY_KEY);
    if (!raw) return { archived: {}, deleted: {}, tags: {}, colors: {} };
    const parsed = JSON.parse(raw);
    return {
      archived: parsed.archived || {},
      deleted: parsed.deleted || {},
      tags: parsed.tags || {},
      colors: parsed.colors || {},
    };
  } catch {
    return { archived: {}, deleted: {}, tags: {}, colors: {} };
  }
}

function saveOverlay(overlay) {
  AsyncStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay)).catch(() => {});
}

// Mirrors the merge order in the website's CollabContext (mergedThreads):
// admin-persona thread first, then any incoming thread not already known,
// then threads I own. There's no mobile equivalent of the web's
// local/localStorage thread cache, so "mine" comes from threads.getMine
// instead.
export function useConversations() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const ownerId = profile?._id ? String(profile._id) : null;

  const mineQuery = useQuery(api.threads.getMine, ownerId ? {} : "skip");
  const incomingQuery = useQuery(api.threads.getIncomingForMe, ownerId ? {} : "skip");
  const adminThread = useQuery(api.adminThreads.getMineAsUser, ownerId ? {} : "skip");
  const createThreadMutation = useMutation(api.threads.create);

  const mine = mineQuery ?? [];
  const incoming = incomingQuery ?? [];

  const [overlay, setOverlay] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadOverlay().then((o) => !cancelled && setOverlay(o));
    return () => {
      cancelled = true;
    };
  }, []);

  const rawThreads = useMemo(() => {
    let result = mine;
    if (adminThread && !result.some((t) => t.thread_key === adminThread.thread_key)) {
      result = [adminThread, ...result];
    }
    const knownKeys = new Set(result.map((t) => t.thread_key).filter(Boolean));
    const newIncoming = incoming.filter((t) => !knownKeys.has(t.thread_key));
    if (newIncoming.length) result = [...newIncoming, ...result];
    return result;
  }, [mine, incoming, adminThread]);

  // Auto-assign a color per counterpart group of 2+ (same rule as web's
  // CollabContext effect), skipping manual picks already in the overlay.
  const autoColors = useMemo(() => {
    if (!overlay) return {};
    const groups = new Map();
    rawThreads.forEach((t) => {
      const who = counterpartKey(t);
      if (!who || t.tag === "Collabnb" || overlay.archived[threadColorKey(t)]) return;
      if (!groups.has(who)) groups.set(who, []);
      groups.get(who).push(t);
    });
    const additions = {};
    groups.forEach((group) => {
      if (group.length < 2) return;
      const ordered = [...group].sort((a, b) =>
        String(threadColorKey(a)).localeCompare(String(threadColorKey(b))),
      );
      const used = new Set(
        ordered.map((t) => overlay.colors[threadColorKey(t)]).filter(Boolean),
      );
      ordered.forEach((t) => {
        const key = threadColorKey(t);
        if (!key || overlay.colors[key] || additions[key]) return;
        const next = AUTO_COLOR_IDS.find((c) => !used.has(c)) || AUTO_COLOR_IDS[0];
        used.add(next);
        additions[key] = next;
      });
    });
    return additions;
  }, [rawThreads, overlay]);

  const threads = useMemo(() => {
    if (!overlay) return [];
    return rawThreads
      .filter((t) => !overlay.deleted[threadColorKey(t)])
      .map((t) => {
        const key = threadColorKey(t);
        return {
          ...t,
          tag: overlay.tags[key] || t.tag,
          archived: !!overlay.archived[key],
          theme_color: overlay.colors[key] || autoColors[key],
        };
      });
  }, [rawThreads, overlay, autoColors]);

  const mutateOverlay = useCallback((updater) => {
    setOverlay((prev) => {
      const base = prev || { archived: {}, deleted: {}, tags: {}, colors: {} };
      const next = updater(base);
      saveOverlay(next);
      return next;
    });
  }, []);

  const archiveThread = useCallback(
    (threadKey) => {
      mutateOverlay((o) => ({ ...o, archived: { ...o.archived, [threadKey]: true } }));
    },
    [mutateOverlay],
  );

  const deleteThread = useCallback(
    (threadKey) => {
      mutateOverlay((o) => ({ ...o, deleted: { ...o.deleted, [threadKey]: true } }));
    },
    [mutateOverlay],
  );

  const updateTag = useCallback(
    (threadKey, tag) => {
      mutateOverlay((o) => ({ ...o, tags: { ...o.tags, [threadKey]: tag } }));
    },
    [mutateOverlay],
  );

  const setThreadColor = useCallback(
    (threadKey, color) => {
      mutateOverlay((o) => ({ ...o, colors: { ...o.colors, [threadKey]: color } }));
    },
    [mutateOverlay],
  );

  // Mirrors the working createThread pattern from ListingDetail.jsx's
  // handleMessageHost — a deterministic threadKey + participantId, unlike
  // web Inbox's own handleStartFromListing (which omits both and, per
  // threadMessages.ts's resolveThreadParties looking threads up only by its
  // thread_key index, leaves the resulting thread unable to authorize
  // getByThread/sendMessage for a non-admin). Matching web's intent here
  // means using the pattern that actually works, not the one that doesn't.
  const createThread = useCallback(
    async (listing) => {
      if (!ownerId) return null;
      const hostId = listing.host_id ? String(listing.host_id) : null;
      const threadKey = hostId ? `premsg_${listing.id}_${ownerId}` : null;
      const id = await createThreadMutation({
        listingTitle: listing.title,
        hostName: listing.host_name || "Host",
        hostAvatar: listing.image || undefined,
        tag: "Collab",
        lastMessage: "Start a conversation...",
        participantId: hostId || undefined,
        threadKey: threadKey || undefined,
      });
      return { id: String(id), threadKey: threadKey || String(id) };
    },
    [ownerId, createThreadMutation],
  );

  const isLoading =
    email != null &&
    (profile === undefined || mineQuery === undefined || incomingQuery === undefined || overlay === null);
  const unreadCount = threads.reduce((sum, t) => sum + (t.unread || 0), 0);

  return {
    threads,
    profile,
    isLoading,
    unreadCount,
    archiveThread,
    deleteThread,
    updateTag,
    setThreadColor,
    createThread,
  };
}
