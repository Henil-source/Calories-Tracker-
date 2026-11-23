# Recon: daily calorie tracking + photo estimates

Clean-room feature study of a popular Indian calorie-tracking app (called "the original" below; its name is kept out of the product). Only public pages were read, by hand. Nothing was copied: no code, copy, images, icons or data.

## Scope (agreed with Henil, 2026-11-23)
- **Slice:** the core loop: log what you eat every day against a calorie target, and estimate a meal from a photo.
- **Platforms:** Android phone app first, desktop app second. Not a website.
- **Food data:** strong in Indian, French and American food.
- **Users:** people in India and abroad who cook or eat a mix of Indian and Western food and want a quick daily number.
- **Out of slice:** coaching, paid diet plans, smart scale, GLP-1 programme, workouts, sleep, steps.

## Sources
| # | Source | URL | What it told us |
|---|---|---|---|
| 1 | Marketing site (given by Henil) | https://www.healthifyme.com/in/ | Feature list: calorie tracking, photo logging, meal journal, water, weight goals |
| 2 | App Store listing (IN) | https://apps.apple.com/in/app/id943712366 | Photo estimate shows kcal + protein/fat/carbs/fibre; gallery auto-logging; voice logging; 4.6 from 67k ratings; IAP price points |
| 3 | TechCrunch launch article, 2023-09-21 | https://techcrunch.com/2023/09/21/khosla-backed-healthifyme-introduces-ai-powered-image-recognition-for-indian-food/ | Photo flow: snap, recognise, tap items to add; 60-70% claimed accuracy at launch; thalis are hard; suggests matches when unsure |
| 4 | Trustpilot pages 1-2 | https://www.trustpilot.com/review/healthifyme.com | Complaints, mostly billing, refunds, coaching |
| 5 | App Store reviews mirror | https://justuseapp.com/en/app/943712366/healthifyme-weight-loss-plan/reviews | Praise for the food database, upsell nagging, missing items |

The user's own account was not used.

## Screens
| ID | Screen | How to reach | Purpose | Key components | States |
|---|---|---|---|---|---|
| S01 | Onboarding | first launch | body data, activity, goal, target | stepper, segmented control, radios, number fields | empty, invalid, filled |
| S02 | Diary (today) | tab 1 | calories left, macros, meals, water | ring, macro bars, meal cards, entry rows | empty day, filled, over target, past day |
| S03 | Add food | "Add" on a meal | search and pick | search box, tabs (results / recent / mine), food rows, source badges | loading list, no query, no results, results, online results, offline error |
| S04 | Portion | tap a food | amount, unit, meal | quantity, unit select, live totals | valid, invalid amount, edit mode with remove |
| S05 | Snap | tab 2 | photo to items to diary | camera / gallery, hint, item cards with weight + match, total | no key, no photo, photo, busy, error (key, rate, network, refused), no food found, review |
| S06 | Progress | tab 3 | 7/30-day calories, streak, weight | bar chart with goal line, stats, weight list | no data, some data |
| S07 | Me | tab 4 | profile, target, API key, backup, delete, data sources | form, key field, toggles | saved, invalid, confirm delete |
| S08 | Quick calories / New food / Barcode | from S03 | escape hatches | small sheets | valid, invalid, not found, offline |

## Flows (happy-path taps; the number to beat)
| ID | Goal | Screens | Taps in original (estimated from public walkthroughs) | Thalika |
|---|---|---|---|---|
| F01 | First-run setup | S01 | ~10 | 7 |
| F02 | Log a food by search | S02 > S03 > S04 | 4-5 | 4 (Add, type, pick, Add) |
| F03 | Quick calories | S03 > S08 | 4 | 4 |
| F04 | Log a meal from a photo | S05 | 3-4 + per-item taps | 4 (Snap, Take photo, Estimate, Add to diary) |
| F05 | See the week / log weight | S06 | 2 | 1-3 |
| F06 | Delete my data | S07 | not self-serve in app (support request) | 3 |

Edge cases noted: thalis with many katoris, hidden ghee/oil, foods not in the table, past days, crossing midnight, offline.

## Components
ring (calories left), macro bar, meal card, entry row, food row + source badge, bottom sheet (dialog), segmented control, choice card (radio/checkbox), primary / ghost / soft buttons, toast, notice (info / error), spinner, bar chart.

## Inferred data model (original)
| Entity | Fields | Evidence | Confidence |
|---|---|---|---|
| User profile | sex, age, height, weight, goal weight, activity | onboarding descriptions in listing | high |
| Food | name, per-serving kcal, macros, units | listing, reviews about database | high |
| Diary entry | day, meal, food, quantity, unit | listing | high |
| Photo log | image, recognised items, confirmed items | TechCrunch | medium |
| Water, weight logs | day, amount | marketing site | high |

## What can't be cloned (skip)
- Their food database and recognition model (owned data). Replaced with open data + Claude vision.
- Human coaches, diet plans, the AI coach persona (service and brand).
- Smart scale hardware, insurance partnership.

## Size
**M** for the slice (a few weeks to polish). The v1 here is the vertical slice plus every must-have.

## Summary
1. Core loop: set a target, log food by search or photo, see calories left.
2. 8 screens, 6 flows.
3. Hardest parts: a big multi-cuisine database with honest licences; photo portion estimates; shipping one codebase to Android and desktop.
4. Out of scope: coaching, plans, hardware, sync.
5. Next: architecture.
