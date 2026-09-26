import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { normalizeListing } from "@/utils/listingHelpers";

// Backs the Saved tab and the save/heart toggle everywhere else with the
// real `collections` table (name, listing_ids, creator_id — see
// app/convex/collections.ts), replacing the old AsyncStorage-only SavedStore.
// A collection to save into is created lazily on first toggle rather than
// eagerly on load, so signed-in users with nothing saved don't get a stray
// empty "Saved" list.
export function useSavedCollections() {
  const { user, isSignedIn } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const creatorId = profile?._id ? String(profile._id) : null;

  const collectionsRaw = useQuery(api.collections.getByUser, creatorId ? { creatorId } : "skip");
  const convexListings = useQuery(api.listings.getAll, {});
  const sampleListings = useQuery(api.listings.getSamples);

  const createMutation = useMutation(api.collections.create);
  const toggleSaveMutation = useMutation(api.collections.toggleSave);
  const renameMutation = useMutation(api.collections.rename);
  const deleteMutation = useMutation(api.collections.deleteCollection);
  const moveToListingMutation = useMutation(api.collections.moveToListing);

  const collections = collectionsRaw || [];
  const isLoading = !!creatorId && collectionsRaw === undefined;

  const listingsById = useMemo(() => {
    const map = new Map();
    [...(convexListings || []), ...(sampleListings || [])].forEach((l) => {
      map.set(String(l._id), normalizeListing(l));
    });
    return map;
  }, [convexListings, sampleListings]);

  const savedIds = useMemo(() => {
    const ids = new Set();
    collections.forEach((c) => c.listing_ids.forEach((id) => ids.add(String(id))));
    return ids;
  }, [collections]);

  const isSaved = (listingId) => savedIds.has(String(listingId));

  async function toggleSaved(listingId) {
    if (!creatorId) return false;
    const id = String(listingId);
    let target = collections.find((c) => c.listing_ids.includes(id)) || collections[0];
    if (!target) {
      const newId = await createMutation({ name: "Saved", creatorId });
      target = { _id: newId };
    }
    await toggleSaveMutation({ collectionId: String(target._id), listingId: id });
    return true;
  }

  return {
    isSignedIn: !!isSignedIn,
    creatorId,
    collections,
    listingsById,
    savedIds,
    isLoading,
    isSaved,
    toggleSaved,
    createList: (name) => createMutation({ name, creatorId }),
    renameList: (id, name) => renameMutation({ id: String(id), name }),
    deleteList: (id) => deleteMutation({ id: String(id) }),
    toggleSaveInList: (collectionId, listingId) =>
      toggleSaveMutation({ collectionId: String(collectionId), listingId: String(listingId) }),
    moveToListing: (listingId, targetCollectionId) =>
      moveToListingMutation({ listingId: String(listingId), targetCollectionId: String(targetCollectionId) }),
  };
}

export default useSavedCollections;
