import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";

// Mirrors the website's isHostVerified/isCreatorVerified logic (Settings.jsx,
// Profile.jsx) and Profile.jsx's reverification modal — requestReverification
// just flags the account for another admin look; it doesn't flip any status
// itself, so "verified" stays computed from host_verified/creator_verified.
export function useVerification() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const profileId = profile?._id ? String(profile._id) : null;

  const hostListings = useQuery(
    api.listings.getByHost,
    profileId && profile?.role === "host" ? { host_id: profileId } : "skip",
  );
  const requestReverificationMutation = useMutation(api.profiles.requestReverification);

  const hasListing = (hostListings?.length ?? 0) > 0;
  const isHostVerified =
    profile?.host_verified === true ||
    ((profile?.is_verified === true || profile?.is_founder === true) && hasListing);
  const isCreatorVerified = profile?.creator_verified === true;
  const isVerified = profile?.role === "host" ? isHostVerified : isCreatorVerified;

  const requestVerification = async () => {
    if (!profileId) throw new Error("Profile not loaded yet");
    return requestReverificationMutation({ profileId });
  };

  return {
    profile,
    isVerified,
    isLoading: profile === undefined,
    requestVerification,
  };
}
