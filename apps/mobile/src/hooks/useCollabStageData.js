import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "collabnb_collab_stage_data";

// Mirrors CollabContext's updateStageData on web — drive_url, content_stats
// and the upload-review checklist are local-only there too (no backend
// mutation accepts them; only current_stage/stages[x].completed/date sync
// via advanceStage). AsyncStorage stands in for web's localStorage.
async function loadAll() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}

export function useCollabStageData(collabId) {
  const [all, setAll] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadAll().then((d) => !cancelled && setAll(d));
    return () => {
      cancelled = true;
    };
  }, []);

  const data = all?.[collabId] || {};

  const update = useCallback(
    (updates) => {
      setAll((prev) => {
        const base = prev || {};
        const next = { ...base, [collabId]: { ...base[collabId], ...updates } };
        saveAll(next);
        return next;
      });
    },
    [collabId],
  );

  return { data, update, isReady: all !== null };
}

export default useCollabStageData;
