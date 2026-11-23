# Deploy

**Nothing goes live without Henil's go.** Henil owns the Google Play developer account, any signing keys and any store listing.

## Preflight (2026-11-23)
| Check | Status |
|---|---|
| e2e suite green (14/14 runs) | pass locally; CI result on the PR |
| No open S1/S2 | pass |
| All must-haves done | pass (15/15) |
| Rebrand sweep clean | pass (0 hits) |
| Listing within limits, no avoided names | pass |
| Production build passes | pass locally (`npm run build`); APK and installers build in CI |
| Privacy policy | `PRIVACY.md` in the repo; needs a public URL for Play (GitHub Pages or the repo link) |
| Terms | to write before a public launch |
| Account deletion works | pass (in-app, on device) |
| Icon, title, splash are ours | pass (placeholder mark, see brand.md logo brief) |
| Tested on a real Android phone | **not yet** |

## How builds are made
GitHub Actions (`.github/workflows/build.yml`) on every push and PR:
- `test`: unit + e2e + a11y.
- `android`: `npx cap sync android` then `./gradlew assembleDebug`. Artifact: `thalika-android-apk` (debug-signed APK, installable by sideloading).
- `desktop`: Windows `.exe`, macOS `.dmg`, Linux `.AppImage` (unsigned). Artifacts per OS.
- Pushing a tag like `v0.1.0` also creates a **draft** GitHub release with all files attached.

## Google Play (when Henil decides)
1. Create an upload keystore on your own computer: `keytool -genkey -v -keystore thalika-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`. Keep it out of the repo.
2. Add repo secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, then add a signed `bundleRelease` step (ask Claude to wire it).
3. Play Console: create the app, fill the Data safety form (data stays on device; photos sent to Anthropic only when the user taps Estimate; search words to Open Food Facts), content rating, target audience 18+, privacy policy URL.
4. Upload the `.aab` to **Internal testing** first.

## Desktop
Unsigned installers trigger SmartScreen (Windows) and Gatekeeper (macOS) warnings. Signing needs an Apple Developer ID and a Windows code-signing certificate, both bought by Henil.

## Watch after release
Crash reporting (to add), Play Console vitals, reviews. Do the core flow on a phone and on desktop after each release.
