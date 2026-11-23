# Parity

## Feature score (by hand from features.csv)
Weights must 3, should 2, could 1; partial = half; `skip` rows and rows the original doesn't have are left out.

| Priority | Rows counted | Done | Points |
|---|---|---|---|
| must | 15 | 15 | 45 / 45 |
| should | 8 | 8 | 16 / 16 |
| could | 5 | 0.5 (barcode is partial) | 0.5 / 5 |
| **Total** | | | **61.5 / 66 = 93%** |

Must-haves: 15 of 15. Missing, in build order: camera barcode scanning, reminders, gallery auto-logging, voice logging, cloud sync.

Extra rows the original doesn't have (not scored): desktop app, backup/restore, delete-all in app, no account, no upsell or ads, source shown on every food.

## Layout
Same structure as the category norm (ring summary on top, meals as cards, centre camera tab). Different look: green/saffron palette, our own icon, plain wording. No pixel matching was attempted.

## Behaviour
| Flow | Original | Thalika | Keep / fix |
|---|---|---|---|
| F01 setup | ~10 taps, account sign-up | 7 taps, no account | keep |
| F02 log by search | 4-5 taps | 4 | keep |
| F04 photo | snap, tap items | snap, estimate, review, add (4) + edits | keep; every item editable before saving |
| F06 delete data | via support | 3 taps in app | keep |
| Data remembered | cloud account | this device; backup file | sync is a later option |

## Verdict
**Shippable** for a beta: all must-haves, score 93, no open S1/S2. It becomes "better than the original" on the axes reviewers complain about (no subscription or upsell, data stays on the device, delete in app), but that claim still needs real users. Not yet verified on a physical Android phone.

## Round 2 update (23 Nov 2026)
- Photo logging (F04) was removed at the owner's request; parity for it no longer applies.
- New: custom daily limit, metric/imperial, recipe builder from raw ingredients, cuisine filter with Korean/Japanese/Chinese/Thai/Vietnamese and more. These match HealthifyMe's "set your own goal", unit switch, "create recipe" and regional cuisine coverage at feature level.
