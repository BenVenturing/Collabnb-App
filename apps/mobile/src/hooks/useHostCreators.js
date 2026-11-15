import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { mockCreators } from "@/data/mockCreators";
import { formatFollowers } from "@/utils/profileHelpers";

const HIDE_SAMPLES_KEY = "@collabnb:host_hide_sample_creators";

const MONOGRAM_MAX_BYTES = 30000;
const avatarChecks = new Map();

function clerkAvatarPayload(uri) {
  const payload = uri.split("img.clerk.com/")[1]?.split("?")[0];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

// Many avatars aren't photos, and the URL alone can't always tell: Clerk's
// generated initials are marked in its payload, but Google's letter avatars are
// only recognisable as small PNGs, and some stored images have since been
// deleted. A failed check keeps the avatar rather than hiding a real photo.
async function isRealPhoto(uri) {
  const clerk = clerkAvatarPayload(uri);
  if (clerk?.type === "default") return false;
  if (!clerk?.src) return true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(clerk.src, { method: "HEAD", signal: controller.signal });
    if (res.status === 404 || res.status === 403) return false;
    const isSmallPng =
      res.headers.get("content-type")?.includes("image/png") &&
      Number(res.headers.get("content-length")) < MONOGRAM_MAX_BYTES;
    return !(clerk.src.includes("oauth_google") && isSmallPng);
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

function checkAvatar(uri) {
  if (!avatarChecks.has(uri)) avatarChecks.set(uri, isRealPhoto(uri));
  return avatarChecks.get(uri);
}

// profiles.listPublicCreators returns the web app's creator-card shape. The
// mobile cards were built against data/mockCreators, so real creators are
// mapped onto that shape rather than rewriting every card, deck and modal
// that reads it.
function toCardShape(creator, realPhotos) {
  const avatarUri = creator.avatar && realPhotos?.get(creator.avatar) !== false ? creator.avatar : null;
  return {
    hasPhoto: !!avatarUri,
    id: creator.id,
    name: creator.name,
    username: creator.username,
    avatarUri,
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
  const [realPhotos, setRealPhotos] = useState(null);

  // Held behind isLoading so cards don't reshuffle after they've appeared.
  useEffect(() => {
    if (!realRaw) return;
    let cancelled = false;
    const uris = [...new Set(realRaw.map((c) => c.avatar).filter(Boolean))];
    Promise.all(uris.map(checkAvatar)).then((results) => {
      if (!cancelled) setRealPhotos(new Map(uris.map((uri, i) => [uri, results[i]])));
    });
    return () => {
      cancelled = true;
    };
  }, [realRaw]);

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

  // Most complete profiles first: a real photo, then reach, then collab history.
  const realCreators = useMemo(
    () =>
      (realRaw ?? [])
        .map((creator) => toCardShape(creator, realPhotos))
        .sort(
          (a, b) =>
            Number(b.hasPhoto) - Number(a.hasPhoto) ||
            b.followerCount - a.followerCount ||
            b.completedCollabs - a.completedCollabs,
        ),
    [realRaw, realPhotos],
  );

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
    isLoading: realRaw === undefined || realPhotos === null,
    hideSamples,
    toggleHideSamples,
  };
}

export default useHostCreators;
