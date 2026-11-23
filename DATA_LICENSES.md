# Food data sources and licences

`public/data/foods.json` is built by `scripts/build_food_db.py` from these sources. Values are copied as published (per 100 g); nothing is invented.

| Code | Source | Publisher | Licence | Where the build got it |
|---|---|---|---|---|
| IN | Indian Nutrient Databank (INDB), 1,014 recipes | Lindsay Jaacks and colleagues; described in *Current Developments in Nutrition*, 2024 | Published as an open-access resource. The GitHub repository has no LICENSE file, so **confirm reuse terms with the authors before any commercial release.** Cite the paper. | https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB- (`INDB.xlsx`) |
| FR | ANSES-CIQUAL French food composition table, 2025 | ANSES | Licence Ouverte / Etalab 2.0 (attribution) | https://ciqual.anses.fr/ via data.gouv.fr; this build used a JSON mirror: https://github.com/OlivierFitter/ciqual_2025_complete |
| US | USDA FNDDS survey foods, FoodData Central release 2022-10-28 | USDA Agricultural Research Service | Public domain (CC0) | https://fdc.nal.usda.gov/download-datasets ; build used the official JSON as mirrored at https://github.com/sukiboo/nutrition_info |
| SR | USDA SR Legacy (April 2018) | USDA Agricultural Research Service | Public domain (CC0) | https://fdc.nal.usda.gov/download-datasets ; build used the official ASCII files as mirrored at https://github.com/cokegoddo/caloriebase |
| OFF | Open Food Facts (live lookups only, not bundled) | Open Food Facts contributors | ODbL 1.0 (database), DbCL (contents) | https://world.openfoodfacts.org |

Attribution is shown in the app under Me > About the food data.

Notes
- Raw Indian ingredients from the ICMR-NIN Indian Food Composition Tables (IFCT 2017) are **not** included: that table is not openly licensed. Raw ingredients come from USDA instead.
- A few source rows look odd (for example INDB lists one pizza slice as 297 g). They are kept as published; the app shows the source so users can judge.
