import { addFoods, getFood } from "./foods";
import { getState, update } from "./store";
import type { Food, LogEntry } from "./types";

/** The food behind an entry, or one rebuilt from the entry's own numbers if the food is gone. */
export function foodForEntry(e: LogEntry): Food {
  const f = getFood(e.foodId) ?? getState().myFoods.find((x) => x.id === e.foodId);
  if (f) return f;
  const k = e.grams > 0 ? 100 / e.grams : 0;
  const r = (x: number) => Math.round(x * k * 10) / 10;
  return { id: e.foodId, name: e.name, alt: "", src: "MY", group: "Logged", kcal: Math.round(e.kcal * k), protein: r(e.protein), carbs: r(e.carbs), fat: r(e.fat), fibre: r(e.fibre), portions: [] };
}

/** Keep foods that aren't in the bundled table (packaged, photo, custom) so they can be found and edited later. */
export function rememberFood(f: Food) {
  if (f.src !== "OFF" && f.src !== "MY") return;
  update((s) => ({ ...s, myFoods: [...s.myFoods.filter((x) => x.id !== f.id), f] }));
  addFoods([f]);
}
