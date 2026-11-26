import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The sign-in screen greets a returning user with their photo and trial
// countdown, so the last signed-in profile is kept on the phone.
export const LAST_USER_KEY = "@collabnb:last_user";

export function useRememberLastUser(profile, access) {
  useEffect(() => {
    if (!profile?._id || !access || access.loading) return;
    AsyncStorage.setItem(
      LAST_USER_KEY,
      JSON.stringify({
        name: profile.full_name || "",
        avatar: profile.avatar_url || null,
        state: access.state,
        trialEndsAt: access.trialEndsAt || null,
      }),
    ).catch(() => {});
  }, [profile?._id, profile?.full_name, profile?.avatar_url, access?.state, access?.trialEndsAt, access?.loading]);
}

export function useLastUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(LAST_USER_KEY)
      .then((raw) => raw && setUser(JSON.parse(raw)))
      .catch(() => {});
  }, []);
  return user;
}
