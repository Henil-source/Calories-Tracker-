import type { Activity, Profile } from "./types";

const ACTIVITY: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 };
export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Mostly sitting",
  light: "Light: on my feet sometimes, exercise 1 to 3 days",
  moderate: "Moderate: exercise 3 to 5 days",
  active: "Active: hard exercise 6 to 7 days",
  very: "Very active: physical job or training twice a day",
};

/** Mifflin-St Jeor resting energy, kcal/day. */
export function bmr(p: Pick<Profile, "sex" | "weightKg" | "heightCm" | "birthYear">, year = new Date().getFullYear()) {
  const age = year - p.birthYear;
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + (p.sex === "male" ? 5 : -161);
}

export function tdee(p: Profile) {
  return bmr(p) * ACTIVITY[p.activity];
}

/** Daily calorie target. 1 kg of body fat is about 7,700 kcal. Never below a safe floor. */
export function dailyTarget(p: Profile): number {
  if (p.kcalOverride && p.kcalOverride > 0) return Math.round(p.kcalOverride);
  const base = tdee(p);
  const delta = (p.pace * 7700) / 7;
  const raw = p.goal === "lose" ? base - delta : p.goal === "gain" ? base + delta : base;
  const floor = p.sex === "male" ? 1500 : 1200;
  return Math.round(Math.max(raw, floor) / 10) * 10;
}

/** Macro targets in grams: 20% protein, 50% carbs, 30% fat by energy. */
export function macroTargets(kcal: number) {
  return { protein: Math.round((kcal * 0.2) / 4), carbs: Math.round((kcal * 0.5) / 4), fat: Math.round((kcal * 0.3) / 9) };
}

export function bmi(kg: number, cm: number) {
  const m = cm / 100;
  return Math.round((kg / (m * m)) * 10) / 10;
}
