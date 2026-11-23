# Build log
- 2026-11-23: Food table pipeline (`scripts/build_food_db.py`): INDB 1,014 + CIQUAL 3,341 + FNDDS 5,624 + SR Legacy 7,793 = 17,772 foods. Spot-checked butter (717 kcal, matches USDA), idli, dosa, croissant, baguette, hamburger.
- 2026-11-23: Vertical slice: onboarding > diary > search > portion > entry. Then photo estimate (Claude, structured output), progress, water, weight, Me (key, backup, restore, delete), quick calories, custom food, Open Food Facts search and typed barcode.
- 2026-11-23: Capacitor Android project, Electron desktop shell, icons drawn by `scripts/make_icons.py`, GitHub Actions for APK and installers.
- 2026-11-23: Renamed Platewise > Thalika after a name check found "Plate Wise" meal planning on the App Store.
- Every label and message was written fresh. Nothing was loaded from the original's domain. Screens are in `clone-screens/` (390 px, 2x).

## Round 2 (23 Nov 2026): kcal tracking focus

Feedback from the owner after installing the APK, and what changed:

| Feedback | Change |
|---|---|
| Remove the photo part | Snap tab, Claude photo estimate, API key settings, CAMERA permission, `@anthropic-ai/sdk` and `zod` removed. The centre tab is now **Add food** (picks the meal by time of day). Old diaries with photo entries still open. |
| Phone back button exits the app | `@capacitor/app` `backButton` listener with a back stack (`src/lib/back.ts`): open sheet closes first, then Add food / New recipe, then other tabs go to the diary, and only then the app exits. |
| Back arrow hidden under the status bar | Capacitor 8 SystemBars sets `--safe-area-inset-*`; the CSS now pads `.main`, sheets, tab bar and toasts with them (fallback `env()`). |
| Wants a 1,600 kcal limit instead of the 2,200 suggestion | "Daily calorie limit" picker (suggested vs own limit, 800 to 6,000) in onboarding, in Me, and as a sheet from the diary's target. The diary says "Daily limit" when it is the user's own. |
| More cuisines (Korean, Japanese, Chinese...) | Cuisine tag on every food plus filter chips; 42 world dishes computed from USDA ingredients; cuisine preferences widened to 13. |
| Metric or imperial | Units toggle; ft+in and lb inputs; everything stored metric. |
| Add raw ingredients when a dish is missing | "Build from ingredients": ingredient search (raw USDA basics ranked first, optional Open Food Facts), amount and unit per ingredient, servings, live kcal per serving, saved to My foods with edit and delete. |

Tests: 44 unit, 18 e2e (phone + desktop, axe clean).
