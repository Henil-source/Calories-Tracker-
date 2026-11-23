# Thalika

A free calorie tracker for Indian, French and American food. Android app and desktop app (Windows, macOS, Linux) from one codebase.

- **Daily diary** by meal with a calorie target worked out from your body and goal, calories left, protein, carbs and fat.
- **17,772 foods on the device**, per 100 g with household portions:
  - Indian Nutrient Databank (INDB): 1,014 Indian dishes
  - ANSES-CIQUAL: 3,341 French foods
  - USDA FNDDS survey foods: 5,624 American foods as eaten
  - USDA SR Legacy: 7,793 basic foods and ingredients
- **Photo estimate**: snap a plate, get each item with an estimated weight, matched to the food table, editable before saving. Uses your own Claude API key (set in Me).
- Packaged foods and barcodes from Open Food Facts (optional), quick calories, your own foods, water, weight, 7/30-day progress, backup/restore, delete everything.
- No account, no server. Your diary stays on your device.

| Diary | Photo estimate | Search |
|---|---|---|
| ![Diary](replica/clone-screens/S02-diary.png) | ![Photo](replica/clone-screens/S05-snap-review.png) | ![Search](replica/clone-screens/S03-add-food.png) |

## Get the app
Every push builds the apps in GitHub Actions. Open the latest **Build** run under the Actions tab and download:
- `thalika-android-apk`: unzip, copy the `.apk` to your phone, open it and allow "install unknown apps".
- `thalika-desktop-Windows` / `-macOS` / `-Linux`: installers (unsigned, so your OS will warn the first time).

Tag a version (`git tag v0.1.0 && git push --tags`) to get a draft GitHub release with all files attached.

## Develop
```bash
npm ci
npm run dev           # browser preview at http://localhost:5173
npm test              # unit tests
npm run build && npm run e2e   # end-to-end tests (Playwright)
npm run desktop       # run the desktop app
npm run android:sync  # copy the build into android/, then open android/ in Android Studio
```

### Rebuild the food table
```bash
scripts/fetch_sources.sh ../data-src      # downloads the open datasets
npm run db -- --src ../data-src           # writes public/data/foods.json
```

## Layout
- `src/`: the app (React + TypeScript). `src/lib/` has the logic: food search, targets, storage, photo estimate.
- `public/data/foods.json`: the food table.
- `android/`: Capacitor Android project. `electron/`: desktop shell.
- `scripts/`: data build, icons, screenshots.
- `replica/`: research and planning notes (recon, architecture, design, tests, parity, reviews, brand, launch, deploy).

## Licences
Code: MIT (`LICENSE`). Food data: see `DATA_LICENSES.md`. Privacy: `PRIVACY.md`.

Thalika is a food diary, not medical advice.
