import AsyncStorage from "@react-native-async-storage/async-storage";

// Shared with app/host/(tabs)/proposals.jsx — keep this key in sync.
const STORAGE_KEY = "@collabnb_proposals_v1";

function creatorHandle(name) {
  return `@${(name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

// Called when a host invites/messages a creator about a listing (from the
// Discover Creators screen) so it shows up in the Proposals pipeline's
// "Invited" column instead of only living in the message thread.
export async function addInvitedProposal({ creator, listing }) {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const proposals = stored ? JSON.parse(stored) : [];

    const alreadyInvited = proposals.some(
      (p) => p.creatorId === creator.id && p.listingId === listing.id,
    );
    if (alreadyInvited) return null;

    const proposal = {
      id: `p_${Date.now()}_${creator.id}`,
      creatorId: creator.id,
      creatorName: creator.name,
      handle: creatorHandle(creator.name),
      tier: creator.tier,
      followers: creator.followers,
      listing: listing.title,
      listingId: listing.id,
      stage: "invited",
      note: "",
      stayDates: "",
      deliverables: "",
      lastUpdate: "just now",
    };

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([proposal, ...proposals]),
    );
    return proposal;
  } catch (error) {
    console.error("Failed to add invited proposal:", error);
    return null;
  }
}
