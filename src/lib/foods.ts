import type { Food, Portion, SourceCode } from "./types";
import { norm, tokens } from "./text";

type Row = [string, string, string, SourceCode, string, number, number | null, number | null, number | null, number | null, [string, number][]];

export interface DbInfo { count: number; sources: Record<string, { name: string; by: string; url: string; licence: string }> }

let foods: Food[] = [];
let byId = new Map<string, Food>();
let index: { f: Food; hay: string; words: string[] }[] = [];
let info: DbInfo = { count: 0, sources: {} };
let loading: Promise<void> | null = null;

export function rowToFood(r: Row): Food {
  return {
    id: r[0], name: r[1], alt: r[2], src: r[3], group: r[4], kcal: r[5],
    protein: r[6], carbs: r[7], fat: r[8], fibre: r[9],
    portions: r[10].map(([label, grams]) => ({ label, grams })),
  };
}

export function setFoods(list: Food[], meta?: Partial<DbInfo>) {
  foods = list;
  byId = new Map(list.map((f) => [f.id, f]));
  index = list.map((f) => {
    const hay = norm(`${f.name} ${f.alt}`);
    return { f, hay, words: hay.split(" ") };
  });
  info = { count: list.length, sources: meta?.sources ?? info.sources };
}

export function addFoods(extra: Food[]) {
  const merged = foods.filter((f) => !extra.some((e) => e.id === f.id)).concat(extra);
  setFoods(merged);
}

export function loadFoods(url = "./data/foods.json"): Promise<void> {
  if (!loading) {
    loading = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Food list failed to load (${r.status})`);
        return r.json();
      })
      .then((j: { foods: Row[]; sources: DbInfo["sources"] }) => {
        setFoods(j.foods.map(rowToFood).concat(foods.filter((f) => f.src === "MY" || f.src === "OFF")), { sources: j.sources });
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}

export const getFood = (id: string) => byId.get(id);
export const dbInfo = () => info;

/**
 * Rank foods for a query. Every query word must prefix-match some word of the
 * name. Ties go to names that start with the query, then to the user's
 * preferred cuisines, then to shorter (more generic) names.
 */
export function searchFoods(q: string, opts: { limit?: number; prefer?: SourceCode[] } = {}): Food[] {
  const qt = tokens(q);
  if (!qt.length) return [];
  const qn = qt.join(" ");
  const prefer = opts.prefer ?? [];
  const scored: { f: Food; s: number }[] = [];
  for (const it of index) {
    let s = 0;
    let ok = true;
    for (const t of qt) {
      let best = 0;
      for (const w of it.words) {
        if (w === t) { best = 3; break; }
        if (w.startsWith(t)) best = Math.max(best, 2);
        else if (t.length > 3 && w.includes(t)) best = Math.max(best, 1);
      }
      if (!best) { ok = false; break; }
      s += best;
    }
    if (!ok) continue;
    if (it.hay.startsWith(qn)) s += 4;
    const nameN = norm(it.f.name);
    if (nameN === qn) s += 6;
    if (prefer.includes(it.f.src) || (it.f.src === "SR" && prefer.includes("US"))) s += 1.5;
    if (it.f.src === "MY") s += 3;
    if (it.f.portions.length) s += 0.5;
    s -= Math.min(it.words.length, 20) * 0.12;
    scored.push({ f: it.f, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, opts.limit ?? 40).map((x) => x.f);
}

export function defaultPortions(f: Food): Portion[] {
  const list = [...f.portions];
  list.push({ label: "100 g", grams: 100 });
  list.push({ label: "1 g", grams: 1 });
  return list;
}

export function scale(f: Food, grams: number) {
  const k = grams / 100;
  const r = (x: number | null) => Math.round((x ?? 0) * k * 10) / 10;
  return { kcal: Math.round(f.kcal * k), protein: r(f.protein), carbs: r(f.carbs), fat: r(f.fat), fibre: r(f.fibre) };
}

export const SOURCE_LABEL: Record<SourceCode, string> = {
  IN: "Indian", FR: "French", US: "American", SR: "USDA basic", OFF: "Packaged", MY: "My food",
};
