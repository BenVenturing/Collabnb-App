// Server sync for the host Proposals CRM, behind a build-time flag so the app
// is unchanged until the Convex functions in convex-drafts/ are deployed.
//
//   EXPO_PUBLIC_HOST_PIPELINE_BACKEND=convex   -> read/write api.hostCollaborations
//   anything else (default)                    -> no-op; local pipeline only
//
// The flag is constant for a bundle, so picking the hook at module load keeps
// the rules of hooks intact.

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { collabToProposal } from "@/utils/hostPipeline";
import { creatorPatchFor } from "@/utils/collabStages";

const noRemote = { remote: [], loading: false, setStage: async () => false, saveDetails: async () => false, saveContract: async () => false };
function useLocalOnly() { return noRemote; }

function useConvexPipeline() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const hostId = profile?._id ? String(profile._id) : null;

  const rows = useQuery(api.hostCollaborations.getByHost, hostId ? { hostId } : "skip");
  const setStageCvx = useMutation(api.hostCollaborations.setStage);
  const saveDetailsCvx = useMutation(api.hostCollaborations.saveDetails);
  const saveContractCvx = useMutation(api.hostCollaborations.saveContract);

  const remote = useMemo(() => (rows || []).map(collabToProposal), [rows]);

  return {
    remote,
    loading: hostId != null && rows === undefined,
    // Resolve true if the server took the change, false if it was local-only.
    setStage: async (proposal, crmStage) => {
      const patch = creatorPatchFor(crmStage);
      if (!proposal.convexId || !patch || !hostId) return false;
      await setStageCvx({ id: proposal.convexId, hostId, ...patch });
      return true;
    },
    // `contract` is the next { history, signatures, locked } (see utils/contract.js).
    saveContract: async (proposal, contract) => {
      if (!proposal.convexId || !hostId) return false;
      await saveContractCvx({ id: proposal.convexId, role: "host", profileId: hostId, contract: JSON.stringify(contract) });
      return true;
    },
    saveDetails: async (proposal, fields) => {
      if (!proposal.convexId || !hostId) return false;
      await saveDetailsCvx({
        id: proposal.convexId,
        hostId,
        host_note: fields.note,
        stay_dates: fields.stayDates,
        deliverables: fields.deliverables,
      });
      return true;
    },
  };
}

export const useHostPipeline =
  process.env.EXPO_PUBLIC_HOST_PIPELINE_BACKEND === "convex" ? useConvexPipeline : useLocalOnly;
