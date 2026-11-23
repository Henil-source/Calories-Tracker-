import type { Food } from "./types";

/**
 * Open Food Facts (https://world.openfoodfacts.org), the open database of
 * packaged foods, ODbL licence. Only called when the user searches with
 * "online results" on, or looks up a barcode.
 */
const BASE = "https://world.openfoodfacts.org";

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
}

const n = (v: unknown): number | null => {
  const x = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
};

export function offToFood(p: OffProduct): Food | null {
  const nu = p.nutriments ?? {};
  let kcal = n(nu["energy-kcal_100g"]);
  if (kcal == null && n(nu["energy_100g"]) != null) kcal = Math.round((n(nu["energy_100g"]) as number) / 4.184);
  if (kcal == null || !p.code || !p.product_name) return null;
  const serving = n(p.serving_quantity);
  return {
    id: "off:" + p.code,
    name: p.product_name.trim(),
    alt: (p.brands ?? "").split(",")[0].trim(),
    src: "OFF",
    group: "Packaged food",
    kcal,
    protein: n(nu["proteins_100g"]),
    carbs: n(nu["carbohydrates_100g"]),
    fat: n(nu["fat_100g"]),
    fibre: n(nu["fiber_100g"]),
    portions: serving && serving > 0 ? [{ label: `1 serving (${p.serving_size ?? serving + " g"})`, grams: serving }] : [],
  };
}

const FIELDS = "code,product_name,brands,serving_size,serving_quantity,nutriments";

export async function offSearch(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Online search failed (${r.status})`);
  const j = (await r.json()) as { products?: OffProduct[] };
  return (j.products ?? []).map(offToFood).filter((f): f is Food => !!f);
}

export async function offBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 6) return null;
  const r = await fetch(`${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`, { signal });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Barcode lookup failed (${r.status})`);
  const j = (await r.json()) as { status?: number; product?: OffProduct };
  if (!j.product || j.status === 0) return null;
  return offToFood({ ...j.product, code: clean });
}
