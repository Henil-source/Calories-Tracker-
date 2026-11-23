# Components and contrast

Tokens live in `src/styles/tokens.css` (CSS variables; no Tailwind in this project, so there is no Tailwind mapping file). Icons: Lucide. No fonts are bundled; the system stack is used.

## Contrast (WCAG, computed 2026-11-23)
| Pair | Light | Dark | Needs |
|---|---|---|---|
| text on bg | 15.38 | 15.81 | 4.5 |
| text on surface | 16.54 | – | 4.5 |
| text-muted on surface / surface-2 | 6.46 / 5.66 | 7.48 / 6.68 | 4.5 |
| on-accent on accent (buttons) | 6.08 | 8.57 | 4.5 |
| accent on surface (links, ghost buttons) | 6.08 | 7.66 | 4.5 |
| accent on accent-soft (soft buttons) | 5.22 | 5.81 | 4.5 |
| danger on surface | 6.57 | 7.44 | 4.5 |
| warm on warm-soft (Indian badge) | 4.81 | 7.49 | 4.5 |
| border-input on surface | 3.72 | 5.19 | 3 |
| focus ring on bg | 5.40 | 8.91 | 3 |
All pass. axe (WCAG 2.1 AA) runs on every screen in the e2e suite with zero violations.

## Specs
| Component | Variants | States | A11y | Screens |
|---|---|---|---|---|
| Button | primary, ghost, soft, danger, sm, block | hover, focus-visible, disabled | real `<button>`, 44 px min height | all |
| Ring | – | under, over (danger colour) | decorative SVG; numbers are text | S02 |
| Bar | protein, carbs, fat, water | 0-100% | `role=progressbar` with values | S02 |
| Sheet | – | open; Esc and backdrop close; focus trapped and restored | `role=dialog`, `aria-modal`, labelled | S04, S08, S07 |
| Seg (segmented) | – | pressed | `aria-pressed` buttons in a labelled group | S01, S03, S06, S07 |
| Choice card | radio, checkbox | checked (`:has`) | native input inside label | S01, S07 |
| Food row | with/without portion | hover | one button per row, source badge text | S03 |
| Entry row | – | – | button with full name + kcal label | S02 |
| Notice | info, error, ok | – | `role=alert` for errors | S03, S05, app |
| Toast | – | auto-hides 2.6 s | mirrored into a polite live region | all |
| Chart | 7 / 30 days | over-target bars | `role=img` with a text summary | S06 |
