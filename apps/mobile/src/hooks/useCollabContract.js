// Creator-side contract state for one collaboration.
//
//   EXPO_PUBLIC_HOST_PIPELINE_BACKEND=convex -> contract lives on the Convex
//       collaboration row (api.hostCollaborations.saveContract); both parties
//       see each other's rounds and signatures.
//   default -> kept on this device in AsyncStorage so the flow can be tried
//       end to end before the backend exists.
//
// Constant per bundle, so choosing the hook at module load is rules-of-hooks safe.

import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { addRound, emptyContract, parseContract, sign } from "@/utils/contract";

const KEY = (id) => `@collabnb_contract_v1:${id}`;

function actions(contract, persist, role) {
  return {
    counter: async (fields, note) => persist(addRound(contract, { modifiedBy: role, fields, note })),
    sign: async (name) => persist(sign(contract, role, name)),
  };
}

function useLocalContract(collab) {
  const id = collab?.id;
  const [contract, setContract] = useState(emptyContract());
  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(KEY(id)).then((s) => s && setContract(parseContract(s))).catch(() => {});
  }, [id]);
  const persist = useCallback(async (next) => {
    setContract(next);
    await AsyncStorage.setItem(KEY(id), JSON.stringify(next)).catch(() => {});
  }, [id]);
  return { contract, ...actions(contract, persist, "creator") };
}

function useConvexContract(collab) {
  const save = useMutation(api.hostCollaborations.saveContract);
  const contract = useMemo(() => parseContract(collab?.contractRaw), [collab?.contractRaw]);
  const persist = useCallback(
    (next) => save({ id: collab.id, role: "creator", profileId: collab.creatorId, contract: JSON.stringify(next) }),
    [save, collab?.id, collab?.creatorId],
  );
  return { contract, ...actions(contract, persist, "creator") };
}

export const useCollabContract =
  process.env.EXPO_PUBLIC_HOST_PIPELINE_BACKEND === "convex" ? useConvexContract : useLocalContract;
