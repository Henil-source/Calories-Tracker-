import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Barcode, ChefHat, Globe, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { CUISINES, cuisineLabel, getFood, removeFood, searchFoods, SOURCE_LABEL } from "../lib/foods";
import { offBarcode, offSearch } from "../lib/off";
import { addEntries, uid, update, useStore } from "../lib/store";
import { MEALS } from "../lib/meals";
import type { Cuisine, Food, MealKey } from "../lib/types";
import RecipeBuilder from "./RecipeBuilder";
import PortionSheet, { makeEntry } from "../components/PortionSheet";
import { Seg, Sheet, useToast } from "../components/ui";
import { rememberFood } from "../lib/entryFood";
import { useBackHandler } from "../lib/back";

type Tab = "search" | "recent" | "mine";

export default function AddFood({ day, meal: meal0, onClose, ready }: { day: string; meal: MealKey; onClose: () => void; ready: boolean }) {
  const [meal, setMeal] = useState<MealKey>(meal0);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("search");
  const [picked, setPicked] = useState<Food | null>(null);
  const [online, setOnline] = useState<{ state: "idle" | "loading" | "done" | "error"; foods: Food[]; msg?: string }>({ state: "idle", foods: [] });
  const [sheet, setSheet] = useState<"none" | "custom" | "quick" | "barcode" | "recipe">("none");
  const [cuisine, setCuisine] = useState<Cuisine | null>(null);
  const [editRecipe, setEditRecipe] = useState<Food | null>(null);
  const [deleting, setDeleting] = useState<Food | null>(null);
  const profile = useStore((s) => s.profile);
  const settings = useStore((s) => s.settings);
  const recentIds = useStore((s) => s.recent);
  const myFoods = useStore((s) => s.myFoods);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useBackHandler(onClose);
  const searching = q.trim().length >= 2 || !!cuisine;

  const results = useMemo(() => (ready && (q.trim().length >= 2 || cuisine) ? searchFoods(q.trim().length >= 2 ? q : "", { prefer: profile?.cuisines ?? [], cuisine }) : []), [q, ready, profile, cuisine]);
  const recent = useMemo(() => recentIds.map((id) => getFood(id) ?? myFoods.find((f) => f.id === id)).filter((f): f is Food => !!f), [recentIds, myFoods]);
  const mine = useMemo(() => myFoods.filter((f) => f.src === "MY" && f.group !== "Photo estimate"), [myFoods]);
  const delFood = (f: Food) => { update((s) => ({ ...s, myFoods: s.myFoods.filter((x) => x.id !== f.id), recent: s.recent.filter((id) => id !== f.id) })); removeFood(f.id); setDeleting(null); toast(`Deleted ${f.name}`); };

  useEffect(() => { setOnline({ state: "idle", foods: [] }); }, [q]);

  const searchOnline = async () => {
    setOnline({ state: "loading", foods: [] });
    try {
      const foods = await offSearch(q.trim());
      setOnline({ state: "done", foods });
    } catch {
      setOnline({ state: "error", foods: [], msg: "Couldn't reach Open Food Facts. Check your connection and try again." });
    }
  };

  const add = (food: Food, x: { grams: number; label: string; qty: number; meal: MealKey }) => {
    rememberFood(food);
    addEntries([makeEntry(food, x, day, food.src === "OFF" ? "barcode" : food.recipe ? "recipe" : "search", uid())]);
    setPicked(null);
    toast(`Added ${food.name} (${Math.round((food.kcal * x.grams) / 100)} kcal)`);
  };

  const list = tab === "search" ? results : tab === "recent" ? recent : mine;

  return (
    <div className="page-overlay" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <main className="main" style={{ paddingBottom: 32 }}>
        <div className="topbar">
          <button className="icon-btn" onClick={onClose} aria-label="Back to today"><ArrowLeft size={22} /></button>
          <h1 id="add-title">Add food</h1>
        </div>
        <div className="stack">
          <label className="field">Meal
            <select className="input" value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
              {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <div className="row" style={{ position: "relative" }}>
            <Search size={18} aria-hidden="true" style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
            <input ref={inputRef} className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Search e.g. poha, bibimbap, croissant" aria-label="Search foods"
              value={q} onChange={(e) => { setQ(e.target.value); setTab("search"); }} />
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn soft sm" onClick={() => setSheet("quick")}><Plus size={16} /> Quick calories</button>
            <button className="btn soft sm" onClick={() => setSheet("recipe")}><ChefHat size={16} /> Build from ingredients</button>
            <button className="btn soft sm" onClick={() => setSheet("custom")}><Plus size={16} /> New food</button>
            {settings.onlineSearch && <button className="btn soft sm" onClick={() => setSheet("barcode")}><Barcode size={16} /> Barcode</button>}
          </div>
          <div className="chip-row" role="group" aria-label="Cuisine">
            <button aria-pressed={!cuisine} onClick={() => setCuisine(null)}>All cuisines</button>
            {CUISINES.map((c) => <button key={c.v} aria-pressed={cuisine === c.v} onClick={() => { setCuisine(cuisine === c.v ? null : c.v); setTab("search"); }}>{c.label}</button>)}
          </div>
          <Seg<Tab> label="Food lists" value={tab} onChange={setTab} options={[{ v: "search", label: "Results" }, { v: "recent", label: "Recent" }, { v: "mine", label: "My foods" }]} />

          {!ready && <div className="row muted small"><div className="spinner" /> Loading the food list…</div>}
          {tab === "search" && ready && !searching && <p className="empty">Type at least 2 letters, or pick a cuisine. 17,000+ foods are on this device: Indian, French, American, Korean, Japanese, Chinese, Thai, Italian, Mexican and more.</p>}
          {tab === "search" && ready && searching && results.length === 0 && <div className="empty stack" style={{ alignItems: "center" }}>
            <span>No match for "{q}"{cuisine ? ` in ${cuisineLabel(cuisine)}` : ""}. Try a shorter word, or build it from its ingredients.</span>
            <button className="btn soft sm" onClick={() => setSheet("recipe")}><ChefHat size={16} /> Build "{q.trim() || "a dish"}" from ingredients</button>
          </div>}
          {tab === "recent" && recent.length === 0 && <p className="empty">Foods you add show up here.</p>}
          {tab === "mine" && mine.length === 0 && <p className="empty">Foods and recipes you create show up here.</p>}

          {list.length > 0 && (
            <ul className="list card" style={{ padding: "4px 12px" }} aria-label="Foods">
              {list.map((f) => (
                <li key={f.id} className={tab === "mine" ? "row" : undefined}>
                  <FoodRow f={f} onPick={() => setPicked(f)} />
                  {tab === "mine" && f.recipe && <button className="icon-btn" onClick={() => setEditRecipe(f)} aria-label={`Edit recipe ${f.name}`}><Pencil size={18} /></button>}
                  {tab === "mine" && <button className="icon-btn" onClick={() => setDeleting(f)} aria-label={`Delete ${f.name}`}><Trash2 size={18} /></button>}
                </li>
              ))}
            </ul>
          )}

          {tab === "search" && settings.onlineSearch && q.trim().length >= 2 && !cuisine && (
            <div className="stack">
              {online.state === "idle" && <button className="btn ghost" onClick={searchOnline}><Globe size={18} /> Search packaged foods online</button>}
              {online.state === "loading" && <div className="row muted small"><div className="spinner" /> Searching Open Food Facts…</div>}
              {online.state === "error" && <div className="notice err" role="alert">{online.msg}</div>}
              {online.state === "done" && online.foods.length === 0 && <p className="empty">No packaged foods found online.</p>}
              {online.foods.length > 0 && (
                <ul className="list card" style={{ padding: "4px 12px" }} aria-label="Packaged foods from Open Food Facts">
                  {online.foods.map((f) => <li key={f.id}><FoodRow f={f} onPick={() => setPicked(f)} /></li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
      {picked && <PortionSheet food={picked} meal={meal} onClose={() => setPicked(null)} onAdd={(x) => add(picked, x)} />}
      {sheet === "custom" && <CustomFoodSheet initialName={q} onClose={() => setSheet("none")} onSaved={(f) => { setSheet("none"); setPicked(f); }} />}
      {sheet === "quick" && <QuickSheet onClose={() => setSheet("none")} onSave={(kcal, label) => {
        const f: Food = { id: "quick:" + uid(), name: label || "Quick calories", alt: "", src: "MY", group: "Quick", kcal, protein: 0, carbs: 0, fat: 0, fibre: 0, portions: [] };
        addEntries([{ ...makeEntry(f, { grams: 100, label: "entry", qty: 1, meal }, day, "quick", uid()) }]);
        setSheet("none"); toast(`Added ${kcal} kcal`);
      }} />}
      {(sheet === "recipe" || editRecipe) && <RecipeBuilder initialName={q.trim()} editing={editRecipe ?? undefined} ready={ready}
        onClose={() => { setSheet("none"); setEditRecipe(null); }}
        onSaved={(f) => { const wasEdit = !!editRecipe; setSheet("none"); setEditRecipe(null); if (wasEdit) toast(`Saved ${f.name}`); else setPicked(f); }} />}
      {deleting && (
        <Sheet title={`Delete ${deleting.name}?`} onClose={() => setDeleting(null)}>
          <div className="stack">
            <p style={{ margin: 0 }}>It leaves My foods. Meals you already logged with it stay in your diary.</p>
            <div className="row"><button className="btn ghost grow" onClick={() => setDeleting(null)}>Keep it</button><button className="btn danger grow" onClick={() => delFood(deleting)}>Delete</button></div>
          </div>
        </Sheet>
      )}
      {sheet === "barcode" && <BarcodeSheet onClose={() => setSheet("none")} onFound={(f) => { setSheet("none"); setPicked(f); }} />}
    </div>
  );
}

function FoodRow({ f, onPick }: { f: Food; onPick: () => void }) {
  const p = f.portions[0];
  return (
    <button className="food-row" onClick={onPick}>
      <span className="grow">
        <span className="name ellipsis" style={{ display: "block" }}>{f.name}</span>
        <span className="small muted ellipsis" style={{ display: "block" }}>
          {p ? `${p.label} · ${Math.round((f.kcal * p.grams) / 100)} kcal` : `100 g · ${Math.round(f.kcal)} kcal`}{f.alt ? ` · ${f.alt}` : ""}
        </span>
      </span>
      <span className={`badge ${f.src}`}>{SOURCE_LABEL[f.src]}</span>
    </button>
  );
}

function CustomFoodSheet({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (f: Food) => void }) {
  const [v, setV] = useState({ name: initialName, serving: "1 serving", grams: "100", kcal: "", protein: "", carbs: "", fat: "" });
  const [err, setErr] = useState("");
  const save = () => {
    const g = Number(v.grams), k = Number(v.kcal);
    if (!v.name.trim()) return setErr("Give the food a name.");
    if (!(g > 0)) return setErr("Enter the serving weight in grams.");
    if (!(k >= 0) || v.kcal === "") return setErr("Enter the calories in one serving.");
    const per = (x: string) => (x === "" ? 0 : Math.round((Number(x) / g) * 1000) / 10);
    const f: Food = { id: "my:" + uid(), name: v.name.trim(), alt: "", src: "MY", group: "My foods", kcal: per(v.kcal), protein: per(v.protein), carbs: per(v.carbs), fat: per(v.fat), fibre: null, portions: [{ label: v.serving.trim() || "1 serving", grams: g }] };
    update((s) => ({ ...s, myFoods: [...s.myFoods, f] }));
    rememberFood(f);
    onSaved(f);
  };
  const field = (k: keyof typeof v, label: string, num = true) => (
    <label className="field">{label}<input className="input" inputMode={num ? "decimal" : undefined} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  return (
    <Sheet title="New food" onClose={onClose}>
      <div className="stack">
        {field("name", "Name", false)}
        <div className="grid2">{field("serving", "Serving name", false)}{field("grams", "Serving weight (g)")}</div>
        {field("kcal", "Calories per serving (kcal)")}
        <div className="grid2">{field("protein", "Protein (g)")}{field("carbs", "Carbs (g)")}</div>
        {field("fat", "Fat (g)")}
        {err && <div className="field-err" role="alert">{err}</div>}
        <button className="btn" onClick={save}>Save food</button>
      </div>
    </Sheet>
  );
}

function QuickSheet({ onClose, onSave }: { onClose: () => void; onSave: (kcal: number, label: string) => void }) {
  const [k, setK] = useState("");
  const [label, setLabel] = useState("");
  const n = Number(k);
  const ok = k !== "" && n > 0 && n <= 10000;
  return (
    <Sheet title="Quick calories" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (ok) onSave(Math.round(n), label.trim()); }}>
        <label className="field">Calories (kcal)<input className="input num" inputMode="numeric" value={k} onChange={(e) => setK(e.target.value)} /></label>
        <label className="field">What was it? (optional)<input className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} /></label>
        <button className="btn" type="submit" disabled={!ok}>Add</button>
      </form>
    </Sheet>
  );
}

function BarcodeSheet({ onClose, onFound }: { onClose: () => void; onFound: (f: Food) => void }) {
  const [code, setCode] = useState("");
  const [st, setSt] = useState<"idle" | "loading" | "none" | "error">("idle");
  const look = async () => {
    setSt("loading");
    try {
      const f = await offBarcode(code);
      if (f) onFound(f); else setSt("none");
    } catch { setSt("error"); }
  };
  return (
    <Sheet title="Look up a barcode" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); look(); }}>
        <label className="field">Barcode number<input className="input num" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 8901058851427" /></label>
        <span className="hint">Type the digits under the barcode on the pack. Looked up in Open Food Facts.</span>
        {st === "none" && <div className="notice" role="alert">That barcode isn't in Open Food Facts yet. Add it as a new food instead.</div>}
        {st === "error" && <div className="notice err" role="alert">Couldn't reach Open Food Facts. Check your connection.</div>}
        <button className="btn" type="submit" disabled={code.replace(/\D/g, "").length < 6 || st === "loading"}>{st === "loading" ? "Looking up…" : "Look up"}</button>
      </form>
    </Sheet>
  );
}
