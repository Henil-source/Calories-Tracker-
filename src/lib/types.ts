export type SourceCode = "IN" | "FR" | "US" | "SR" | "OFF" | "MY";

export interface Portion { label: string; grams: number }

export interface Food {
  id: string;
  name: string;
  alt: string;        // second name (French name, local name)
  src: SourceCode;
  group: string;
  kcal: number;       // per 100 g
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fibre: number | null;
  portions: Portion[];
}

export type MealKey = "breakfast" | "morning" | "lunch" | "evening" | "dinner";

export interface LogEntry {
  id: string;
  day: string;        // local calendar day, YYYY-MM-DD
  meal: MealKey;
  foodId: string;
  name: string;
  grams: number;
  portionLabel: string;
  qty: number;
  kcal: number;       // totals for this entry, already scaled
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  via: "search" | "photo" | "quick" | "barcode";
  createdAt: string;  // ISO UTC
}

export type Sex = "female" | "male";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very";
export type GoalKind = "lose" | "maintain" | "gain";

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  targetKg: number;
  activity: Activity;
  goal: GoalKind;
  pace: number;        // kg per week, 0.25 / 0.5 / 0.75
  kcalOverride: number | null;
  cuisines: ("IN" | "FR" | "US")[];
}

export interface Settings {
  apiKey: string;
  model: string;
  onlineSearch: boolean;
  waterGoalMl: number;
}

export interface WeightEntry { day: string; kg: number }
export interface WaterEntry { day: string; ml: number }
