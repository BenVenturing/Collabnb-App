// Contract state for one collaboration, for either party.
//
//   EXPO_PUBLIC_HOST_PIPELINE_BACKEND=convex -> the REAL contracts table. The
//       same row the website reads, so signing here sets creator_signed /
//       host_signed, stamps the timestamp, links the contract to the collab
//       and fires the other party's push + email, exactly as signing on web
//       does. There is no phone-only contract.
//   default -> kept on this device in AsyncStorage, for trying the flow
//       without a backend.
//
// Constant per bundle, so choosing the hook at module load is rules-of-hooks safe.
//
// The contracts table stores the agreed terms as columns, not as rounds, so a
// real contract shows as a single round here. Counters overwrite the terms and
// clear BOTH signatures, which is the same rule the local model uses: new
// terms invalidate earlier signatures.

import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
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
  return { contract, ...actions(contract, persist, "creator"), isReal: false, exists: true };
}

// Terms that have a column on the contracts table. The rest are carried in
// summary_note rather than dropped, so a counter never silently loses a term.
const COLUMN_FIELDS = { compensation: "payment", deliverables: "deliverables", extra_terms: "usage_rights" };
const NOTE_FIELDS = ["nights", "turnaround", "affiliate"];
const NOTE_MARK = "— phone terms —";

function noteBlock(fields, note) {
  const lines = NOTE_FIELDS.filter((k) => fields[k]).map((k) => `${k}: ${fields[k]}`);
  const body = [note?.trim(), lines.length ? `${NOTE_MARK}\n${lines.join("\n")}` : ""]
    .filter(Boolean)
    .join("\n\n");
  return body.slice(0, 2000);
}

function fieldsFromNote(summaryNote) {
  const out = {};
  const idx = (summaryNote || "").indexOf(NOTE_MARK);
  if (idx === -1) return out;
  summaryNote
    .slice(idx + NOTE_MARK.length)
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^\s*(nights|turnaround|affiliate):\s*(.+)$/);
      if (m) out[m[1]] = m[2].trim();
    });
  return out;
}

// A contracts row rendered in the shape ContractSection expects.
function toContractShape(row) {
  if (!row) return emptyContract();
  const fields = {
    nights: "",
    compensation: row.payment || "",
    deliverables: row.deliverables || "",
    turnaround: "",
    affiliate: "",
    extra_terms: row.usage_rights || "",
    ...fieldsFromNote(row.summary_note),
  };
  const signatures = {};
  if (row.creator_signed) {
    signatures.creatorSignature = row.creator_name || "Creator";
    signatures.creatorSignedAt = row.creator_signed_at || "";
  }
  if (row.host_signed) {
    signatures.hostSignature = row.host_name || "Host";
    signatures.hostSignedAt = row.host_signed_at || "";
  }
  return {
    history: [{ version: 1, modifiedBy: "host", fields, note: row.summary_note || "" }],
    signatures,
    locked: !!(row.creator_signed && row.host_signed),
  };
}

function makeConvexHook(role) {
  return function useRealContract(collab) {
    const profileId = collab?.[role === "host" ? "hostId" : "creatorId"] ?? collab?.creatorId;
    const rows = useQuery(api.contracts.getForParty, profileId ? { userId: String(profileId) } : "skip");
    const update = useMutation(api.contracts.update);

    const row = useMemo(() => {
      if (!rows || !collab?.contractId) return null;
      return rows.find((c) => String(c._id) === String(collab.contractId)) || null;
    }, [rows, collab?.contractId]);

    const contract = useMemo(() => toContractShape(row), [row]);

    const requireRow = () => {
      if (!row) {
        throw new Error("The host hasn't created the contract for this collab yet.");
      }
      return row;
    };

    return {
      contract,
      // No contract row yet means there is nothing real to sign. The card says
      // so rather than letting the phone invent a contract with no payment
      // terms, which is what the fee pipeline reads.
      exists: !!row,
      isReal: true,
      counter: async (fields, note) => {
        const r = requireRow();
        const updates = { summary_note: noteBlock(fields, note) };
        for (const [key, column] of Object.entries(COLUMN_FIELDS)) {
          if (fields[key] !== undefined) updates[column] = String(fields[key]).slice(0, 2000);
        }
        // New terms invalidate both signatures, same as the local model. Each
        // party may only clear their own flag through contracts.update, so the
        // other side's is cleared only when it was actually set.
        if (r.creator_signed && role === "creator") updates.creator_signed = false;
        if (r.host_signed && role === "host") updates.host_signed = false;
        await update({ id: String(r._id), updates });
      },
      sign: async (name) => {
        const r = requireRow();
        if ((name || "").trim().length < 2) throw new Error("Type your full name to sign");
        await update({
          id: String(r._id),
          updates: role === "host" ? { host_signed: true } : { creator_signed: true },
        });
      },
    };
  };
}

const convex = process.env.EXPO_PUBLIC_HOST_PIPELINE_BACKEND === "convex";
export const useCollabContract = convex ? makeConvexHook("creator") : useLocalContract;
export const useHostContract = convex ? makeConvexHook("host") : useLocalContract;
