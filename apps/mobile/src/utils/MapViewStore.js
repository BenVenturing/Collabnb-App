import { create } from "zustand";

// Shared between the Explore screen (which owns the map UI) and the tab
// layout (which draws the bulge in the bar's silhouette and slides the bar
// down while the map is open). Session-only — nothing to persist.
const useMapViewStore = create((set) => ({
  // Whether Explore's fullscreen map is showing.
  mapOpen: false,
  // Explore sets this false when it has no mappable listings, so the bar
  // stays flat instead of bulging around a button that would do nothing.
  hasMapPoints: false,

  setMapOpen: (mapOpen) => set({ mapOpen }),
  setHasMapPoints: (hasMapPoints) => set({ hasMapPoints }),
}));

export default useMapViewStore;
