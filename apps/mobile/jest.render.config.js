// Render smoke tests for the collab-flow components: `npm run test:render`.
// Separate from the package.json "jest" preset so they don't run with (or break)
// anything else; native modules and Convex are stubbed in tests/render/setup.js.
module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/render/*.test.jsx"],
  moduleNameMapper: {
    "^@/convex/(.*)$": "<rootDir>/tests/render/stubs/convex.js",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|nativewind|react-native-reanimated|react-native-worklets|react-native-gesture-handler))",
  ],
  setupFiles: ["<rootDir>/tests/render/setup.js"],
};
