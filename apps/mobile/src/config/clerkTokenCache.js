import * as SecureStore from "expo-secure-store";

// Clerk's expected token cache shape (getToken/saveToken/clearToken).
export const clerkTokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Non-critical — session just won't persist across app restarts
    }
  },
  async clearToken(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Non-critical
    }
  },
};

export default clerkTokenCache;
