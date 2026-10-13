import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { formatFollowers } from "@/utils/profileHelpers";

// Mobile's board has six columns; a pitch row only carries
// 'pending' | 'under_review' | 'approved' | 'declined'. The rest of the
// position comes from the collaboration the pitch is linked to, which is what
// actually advances as the work happens.
function deriveStage(pitch, collab) {
  if (pitch.status === "declined") return "declined";

  if (pitch.status === "approved") {
    const stage = collab?.current_stage;
    if (stage === "closed" || collab?.status === "completed" || collab?.status === "approved") {
      return "completed";
    }
    if (stage === "uploaded_tagged") return "live";
    return "confirmed";
  }

  // A counter in flight is a negotiation whichever side it's waiting on.
  if (pitch.status === "under_review" || pitch.counter_pending) return "negotiating";

  // A host-initiated pitch the creator hasn't answered is an invite; a
  // creator-initiated one is an application.
  return pitch.type === "pitch" ? "invited" : "applied";
}

// Contract history and signatures are stored as JSON strings on the pitch row.
function parseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * The host proposal board, backed by Convex. Replaces SAMPLE_PROPOSALS.
 */
export function useHostProposals() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const hostId = profile?._id ? String(profile._id) : null;

  const pitchesRaw = useQuery(api.pitches.getByHost, hostId ? { hostId } : "skip");
  const collabsRaw = useQuery(api.collaborations.getByHost, hostId ? { hostId } : "skip");
  const listingsRaw = useQuery(api.listings.getByHost, hostId ? { host_id: hostId } : "skip");

  const updateStatus = useMutation(api.pitches.updateStatus);
  const advanceStage = useMutation(api.collaborations.advanceStage);
  const sendCounterMutation = useMutation(api.pitches.sendCounter);
  const signContractMutation = useMutation(api.pitches.signContract);

  const collabsById = useMemo(() => {
    const map = new Map();
    (collabsRaw ?? []).forEach((c) => map.set(String(c._id), c));
    return map;
  }, [collabsRaw]);

  const proposals = useMemo(
    () =>
      (pitchesRaw ?? []).map((pitch) => {
        const collab = pitch.collaboration_id
          ? collabsById.get(String(pitch.collaboration_id))
          : null;
        return {
          id: String(pitch._id),
          collaborationId: pitch.collaboration_id ? String(pitch.collaboration_id) : null,
          creatorId: pitch.creator_id,
          creatorName: pitch.creator_name,
          handle: pitch.creator_username ? `@${pitch.creator_username}` : "",
          avatar: pitch.creator_avatar || null,
          tier: pitch.creator_tier || "UGC Beginner",
          followers: formatFollowers(pitch.creator_followers ?? 0),
          listing: pitch.listing_title || "Listing",
          listingId: pitch.listing_id,
          stage: deriveStage(pitch, collab),
          status: pitch.status,
          note: pitch.host_note || pitch.message || "",
          stayDates: collab?.dates || "",
          deliverables: collab?.deliverables || "",
          lastUpdate: relativeTime(pitch.created_at),
          counterPending: pitch.counter_pending || null,
          contractId: pitch.contract_id || null,
          threadKey: pitch.thread_key || null,
          contractHistory: parseJSON(pitch.contract_history, []),
          signatures: parseJSON(pitch.signatures, {}),
          locked: pitch.contract_locked === true,
          isSample: false,
        };
      }),
    [pitchesRaw, collabsById],
  );

  return {
    profile,
    hostId,
    proposals,
    listings: listingsRaw ?? [],
    isLoading: !!hostId && pitchesRaw === undefined,
    // The board's own actions. Declining and approving are pitch-level;
    // everything past approval advances the collaboration instead.
    approve: (id, note) => updateStatus({ id, status: "approved", hostNote: note }),
    decline: (id, note) => updateStatus({ id, status: "declined", hostNote: note }),
    review: (id, note) => updateStatus({ id, status: "under_review", hostNote: note }),
    // Writes only the note, by re-sending the status the pitch already has.
    saveNote: (id, status, note) => updateStatus({ id, status, hostNote: note }),
    advanceCollab: (collaborationId, nextStage) =>
      advanceStage({ id: String(collaborationId), nextStage }),
    sendCounter: (id, fields, note) =>
      sendCounterMutation({ id, fromParty: "host", fields, note }),
    signContract: (id, signerName) =>
      signContractMutation({ id, party: "host", signerName }),
  };
}

export default useHostProposals;
