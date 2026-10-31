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

function timeOf(row) {
  const t = row.created_at ? new Date(row.created_at).getTime() : NaN;
  return Number.isFinite(t) ? t : row._creationTime || 0;
}

// Exclusive end timestamps of the last n calendar months, oldest first.
function lastMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (n - 2 - i), 1).getTime(),
  );
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
  // Until the host has listings of their own, the shared sample listings fill
  // the dashboard so it never opens empty.
  const samplesRaw = useQuery(api.listings.getSamples);
  const showingSamples = !listingsRaw?.length;
  const sourceListings = showingSamples ? samplesRaw : listingsRaw;

  const updateListing = useMutation(api.listings.update);
  const removeListing = useMutation(api.listings.deleteListing);

  const listings = useMemo(() => {
    const pitches = pitchesRaw ?? [];
    const collabs = (collabsRaw ?? []).filter((c) => c.is_sample !== true);

    return (sourceListings ?? []).map((listing) => {
      const id = String(listing._id);
      const forListing = pitches.filter((p) => String(p.listing_id) === id);
      const collabsFor = collabs.filter((c) => String(c.listing_id) === id);

      const gallery = listing.gallery_images?.length
        ? listing.gallery_images
        : listing.image
          ? [listing.image]
          : [];
      const images = gallery
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
        isSample: listing.is_sample === true,
        applicants: forListing.filter(
          (p) => p.status === "pending" || p.status === "under_review",
        ).length,
        confirmed: forListing.filter((p) => p.status === "approved").length,
        completed: collabsFor.filter(
          (c) => c.current_stage === "closed" || c.status === "completed",
        ).length,
        deliverablesLoad: deliverableLoad(listing.deliverables?.length),
        photos: images.map((uri) => ({ type: "image", uri })),
      };
    });
  }, [sourceListings, pitchesRaw, collabsRaw]);

  const realCollabs = (collabsRaw ?? []).filter((c) => c.is_sample !== true);
  const isOpen = (c) =>
    c.current_stage !== "closed" &&
    !["completed", "cancelled", "declined"].includes(c.status);
  const activeCollabs = realCollabs.filter(isOpen).length;

  const activity = useMemo(() => {
    const items = [
      ...(pitchesRaw ?? [])
        .filter((p) => p.status === "pending" || p.status === "under_review")
        .map((p) => ({
          id: `p_${p._id}`,
          kind: "applied",
          text: `${p.creator_name || "A creator"} applied to ${p.listing_title || "your listing"}`,
          at: timeOf(p),
        })),
      ...realCollabs.map((c) => ({
        id: `c_${c._id}`,
        kind: isOpen(c) ? "collab" : "completed",
        text: isOpen(c)
          ? `${c.creator_name || "A creator"} · ${c.property_name || "collab"}`
          : `${c.creator_name || "A creator"} completed their collab`,
        detail: c.status_text || c.dates,
        at: timeOf(c),
      })),
    ];
    return items.sort((a, b) => b.at - a.at).slice(0, 5);
  }, [pitchesRaw, collabsRaw]);

  const impact = useMemo(() => {
    const months = lastMonths(6);
    const approved = (pitchesRaw ?? []).filter((p) => p.status === "approved");
    const submissions = (c) => {
      try {
        const parsed = JSON.parse(c.deliverable_submissions || "[]");
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    };
    // Running total at the end of each of the last six months.
    const series = (rows, value) =>
      months.map((end) =>
        rows.filter((r) => timeOf(r) < end).reduce((n, r) => n + value(r), 0),
      );
    const firstSeen = new Map();
    realCollabs
      .slice()
      .sort((a, b) => timeOf(a) - timeOf(b))
      .forEach((c) => {
        if (c.creator_id && !firstSeen.has(c.creator_id)) firstSeen.set(c.creator_id, c);
      });

    return {
      collabs: series(realCollabs, () => 1),
      creators: series([...firstSeen.values()], () => 1),
      content: series(realCollabs, submissions),
      reach: series(approved, (p) => p.creator_followers || 0),
      monthLabels: months.map((end) =>
        new Date(end - 1).toLocaleString("en-US", { month: "short" }),
      ),
    };
  }, [pitchesRaw, collabsRaw]);

  return {
    hostId,
    listings,
    activeCollabs,
    activity,
    impact,
    hasRealListings: !showingSamples,
    isLoading: !!hostId && listingsRaw === undefined,
    // Sample listings are shared with every host, so they are never changed.
    setListingStatus: (id, status) =>
      showingSamples ? Promise.resolve() : updateListing({ id, status }),
    deleteListing: (id) => (showingSamples ? Promise.resolve() : removeListing({ id })),
  };
}

export default useHostDashboard;
