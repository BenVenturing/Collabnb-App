export const IMG_FALLBACK = "https://images.unsplash.com/photo-1501183638710-841dd1904471?w=800";

export function compensationLabel(l) {
  const cash = l.cash_amount;
  if (typeof cash === "number" && cash > 0) {
    return cash >= 1000 ? `$${(cash / 1000).toFixed(cash % 1000 ? 1 : 0)}k` : `$${cash}`;
  }
  const m = String(l.compensation || "").match(/\$([\d,]+)/);
  if (m) return `$${m[1]}`;
  if (l.compensation_type === "hybrid") return "Hybrid";
  return l.collab_type || "Collab";
}

export function deliverablesLabel(l) {
  if (typeof l.deliverables === "string" && l.deliverables) return l.deliverables;
  if (l.deliverables_list?.length) {
    const parts = l.deliverables_list.slice(0, 2).map((d) => `${d.quantity}× ${d.type}`);
    return parts.join(", ");
  }
  if (l.deliverable_count) return `${l.deliverable_count} deliverables`;
  return "";
}

export function normalizeListing(l) {
  const images = l.gallery_images?.length ? l.gallery_images : l.image ? [l.image] : [];
  return {
    id: String(l._id),
    title: l.title,
    location: l.location,
    location_city: l.location_city,
    location_country: l.location_country,
    lat: typeof l.lat === "number" ? l.lat : undefined,
    lng: typeof l.lng === "number" ? l.lng : undefined,
    is_featured: l.is_featured === true,
    image: images[0] || IMG_FALLBACK,
    property_type: l.property_type || "",
    collab_type: l.collab_type || "",
    compensation: compensationLabel(l),
    deliverables: deliverablesLabel(l),
    host_name: l.host_name,
    rating: l.rating,
    review_count: l.review_count,
    isSample: l.is_sample === true,
  };
}
