import { scale, searchFoods } from "./foods";
import type { Food, SourceCode } from "./types";
import type { SnapItemT } from "./snap";

const CUISINE_SRC: Record<SnapItemT["cuisine"], SourceCode[]> = {
  Indian: ["IN"], French: ["FR"], American: ["US", "SR"], Other: [],
};

export interface Matched {
  item: SnapItemT;
  candidates: Food[];
  chosen: Food | null;      // null = use the photo estimate as is
  grams: number;
}

/** Look each photo item up in the food database; keep up to 5 candidates. */
export function matchItem(item: SnapItemT): Matched {
  const prefer = CUISINE_SRC[item.cuisine];
  const seen = new Set<string>();
  const candidates: Food[] = [];
  const queries = [item.local_name, ...item.search_terms, item.name].filter((q) => q && q.trim());
  for (const q of queries) {
    for (const f of searchFoods(q, { limit: 4, prefer })) {
      if (!seen.has(f.id)) { seen.add(f.id); candidates.push(f); }
      if (candidates.length >= 5) break;
    }
    if (candidates.length >= 5) break;
  }
  let chosen: Food | null = candidates[0] ?? null;
  // If the table value is wildly different from what the model saw, don't trust the match blindly.
  if (chosen && item.kcal > 0) {
    const k = scale(chosen, item.grams).kcal;
    if (k > item.kcal * 2.5 || k < item.kcal / 2.5) chosen = null;
  }
  return { item, candidates, chosen, grams: Math.max(1, Math.round(item.grams)) };
}

export function photoFood(item: SnapItemT): Food {
  const g = Math.max(1, item.grams);
  const per = (x: number) => Math.round((x / g) * 1000) / 10;
  return {
    id: "photo:" + item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
    alt: item.local_name,
    src: "MY",
    group: "Photo estimate",
    kcal: per(item.kcal),
    protein: per(item.protein_g),
    carbs: per(item.carbs_g),
    fat: per(item.fat_g),
    fibre: null,
    portions: [],
  };
}
