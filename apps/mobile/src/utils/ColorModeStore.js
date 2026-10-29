import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyColorMode } from "@/config/theme";

const MODE_KEY = "@collabnb_color_mode_v1";

export const COLOR_MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

let mode = "light";
let dark = false;
const listeners = new Set();

const resolve = (m) =>
  m === "system" ? Appearance.getColorScheme() === "dark" : m === "dark";

function commit(nextMode) {
  mode = nextMode;
  const nextDark = resolve(nextMode);
  const changed = nextDark !== dark;
  dark = nextDark;
  applyColorMode(dark);
  if (changed) listeners.forEach((cb) => cb(dark));
}

Appearance.addChangeListener(() => {
  if (mode === "system") commit("system");
});

// Call once before the first render so there is no light flash on a dark device.
export async function initColorMode() {
  try {
    const saved = await AsyncStorage.getItem(MODE_KEY);
    commit(saved || "light");
  } catch {
    commit("light");
  }
}

export const getColorMode = () => mode;
export const isDark = () => dark;
export const statusBarStyle = () => (dark ? "light" : "dark");

export async function setColorMode(next) {
  commit(next);
  listeners.forEach((cb) => cb(dark));
  try {
    await AsyncStorage.setItem(MODE_KEY, next);
  } catch (error) {
    console.error("Failed to save color mode:", error);
  }
}

export function useColorMode() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  return { mode, isDark: dark, setMode: setColorMode };
}
