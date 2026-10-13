// Withdraw an application / leave a collaboration. Needs the backend: creator
// collaborations only exist on Convex, so unlike the contract and deliverables
// there is no meaningful local-only mode. `available` is false until
// EXPO_PUBLIC_HOST_PIPELINE_BACKEND=convex is set, and the UI hides the action.

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const useNone = () => ({ available: false, end: async () => false });

function useConvexEnd(collab) {
  const endCvx = useMutation(api.hostCollaborations.endCollaboration);
  const end = useCallback(
    async (reason) => {
      if (!collab?.id || !collab?.creatorId) return false;
      await endCvx({ id: collab.id, role: "creator", profileId: collab.creatorId, reason });
      return true;
    },
    [endCvx, collab?.id, collab?.creatorId],
  );
  return { available: !!collab?.id && !!collab?.creatorId, end };
}

export const useEndCollaboration =
  process.env.EXPO_PUBLIC_HOST_PIPELINE_BACKEND === "convex" ? useConvexEnd : useNone;
