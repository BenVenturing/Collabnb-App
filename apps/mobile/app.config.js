// Layered on top of app.json so the Android Google Maps key can come from
// .env (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) instead of being hardcoded into a
// file that's committed to git. iOS needs no key — react-native-maps uses
// Apple Maps there by default.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || undefined,
      },
    },
  },
});
