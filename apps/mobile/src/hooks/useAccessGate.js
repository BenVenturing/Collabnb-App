// Mirrors Collabnb Website/app/src/components/AccessGate.jsx's useAccessGate —
// same Convex query (api.gates.getMyAccess), same shared backend, so trial/
// limited state is identical between web and mobile.

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useAccessGate(profile) {
  const access = useQuery(
    api.gates.getMyAccess,
    profile?._id ? { profileId: profile._id } : "skip"
  );

  if (!profile || !access) return { loading: true, state: "pending", canAccess: false };

  return {
    loading: false,
    state: access.state,
    canAccess: access.canAccess,
    isFounder: access.isFounder,
    tier: access.tier,
    track: access.track,
    daysLeft: access.daysLeft,
    trialEndsAt: access.trialEndsAt,
    role: access.role,
    isVerified: access.isVerified,
    isAdmin: access.isAdmin,
    subscriptionStatus: access.subscriptionStatus,
  };
}

export default useAccessGate;
