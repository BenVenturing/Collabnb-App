// react-native-mmkv is pulled in transitively by @anythingai/app's dev
// scaffold menu (src/__create/anything-menu.ios.tsx, stubbed to an empty
// component in production builds — see metro.config.js). Nothing in the
// actual app imports it, and its native C++ code doesn't compile against
// React Native 0.81's bridging headers, so it's excluded from autolinking
// on both platforms rather than pulling in a native module nobody uses.
module.exports = {
  dependencies: {
    "react-native-mmkv": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
