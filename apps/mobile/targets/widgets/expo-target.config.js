// Inert until @bacons/apple-targets is installed and added to app.json plugins.
// See README.md in this folder.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: "widget",
  name: "CollabnbWidgets",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  entitlements: {
    "com.apple.security.application-groups": ["group.com.collabnb.app"],
  },
  colors: {
    $accent: "#2d6a4f",
    $widgetBackground: "#F6F3EE",
  },
});
