import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";

const COMP_LABELS = {
  free_stay: "Complimentary Stay",
  paid: "Paid Collab",
  hybrid: "Stay + Cash",
};

// Deliverable load is a rough band for the dashboard card. Web shows the raw
// deliverable list instead; a phone card has room for one word.
function deliverableLoad(count) {
  if (!count) return "Light";
  if (count <= 3) return "Light";
  if (count <= 7) return "Moderate";
  return "Heavy";
}

/**
 * Real listings for the host dashboard, with per-listing applicant, confirmed
 * and completed counts derived from the host's pitches and collaborations.
 */
export function useHostDashboard() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const hostId = profile?._id ? String(profile._id) : null;

  const listingsRaw = useQuery(api.listings.getByHost, hostId ? { host_id: hostId } : "skip");
  const pitchesRaw = useQuery(api.pitches.getByHost, hostId ? { hostId } : "skip");
  const collabsRaw = useQuery(api.collaborations.getByHost, hostId ? { hostId } : "skip");

  const updateListing = useMutation(api.listings.update);

  const listings = useMemo(() => {
    const pitches = pitchesRaw ?? [];
    const collabs = (collabsRaw ?? []).filter((c) => c.is_sample !== true);

    return (listingsRaw ?? []).map((listing) => {
      const id = String(listing._id);
      const forListing = pitches.filter((p) => String(p.listing_id) === id);
      const collabsFor = collabs.filter((c) => String(c.listing_id) === id);

      const images = (listing.images ?? [])
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter(Boolean);

      return {
        id,
        title: listing.title,
        location:
          listing.location ||
          [listing.location_city, listing.location_country].filter(Boolean).join(", "),
        tierRequired: listing.creator_tier || listing.tier || "Any tier",
        compType: COMP_LABELS[listing.compensation_type] || listing.compensation || "Collab",
        status: listing.status || "unpublished",
        applicants: forListing.filter(
          (p) => p.status === "pending" || p.status === "under_review",
        ).length,
        confirmed: forListing.filter((p) => p.status === "approved").length,
        completed: collabsFor.filter(
          (c) => c.current_stage === "closed" || c.status === "completed",
        ).length,
        deliverablesLoad: deliverableLoad(listing.deliverables?.length),
        photos: images.length
          ? images.map((uri) => ({ type: "image", uri }))
          : [{ type: "gradient" }],
      };
    });
  }, [listingsRaw, pitchesRaw, collabsRaw]);

  return {
    hostId,
    listings,
    hasRealListings: listings.length > 0,
    isLoading: !!hostId && listingsRaw === undefined,
    setListingStatus: (id, status) => updateListing({ id, status }),
  };
}

export default useHostDashboard;
