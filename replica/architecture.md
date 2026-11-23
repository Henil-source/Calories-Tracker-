# Architecture

## Stack
| Part | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript, Vite 8 | One codebase for phone and desktop; fast builds |
| Android | Capacitor 8 (WebView shell, `android/`) | Ships the same build as a real APK; camera via the system picker |
| Desktop | Electron (`electron/main.cjs`) + electron-builder | Windows .exe, macOS .dmg, Linux AppImage from CI |
| Data | `localStorage` on the device, versioned key `thalika.v1` | No account, no server, works offline. Backup/restore as JSON |
| Food table | `public/data/foods.json`, built by `scripts/build_food_db.py` | 17,772 foods, 2.9 MB (500 KB gzipped), loaded once, searched in memory |
| Packaged foods | Open Food Facts public API (optional, user toggle) | Barcodes and brands the open tables don't have |
| Photo estimate | Claude API, called from the device with the user's own key (`@anthropic-ai/sdk`, structured output) | No backend to run or pay for; user controls cost and privacy |
| Icons, fonts | Lucide (ISC), system font stack | Open, nothing licensed |
| Tests | Vitest (logic), Playwright + axe (flows, a11y) | |
| CI | GitHub Actions: test, APK, desktop installers, draft release on tags | |

The usual default stack (Next.js, Postgres, Stripe, auth) is deliberately not used: the requested scope is a personal tracker with no accounts or payments, and a server would add cost, a privacy surface and a deploy step with no user benefit in v1.

## Data model (on device)
```
State {
  profile: { name, sex, birthYear, heightCm, weightKg, targetKg, activity, goal, pace, kcalOverride, cuisines[] }
  settings: { apiKey, model, onlineSearch, waterGoalMl }
  log: LogEntry[]      // { id, day (local YYYY-MM-DD), meal, foodId, name, grams, portionLabel, qty, kcal, protein, carbs, fat, fibre, via, createdAt (UTC ISO) }
  myFoods: Food[]      // custom, packaged (OFF) and photo-estimate foods, so entries stay editable
  recent: string[]     // food ids
  weights: { day, kg }[]
  water: { day, ml }[]
}
Food { id, name, alt, src: IN|FR|US|SR|OFF|MY, group, kcal, protein, carbs, fat, fibre (per 100 g), portions[{label, grams}] }
```
Entries store their own totals, so a later change to the food table never rewrites history.

`schema.sql` sketches the Postgres tables for optional cloud sync later. v1 does not use it.

## "API" (module boundaries)
| Function | Does | Flow |
|---|---|---|
| `loadFoods()` / `searchFoods(q, {prefer})` | load table, ranked prefix search with cuisine preference, accent-insensitive | F02 |
| `offSearch(q)` / `offBarcode(code)` | Open Food Facts lookups | F02, F03 |
| `estimatePhoto({apiKey, model, base64, hint})` | one Messages API call, image + text in, typed JSON out | F04 |
| `matchItem(item)` | ground each photo item in the table (5 candidates, sanity check vs the model's own kcal) | F04 |
| `dailyTarget(profile)` | Mifflin-St Jeor x activity, +/- 7,700 kcal per kg x pace, floor 1,200 / 1,500 | F01 |
| `addEntries / replaceEntry / removeEntry / setWater / setWeight / exportJson / importJson / wipeAll` | the only writes | all |

## Photo estimate design
1. Photo is shrunk on the device to 1,280 px JPEG.
2. Claude (default `claude-opus-5-5`, effort `low`, server-side refusal fallback on) returns items with name, regional name, cuisine, search terms, estimated grams and its own kcal/macros, via a strict JSON schema.
3. Each item is looked up in the food table, preferring the item's cuisine. If the table's value for that weight is more than 2.5x off the model's estimate, the match is not auto-picked.
4. The user edits weights, switches matches or uses the raw photo estimate, then adds everything to one meal.

## The parts that bite
- **Time zones / DST:** entries are filed by the device's local calendar day; day arithmetic uses local noon. The diary rolls over at midnight if the app stays open.
- **Data quality:** source tables have odd rows (a few INDB serving sizes look wrong). Every food shows its source; users can edit amounts or make their own food.
- **Storage:** WebView localStorage is ~5-10 MB; a year of entries is well under 1 MB. Save errors show a banner. Backup to a file is one tap.
- **Keys on device:** the API key is stored in app storage on the device and excluded from backups. On a shared or rooted device it can be read; the Me screen says it's stored on the device.
- **Offline:** search, diary and progress work offline. Photo and online search need a connection and say so.
- **Deletion:** "Delete all my data" wipes everything on the device.

## Build order (as done)
1. Food table pipeline, search, unit tests.
2. Vertical slice: onboarding > diary > search > portion > entry.
3. Photo estimate with mocked API in tests.
4. Progress, water, weight, settings, backup, delete.
5. Android + desktop packaging, CI.
