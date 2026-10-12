jest.mock("expo-glass-effect", () => {
  const React = require("react"); const { View } = require("react-native");
  return { GlassView: (p) => React.createElement(View, p), GlassContainer: (p) => React.createElement(View, p), isLiquidGlassAvailable: () => true };
});
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-blur", () => { const { View } = require("react-native"); return { BlurView: View }; });
jest.mock("react-native-reanimated", () => {
  const m = require("react-native-reanimated/mock");
  return { ...m, useReducedMotion: () => false, runOnJS: (f) => f, withSpring: (v) => v, withTiming: (v) => v };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("convex/react", () => ({ useMutation: () => jest.fn(), useQuery: () => undefined }));
