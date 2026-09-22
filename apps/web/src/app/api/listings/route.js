import { getTierRank, mockListings } from "@/data/mockListings";

const csv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Temporary catalog contract shared by the web and native clients.
 *
 * The data remains the web app's source of truth until listings move to the
 * database. Keeping the filtering here prevents the RN client from quietly
 * evolving a different definition of a "best match".
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const requestedId = searchParams.get("id");
  const deliverables = csv(searchParams.get("deliverables"));
  const compensation = csv(searchParams.get("compensation"));
  const tier = searchParams.get("tier") || "ugc";
  const load = searchParams.get("load") || "";
  const nearby = searchParams.get("nearby") === "true";
  const sort = searchParams.get("sort") || "best";
  const deliverableCount = searchParams.get("deliverableCount") || "";
  const minValue = Number(searchParams.get("minValue")) || 0;
  const maxValue = Number(searchParams.get("maxValue")) || Infinity;

  const listings = mockListings
    .filter((listing) => {
      if (requestedId && String(listing.id) !== requestedId) return false;
      if (
        query &&
        ![
          listing.title,
          listing.location_city,
          listing.location_country,
        ].some((value) => value.toLowerCase().includes(query))
      ) {
        return false;
      }
      if (nearby && listing.location_tag !== "nearby") return false;
      if (
        deliverables.length &&
        !deliverables.every((item) => listing.deliverables_supported.includes(item))
      ) {
        return false;
      }
      if (getTierRank(listing.min_creator_tier) > getTierRank(tier)) return false;
      if (compensation.length && !compensation.includes(listing.compensation_type)) return false;
      if (load && listing.deliverable_load !== load) return false;
      if (deliverableCount) {
        const [minimum, maximum] = deliverableCount.split("-").map(Number);
        const count = listing.deliverables_supported.length;
        if (maximum ? count < minimum || count > maximum : count < minimum) return false;
      }
      return listing.value_score >= minValue && listing.value_score <= maxValue;
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "value") return b.value_score - a.value_score;

      const valueDifference = b.value_score - a.value_score;
      if (valueDifference) return valueDifference;
      const deliverableDifference =
        deliverables.filter((item) => b.deliverables_supported.includes(item)).length -
        deliverables.filter((item) => a.deliverables_supported.includes(item)).length;
      if (deliverableDifference) return deliverableDifference;
      return (
        Math.abs(getTierRank(a.min_creator_tier) - getTierRank(tier)) -
        Math.abs(getTierRank(b.min_creator_tier) - getTierRank(tier))
      );
    });

  return Response.json({ listings, total: listings.length }, { headers: corsHeaders });
}
