import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import useRoleStore from "@/utils/RoleStore";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";

export function useRoleSwitch() {
  const router = useRouter();
  const { setRole } = useRoleStore();
  const { hostApprovalStatus } = useHostOnboardingStore();
  const { creatorApprovalStatus } = useCreatorOnboardingStore();
  // The onboarding stores are per-device, so an account approved on the web (or
  // an admin) would otherwise be sent back through onboarding on a new phone or
  // simulator. Convex is the source of truth for approval.
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const { isAuthenticated: convexAuthed } = useConvexAuth();
  const profile = useQuery(api.profiles.getByEmail, email && convexAuthed ? { email } : "skip");

  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [pendingTargetRole, setPendingTargetRole] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const attemptRoleSwitch = async (targetRole) => {
    const serverApproved =
      profile?.is_admin === true ||
      (targetRole === "host" ? profile?.host_verified === true : profile?.creator_verified === true);
    const hostNotApproved =
      targetRole === "host" && !!profile && !serverApproved && profile.role !== "host";
    const targetApprovalStatus = serverApproved
      ? "approved"
      : hostNotApproved
        ? "not_submitted"
        : targetRole === "host" ? hostApprovalStatus : creatorApprovalStatus;

    if (targetApprovalStatus === "approved") {
      setIsSwitching(true);
      try {
        await setRole(targetRole);

        setTimeout(() => {
          setIsSwitching(false);

          if (targetRole === "host") {
            router.replace("/host/(tabs)/dashboard");
          } else {
            router.replace("/explore");
          }
        }, 400);
      } catch (error) {
        setIsSwitching(false);
        Alert.alert("Error", "Failed to switch roles. Please try again.");
      }
    } else if (targetApprovalStatus === "not_submitted") {
      setPendingTargetRole(targetRole);
      setShowRoleSwitchModal(true);
    } else if (targetApprovalStatus === "pending") {
      Alert.alert(
        `${targetRole === "host" ? "Host" : "Creator"} setup pending`,
        "Your application is under review. We'll notify you when you're approved.",
        [{ text: "OK" }],
      );
    }
  };

  const startOnboarding = () => {
    setShowRoleSwitchModal(false);
    if (pendingTargetRole === "host") {
      router.push("/host-onboarding/property");
    } else {
      router.push("/creator-onboarding/basic-info");
    }
  };

  return {
    showRoleSwitchModal,
    setShowRoleSwitchModal,
    pendingTargetRole,
    isSwitching,
    attemptRoleSwitch,
    startOnboarding,
  };
}
