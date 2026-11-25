# Collabnb iOS widgets (parked until after launch)

Three WidgetKit widgets in one extension. Nothing here is built until step 1.

| Widget | Kind | For | Sizes |
| --- | --- | --- | --- |
| Next collab | `NextCollab` | Creators | small, medium, lock screen |
| Today at a glance | `HostGlance` | Hosts | small, medium, lock screen |
| Collab tracker | `CollabTracker` | Both | medium, lock screen |

## Activate

1. `npx expo install @bacons/apple-targets`, then add `"@bacons/apple-targets"` to `plugins` in `app.json`.
2. In the Apple Developer portal, create the App Group `group.com.collabnb.app` and enable it on `com.collabnb.app`. Add the same group to the main app's `ios.entitlements` in `app.json`:
   `"com.apple.security.application-groups": ["group.com.collabnb.app"]`
3. Move `widgetSync.js` to `src/utils/widgetSync.js`.
4. Call `syncWidgets(...)` wherever the data changes:
   - Creator: after the collabs query loads (next upcoming stay, deliverables done/total, deadline) and when a deliverable is submitted.
   - Host: from `useHostDashboard` (applicants, activeCollabs) plus `useConversations().unreadCount`.
   - Both: the current collab's stage for the tracker.
   - Call `clearWidgets()` on sign-out.
5. `npx expo prebuild --clean -p ios`, then build in Xcode. The widget target appears as `CollabnbWidgets`.

## Deep links

Taps open `collabnb://collabs/<id>` and `collabnb://host/dashboard`. Make sure expo-router resolves those paths (or adjust `widgetURL` in each Swift file).

## Notes

- iOS 17+ (uses `containerBackground`).
- No listing photos yet. Widgets can't load remote URLs, so a photo would have to be downloaded into the App Group container first.
- `CollabTracker`'s stage model is the one the Dynamic Island Live Activity should reuse.
