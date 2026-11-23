import type { LogEntry, MealKey } from "./types";

export const MEALS: { key: MealKey; label: string; share: number }[] = [
  { key: "breakfast", label: "Breakfast", share: 0.25 },
  { key: "morning", label: "Morning snack", share: 0.1 },
  { key: "lunch", label: "Lunch", share: 0.3 },
  { key: "evening", label: "Evening snack", share: 0.1 },
  { key: "dinner", label: "Dinner", share: 0.25 },
];
export const mealLabel = (k: MealKey) => MEALS.find((m) => m.key === k)!.label;

export function totals(entries: LogEntry[]) {
  return entries.reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat, fibre: a.fibre + e.fibre }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
  );
}
