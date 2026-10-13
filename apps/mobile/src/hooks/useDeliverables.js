// Deliverable submissions for one collaboration, for either party.
//
//   EXPO_PUBLIC_HOST_PIPELINE_BACKEND=convex -> stored on the Convex collab row
//       via api.hostCollaborations.saveDeliverables (both sides see each other).
//   default -> kept on this device (AsyncStorage) so the flow can be tried end
//       to end before the backend exists.
//
// Constant per bundle, so picking the hook at module load is rules-of-hooks safe.

import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { loadSubmissions, submit, approve, requestChanges, progress } from "@/utils/deliverables";

const KEY = (id) => `@collabnb_deliverables_v1:${id}`;

function actions(subs, persist) {
  return {
    submissions: subs,
    progress: progress(subs),
    submit: (itemId, url) => persist(submit(subs, itemId, url)),
    approve: (itemId) => persist(approve(subs, itemId)),
    requestChanges: (itemId, note) => persist(requestChanges(subs, itemId, note)),
  };
}

// collab: { id, creatorId?, hostId?, deliverablesText, submissionsRaw }
function useLocalDeliverables(collab) {
  const id = collab?.id;
  const text = collab?.deliverablesText;
  const [subs, setSubs] = useState(() => loadSubmissions(null, text));
  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(KEY(id)).then((s) => setSubs(loadSubmissions(s, text))).catch(() => setSubs(loadSubmissions(null, text)));
  }, [id, text]);
  const persist = useCallback(async (next) => {
    setSubs(next);
    await AsyncStorage.setItem(KEY(id), JSON.stringify(next)).catch(() => {});
  }, [id]);
  return actions(subs, persist);
}

function makeConvexHook(role) {
  return function useConvexDeliverables(collab) {
    const save = useMutation(api.hostCollaborations.saveDeliverables);
    const subs = useMemo(() => loadSubmissions(collab?.submissionsRaw, collab?.deliverablesText), [collab?.submissionsRaw, collab?.deliverablesText]);
    const profileId = role === "host" ? collab?.hostId : collab?.creatorId;
    const persist = useCallback(
      (next) => save({ id: collab.id, role, profileId, submissions: JSON.stringify(next) }),
      [save, collab?.id, profileId],
    );
    return actions(subs, persist);
  };
}

const convex = process.env.EXPO_PUBLIC_HOST_PIPELINE_BACKEND === "convex";
export const useCreatorDeliverables = convex ? makeConvexHook("creator") : useLocalDeliverables;
export const useHostDeliverables = convex ? makeConvexHook("host") : useLocalDeliverables;
