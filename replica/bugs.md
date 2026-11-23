# Bugs

| ID | Sev | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| B1 | S3 | Search "pizza", pick INDB "Pizza" | a slice is ~100-150 g | source table says 1 slice = 297 g | open (source data). Users can pick 100 g or another match; reported as a data caveat |
| B2 | S3 | Search "plain dosa" | ~170-220 kcal/100 g | INDB lists 380.9 kcal/100 g | open (source data), same handling |
| B3 | S4 | Photo review on a phone | match name fully visible | long match names are cut off in the select | fixed: weight column narrowed to 96 px |
| B4 | S3 | Barcode on a phone | scan with the camera | digits must be typed | open, planned (needs a scanner plugin) |

No S1 or S2 bugs are open.

## To check
- Capacitor file input with `capture` on Android 14+ (camera permission prompt).
- Behaviour when the WebView clears storage under low disk.
