import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Globe, Search, Trash2 } from "lucide-react";
import { offSearch } from "../lib/off";
import { defaultPortions, getFood, recipeTotals, searchFoods, SOURCE_LABEL } from "../lib/foods";
import { uid, useStore } from "../lib/store";
import { rememberFood } from "../lib/entryFood";
import { useBackHandler } from "../lib/back";
import type { Food } from "../lib/types";

interface Item { key: string; food: Food; qty: string; pi: number }

/**
 * Build a dish that isn't in the database from its raw ingredients. The dish
 * is saved as one of "My foods" with a "1 serving" portion, so it can be
 * logged like any other food.
 */
export default function RecipeBuilder({ initialName, editing, ready, onClose, onSaved }: {
  initialName: string; editing?: Food; ready: boolean; onClose: () => void; onSaved: (f: Food) => void;
}) {
  const profile = useStore((s) => s.profile);
  const online = useStore((s) => s.settings.onlineSearch);
  const [web, setWeb] = useState<{ state: "idle" | "loading" | "done" | "error"; foods: Food[] }>({ state: "idle", foods: [] });
  const [name, setName] = useState(editing?.name ?? initialName);
  const [servings, setServings] = useState(String(editing?.recipe?.servings ?? 1));
  const [items, setItems] = useState<Item[]>(() => (editing?.recipe?.items ?? []).map((it) => {
    const food = getFood(it.foodId) ?? { id: it.foodId, name: it.name, alt: "", src: "MY", group: "", kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, portions: [] } as Food;
    const ps = defaultPortions(food);
    const gi = ps.findIndex((p) => p.label === "1 g");
    return { key: uid(), food, qty: String(it.grams), pi: gi };
  }));
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useBackHandler(onClose);
  useEffect(() => { setWeb({ state: "idle", foods: [] }); }, [q]);
  const searchWeb = async () => {
    setWeb({ state: "loading", foods: [] });
    try { setWeb({ state: "done", foods: await offSearch(q.trim()) }); } catch { setWeb({ state: "error", foods: [] }); }
  };

  const results = useMemo(() => (ready && q.trim().length >= 2 ? searchFoods(q, { limit: 8, prefer: profile?.cuisines ?? [], basics: true }) : []), [q, ready, profile]);

  const grams = (it: Item) => {
    const n = Number(it.qty.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n * defaultPortions(it.food)[it.pi].grams : 0;
  };
  const rows = items.map((it) => ({ it, g: grams(it) }));
  const t = recipeTotals(rows.map((r) => ({ food: r.it.food, grams: r.g })));
  const sv = Number(servings);
  const svOk = Number.isFinite(sv) && sv >= 1 && sv <= 100;
  const per = (x: number) => (svOk ? x / sv : 0);

  const addIngredient = (f: Food) => {
    const ps = defaultPortions(f);
    const usePortion = f.portions.length > 0;
    setItems([...items, { key: uid(), food: f, qty: usePortion ? "1" : "100", pi: usePortion ? 0 : ps.findIndex((p) => p.label === "1 g") }]);
    setQ("");
    setErr("");
    searchRef.current?.focus();
  };

  const save = () => {
    if (!name.trim()) return setErr("Give the dish a name.");
    if (!items.length) return setErr("Add at least one ingredient.");
    if (rows.some((r) => r.g <= 0)) return setErr("Every ingredient needs an amount above 0.");
    if (!svOk) return setErr("Servings must be between 1 and 100.");
    const r1 = (x: number) => Math.round((x * 100 / t.grams) * 10) / 10;
    const f: Food = {
      id: editing?.id ?? "my:recipe:" + uid(), name: name.trim(), alt: `Recipe, ${items.length} ingredient${items.length === 1 ? "" : "s"}`, src: "MY", group: "My recipes",
      kcal: Math.round((t.kcal * 1000) / t.grams) / 10, protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), fibre: r1(t.fibre),
      portions: [{ label: "1 serving", grams: Math.round((t.grams / sv) * 10) / 10 }],
      recipe: { servings: sv, items: rows.map((r) => ({ foodId: r.it.food.id, name: r.it.food.name, grams: Math.round(r.g * 10) / 10 })) },
    };
    rememberFood(f);
    // Ingredients from Open Food Facts need to stay findable for later edits.
    rows.forEach((r) => rememberFood(r.it.food));
    onSaved(f);
  };

  return (
    <div className="page-overlay" style={{ zIndex: 16 }} role="dialog" aria-modal="true" aria-labelledby="recipe-title">
      <main className="main" style={{ paddingBottom: 32 }}>
        <div className="topbar">
          <button className="icon-btn" onClick={onClose} aria-label="Back to add food"><ArrowLeft size={22} /></button>
          <h1 id="recipe-title">{editing ? "Edit recipe" : "New recipe"}</h1>
        </div>
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>Dish not in the list? Add the raw ingredients you used and Thalika works out the calories.</p>
          <div className="grid2">
            <label className="field">Dish name<input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            <label className="field">Servings it makes<input className="input num" type="number" inputMode="numeric" min={1} max={100} value={servings} onChange={(e) => setServings(e.target.value)} /></label>
          </div>

          <section className="card" aria-labelledby="ing-h">
            <h2 id="ing-h">Ingredients</h2>
            {items.length === 0 && <p className="muted small" style={{ margin: "8px 0 0" }}>Search below to add the first ingredient, e.g. rice, chicken thigh, oil.</p>}
            <ul className="list" aria-label="Ingredients">
              {rows.map(({ it, g }, idx) => {
                const ps = defaultPortions(it.food);
                return (
                  <li key={it.key} className="ing-row">
                    <span className="grow">
                      <span className="ellipsis" style={{ display: "block", fontWeight: 600 }}>{it.food.name}</span>
                      <span className="xs muted num">{Math.round(g)} g · {Math.round((it.food.kcal * g) / 100)} kcal</span>
                      <select className="input" style={{ marginTop: 4, minHeight: 36, fontSize: "var(--fs-sm)" }} aria-label={`Unit for ${it.food.name}`} value={it.pi}
                        onChange={(e) => { const pi = Number(e.target.value); const next = [...items]; next[idx] = { ...it, pi, qty: ps[pi].grams === 1 ? "100" : "1" }; setItems(next); }}>
                        {ps.map((p, i) => <option key={i} value={i}>{p.label}{p.grams !== 1 && p.label !== "100 g" ? ` (${p.grams} g)` : ""}</option>)}
                      </select>
                    </span>
                    <input className="input num" inputMode="decimal" aria-label={`Amount of ${it.food.name}`} value={it.qty}
                      onChange={(e) => { const next = [...items]; next[idx] = { ...it, qty: e.target.value }; setItems(next); }} />
                    <button className="icon-btn" onClick={() => setItems(items.filter((x) => x.key !== it.key))} aria-label={`Remove ${it.food.name}`}><Trash2 size={18} /></button>
                  </li>
                );
              })}
            </ul>
            <div className="row" style={{ position: "relative", marginTop: 8 }}>
              <Search size={18} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
              <input ref={searchRef} className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Add an ingredient" aria-label="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {(results.length > 0 || web.foods.length > 0) && (
              <ul className="list" aria-label="Ingredient matches">
                {[...results, ...web.foods].map((f) => (
                  <li key={f.id}>
                    <button className="food-row" onClick={() => addIngredient(f)}>
                      <span className="grow"><span className="name ellipsis" style={{ display: "block" }}>{f.name}</span><span className="xs muted">{Math.round(f.kcal)} kcal per 100 g</span></span>
                      <span className={`badge ${f.src}`}>{SOURCE_LABEL[f.src]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {ready && q.trim().length >= 2 && results.length === 0 && web.state !== "done" && <p className="muted small">No match for "{q}" on this device.</p>}
            {online && q.trim().length >= 2 && (
              <div style={{ marginTop: 8 }}>
                {web.state === "idle" && <button className="btn ghost sm" onClick={searchWeb}><Globe size={16} /> Search packaged "{q.trim()}" online</button>}
                {web.state === "loading" && <div className="row muted small"><div className="spinner" /> Searching Open Food Facts…</div>}
                {web.state === "error" && <div className="notice err" role="alert">Couldn't reach Open Food Facts. Check your connection.</div>}
                {web.state === "done" && web.foods.length === 0 && <p className="muted small">No packaged match online either.</p>}
              </div>
            )}
          </section>

          <section className="card stack" aria-label="Recipe totals" aria-live="polite">
            <div className="row between"><span className="muted small">Whole dish · {Math.round(t.grams)} g</span><strong className="num">{Math.round(t.kcal)} kcal</strong></div>
            <div className="row between"><span style={{ fontWeight: 600 }}>Per serving{svOk && sv > 1 ? ` (1 of ${sv})` : ""}</span><span className="num" style={{ fontSize: "var(--fs-xl)", fontWeight: 700 }}>{Math.round(per(t.kcal))} kcal</span></div>
            <div className="row between small num muted"><span>Protein {Math.round(per(t.protein))} g</span><span>Carbs {Math.round(per(t.carbs))} g</span><span>Fat {Math.round(per(t.fat))} g</span></div>
          </section>
          {err && <div className="field-err" role="alert">{err}</div>}
          <button className="btn" onClick={save}>{editing ? "Save recipe" : "Save and log it"}</button>
          <p className="xs muted" style={{ margin: 0 }}>Weights are for raw ingredients. Oil and sugar count fully; water adds no calories.</p>
        </div>
      </main>
    </div>
  );
}
