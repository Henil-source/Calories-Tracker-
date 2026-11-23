import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { defaultPortions, scale, SOURCE_LABEL } from "../lib/foods";
import { MEALS } from "../lib/meals";
import type { Food, LogEntry, MealKey } from "../lib/types";
import { Sheet } from "./ui";

/** Pick portion and quantity for a food, then add it (or save changes to an existing entry). */
export default function PortionSheet({ food, meal, entry, onAdd, onDelete, onClose }: {
  food: Food; meal: MealKey; entry?: LogEntry;
  onAdd: (x: { grams: number; label: string; qty: number; meal: MealKey }) => void;
  onDelete?: () => void; onClose: () => void;
}) {
  const portions = useMemo(() => defaultPortions(food), [food]);
  const initial = entry ? Math.max(0, portions.findIndex((p) => p.label === entry.portionLabel)) : 0;
  const [pi, setPi] = useState(initial);
  const [qtyText, setQtyText] = useState(String(entry?.qty ?? (portions[0].grams === 1 ? 100 : 1)));
  const [m, setM] = useState<MealKey>(entry?.meal ?? meal);
  const qty = Number(qtyText.replace(",", "."));
  const valid = Number.isFinite(qty) && qty > 0 && qty <= 5000;
  const grams = valid ? portions[pi].grams * qty : 0;
  const t = scale(food, grams);

  return (
    <Sheet title={entry ? "Edit food" : "Choose amount"} onClose={onClose}>
      <div className="stack">
        <div>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-lg)" }}>{food.name}</div>
          {food.alt && <div className="muted small">{food.alt}</div>}
          <div className="row small muted" style={{ marginTop: 4, flexWrap: "wrap" }}>
            <span className={`badge ${food.src}`}>{SOURCE_LABEL[food.src]}</span>
            <span>{food.kcal} kcal per 100 g</span>
          </div>
        </div>
        <div className="grid2">
          <label className="field">Amount
            <input className="input num" inputMode="decimal" value={qtyText} onChange={(e) => setQtyText(e.target.value)} aria-invalid={!valid} aria-describedby={!valid ? "qty-err" : undefined} />
          </label>
          <label className="field">Portion
            <select className="input" value={pi} onChange={(e) => { const i = Number(e.target.value); setPi(i); if (portions[i].grams === 1 && qty < 5) setQtyText("100"); }}>
              {portions.map((p, i) => <option key={i} value={i}>{p.label}{p.grams !== 1 && p.label !== "100 g" ? ` (${p.grams} g)` : ""}</option>)}
            </select>
          </label>
        </div>
        {!valid && <span className="field-err" id="qty-err">Enter an amount above 0.</span>}
        <label className="field">Meal
          <select className="input" value={m} onChange={(e) => setM(e.target.value as MealKey)}>
            {MEALS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </label>
        <div className="card" style={{ background: "var(--surface-2)", boxShadow: "none" }} aria-live="polite">
          <div className="row between"><span className="muted small">{Math.round(grams)} g</span><span className="num" style={{ fontSize: "var(--fs-xl)", fontWeight: 700 }}>{t.kcal} kcal</span></div>
          <div className="row between small num muted" style={{ marginTop: 6 }}>
            <span>Protein {t.protein} g</span><span>Carbs {t.carbs} g</span><span>Fat {t.fat} g</span>
          </div>
        </div>
        <div className="row">
          {entry && onDelete && <button className="btn danger ghost" onClick={onDelete}><Trash2 size={18} /> Remove</button>}
          <button className="btn grow" disabled={!valid} onClick={() => onAdd({ grams, label: portions[pi].label, qty, meal: m })}>
            {entry ? "Save" : `Add to ${MEALS.find((x) => x.key === m)!.label.toLowerCase()}`}
          </button>
        </div>
        <p className="xs muted" style={{ margin: 0 }}>Values come from {sourceLong(food)}.</p>
      </div>
    </Sheet>
  );
}

export function sourceLong(f: Food) {
  switch (f.src) {
    case "IN": return "the Indian Nutrient Databank (INDB)";
    case "FR": return "the ANSES-CIQUAL French food composition table";
    case "US": return "USDA FNDDS survey foods";
    case "SR": return "USDA SR Legacy";
    case "OFF": return "Open Food Facts (packaged product label)";
    case "RC": return "a typical home recipe, computed from USDA SR Legacy ingredients";
    default: return f.recipe ? `your recipe (${f.recipe.items.length} ingredients, ${f.recipe.servings} serving${f.recipe.servings === 1 ? "" : "s"})` : f.group === "Photo estimate" ? "a photo estimate" : "a food you added";
  }
}

export function makeEntry(food: Food, x: { grams: number; label: string; qty: number; meal: MealKey }, day: string, via: LogEntry["via"], id: string): LogEntry {
  const t = scale(food, x.grams);
  return { id, day, meal: x.meal, foodId: food.id, name: food.name, grams: Math.round(x.grams * 10) / 10, portionLabel: x.label, qty: x.qty, ...t, via, createdAt: new Date().toISOString() };
}
