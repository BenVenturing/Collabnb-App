import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { mockCreators } from "@/data/mockCreators";
import { formatFollowers } from "@/utils/profileHelpers";

const HIDE_SAMPLES_KEY = "@collabnb:host_hide_sample_creators";

// profiles.listPublicCreators returns the web app's creator-card shape. The
// mobile cards were built against data/mockCreators, so real creators are
// mapped onto that shape rather than rewriting every card, deck and modal
// that reads it.
function toCardShape(creator) {
  return {
    id: creator.id,
    name: creator.name,
    username: creator.username,
    avatarUri: creator.avatar || null,
    tier: creator.tier,
    followers: formatFollowers(creator.followers ?? 0),
    followerCount: creator.followers ?? 0,
    tags: creator.niches ?? [],
    location: creator.location || null,
    bio: creator.bio || "",
    engagement: creator.engagement ?? 0,
    completedCollabs: creator.completed_collab_count ?? 0,
    isFounder: creator.isFounder === true,
    instagramHandle: creator.instagram_handle,
    tiktokHandle: creator.tiktok_handle,
    youtubeHandle: creator.youtube_handle,
    // No real source for these yet. Left undefined rather than faked so the
    // cards fall back to hiding the row instead of claiming availability.
    availability: undefined,
    travelPlans: creator.travelCalendar ?? [],
    isSample: false,
  };
}

/**
 * The host-side creator directory. Real verified creators first, then the
 * sample pool — same ordering as web's HostCreators, which keeps the samples
 * as filler while the marketplace is thin but never above a real person.
 */
export function useHostCreators() {
  const realRaw = useQuery(api.profiles.listPublicCreators);
  const [hideSamples, setHideSamples] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HIDE_SAMPLES_KEY)
      .then((v) => setHideSamples(v === "1"))
      .catch(() => {});
  }, []);

  const toggleHideSamples = useCallback(() => {
    setHideSamples((current) => {
      const next = !current;
      AsyncStorage.setItem(HIDE_SAMPLES_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
  }, []);

  const realCreators = useMemo(() => (realRaw ?? []).map(toCardShape), [realRaw]);

  const samples = useMemo(
    () => mockCreators.map((c) => ({ ...c, isSample: true })),
    [],
  );

  const creators = useMemo(
    () => (hideSamples ? realCreators : [...realCreators, ...samples]),
    [realCreators, samples, hideSamples],
  );

  return {
    creators,
    realCreators,
    hasRealCreators: realCreators.length > 0,
    isLoading: realRaw === undefined,
    hideSamples,
    toggleHideSamples,
  };
}

export default useHostCreators;
