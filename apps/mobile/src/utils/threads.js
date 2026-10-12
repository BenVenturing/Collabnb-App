// The Convex message-thread key for an application. The creator's apply flow
// creates the thread under this key (listing-detail.jsx), so both parties can
// open the same conversation from a collab / proposal without a lookup.
export const threadKeyFor = (listingId, creatorId) =>
  listingId && creatorId ? `thread_${listingId}_${creatorId}` : null;
