const webAppUrl = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/$/, "");

export const isWebCatalogConfigured = Boolean(webAppUrl);

export async function getWebListings(filters = {}) {
  if (!webAppUrl) {
    throw new Error(
      "Set EXPO_PUBLIC_BASE_URL to the web app URL to load the Collabnb catalog.",
    );
  }

  const params = new URLSearchParams();
  const values = {
    q: filters.query,
    id: filters.id,
    deliverables: filters.deliverables?.join(","),
    compensation: filters.compensation?.join(","),
    tier: filters.tier || "ugc",
    load: filters.load,
    nearby: filters.nearby ? "true" : "",
    sort: filters.sort || "best",
    minValue: filters.minValue,
    maxValue: filters.maxValue,
    deliverableCount: filters.deliverableCount,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`${webAppUrl}/api/listings?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status}).`);
  }

  const payload = await response.json();
  return payload.listings || [];
}

export async function getWebListing(id) {
  const listings = await getWebListings({ id });
  return listings[0] || null;
}
