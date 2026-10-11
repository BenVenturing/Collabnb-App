import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_LIST_KEY = "@collabnb:saved_last_list";

/**
 * SaveToastStore — the "Saved to <list>" confirmation and the list it targets.
 *
 * Airbnb files a save straight into the list you used last and confirms it with
 * a dismissible toast, rather than interrupting the browse with a picker every
 * time. The list id has to outlive the session for that to feel right, so it
 * persists; the toast itself is transient.
 */
const useSaveToastStore = create((set, get) => ({
  lastListId: null,
  isLastListReady: false,

  // { listingId, listId, listName, saved } — null when nothing is showing.
  toast: null,
  pickerListingId: null,

  loadLastList: async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_LIST_KEY);
      set({ lastListId: stored || null, isLastListReady: true });
    } catch {
      set({ isLastListReady: true });
    }
  },

  rememberList: async (listId) => {
    const id = listId ? String(listId) : null;
    if (get().lastListId === id) return;
    set({ lastListId: id });
    try {
      if (id) await AsyncStorage.setItem(LAST_LIST_KEY, id);
    } catch {}
  },

  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null }),

  openPicker: (listingId) =>
    set({ pickerListingId: listingId ? String(listingId) : null, toast: null }),
  closePicker: () => set({ pickerListingId: null }),
}));

export default useSaveToastStore;
