# Anything App 2.0: TestFlight + App Store + Convex Plan

## Snapshot (May 9, 2026)
- Monorepo includes `apps/mobile` (Expo + EAS) and `apps/web`.
- Mobile app currently has generic Expo metadata and is not App Store-ready.
- Convex is not wired in code/dependencies yet.
- Web and mobile still reference existing create/proxy-style env patterns.

## 1) Mobile Release Readiness (Blockers First)
1. Set production app identity in `apps/mobile/app.json`.
2. Add iOS metadata:
   - `ios.bundleIdentifier` (final App Store identifier)
   - `ios.buildNumber` (string, increment each TestFlight upload)
   - `ios.infoPlist` usage descriptions for any protected APIs used by app
3. Confirm branding assets:
   - app icon
   - splash
   - App Store listing screenshots
4. Verify `eas.json` production profile and run:
   - `eas build --platform ios --profile production`
   - `eas submit --platform ios --profile production`

## 2) Apple Account / App Store Connect Prereqs
1. Ensure Apple Developer Program is active.
2. Create app record in App Store Connect with same bundle identifier.
3. Fill App Privacy, age rating, and export compliance.
4. Add TestFlight internal testers first, then external group if needed.

## 3) Convex Migration Path (Safe Incremental)
1. Add Convex client dependencies in both apps.
2. Add env values:
   - mobile: `EXPO_PUBLIC_CONVEX_URL`
   - web: `VITE_CONVEX_URL`
3. Introduce backend provider flag:
   - mobile/web: `*_BACKEND_PROVIDER` (`create` -> `convex`)
4. Migrate feature slices in order:
   - auth/session glue
   - listings read paths
   - messaging/conversations
   - write operations (applications, saves, host listing edits)
5. Cut over provider flag to `convex` only after parity checks pass.

## 4) Web Domain Continuity (`www.colabn.com`)
1. Keep current domain pointed to active production web deploy.
2. During migration, use staging env/domain for Convex branch validation.
3. Swap production env to Convex only after:
   - auth success paths verified
   - read/write parity verified
   - monitoring in place

## 5) Immediate Next Execution (Recommended)
1. Finalize production values for iOS bundle identifier + app display name.
2. I update `app.json` and `eas.json` for production/TestFlight-safe config.
3. I wire Convex client bootstrap in both apps behind env provider flags.
4. We run one production iOS build and fix any signing/runtime issues.
