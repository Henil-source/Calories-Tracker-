# Test plan

Automated: `npm test` (Vitest, 19 tests) and `npm run e2e` (Playwright, 7 specs x phone 390 px + desktop 1440 px = 14 runs). Every e2e run fails on any console error or 5xx, and runs axe (WCAG 2.1 AA) on each screen it visits.

| ID | Case | Where | Result 2026-11-23 |
|---|---|---|---|
| F01-H1 | Onboarding to diary with a target | e2e | pass |
| F01-N1 | Year 1800 rejected with a message | e2e | pass |
| F01-E1 | Target never below 1,200 / 1,500 kcal | unit | pass |
| F02-H1 | Search "idli", pick, 3 pieces, add, edit to 1, survives reload, remove | e2e | pass |
| F02-E1 | Nonsense query shows "No match" with next steps | e2e | pass |
| F02-E2 | Accents: "creme brulee" finds "Crème brûlée" | unit | pass |
| F02-E3 | Each cuisine found: idli, masala dosa, chapati, dal makhani, croissant, baguette, crepe, quiche lorraine, cheeseburger, pancakes, mac and cheese | unit | pass |
| F02-N1 | Amount 0 disables Save | e2e | pass |
| F03-H1 | Quick calories with emoji label; water glass | e2e | pass |
| F04-H1 | Photo: no-key state, invalid key text rejected, real key saved, photo > 2 items > edit weight > add to lunch | e2e (mocked API) | pass |
| F04-N2 | 401 from the API shows "key was rejected" with a settings button | e2e (mocked API) | pass |
| F05-H1 | Progress chart and weight log | e2e | pass |
| F06-H1 | Delete everything returns to onboarding and clears storage | e2e | pass |
| D-1 | Day arithmetic across month end and DST | unit | pass |
| L-1 | No horizontal scroll at 390 px | e2e | pass |

## Manual checks still to do (need a phone and a real key)
- Install the CI-built APK on an Android phone; take a photo with the camera button (the WebView must ask for camera permission).
- One real photo estimate with a real Claude key, for each cuisine (thali, croque-monsieur, burger plate).
- Desktop installers on Windows and macOS (unsigned, so the OS will warn on first open).
- Screen reader pass with TalkBack.
