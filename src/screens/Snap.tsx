import { useRef, useState } from "react";
import { Camera, ImagePlus, KeyRound, RotateCcw, Trash2 } from "lucide-react";
import type { SnapResultT, estimatePhoto as EstimateFn } from "../lib/snap";
import { shrinkImage } from "../lib/image";
import { matchItem, photoFood, type Matched } from "../lib/match";
import { scale, SOURCE_LABEL } from "../lib/foods";
import { addEntries, uid, useStore } from "../lib/store";
import { mealForTime } from "../lib/date";
import { MEALS } from "../lib/meals";
import type { MealKey } from "../lib/types";
import { makeEntry } from "../components/PortionSheet";
import { rememberFood } from "../lib/entryFood";
import { useToast } from "../components/ui";

type Phase = { k: "pick" } | { k: "busy" } | { k: "error"; msg: string; kind: string } | { k: "review"; result: SnapResultT; rows: Matched[] };

export default function Snap({ day, ready, goSettings, goToday, estimator }: {
  day: string; ready: boolean; goSettings: () => void; goToday: () => void; estimator?: typeof EstimateFn;
}) {
  const settings = useStore((s) => s.settings);
  const [photo, setPhoto] = useState<{ dataUrl: string; base64: string } | null>(null);
  const [hint, setHint] = useState("");
  const [phase, setPhase] = useState<Phase>({ k: "pick" });
  const [meal, setMeal] = useState<MealKey>(mealForTime());
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const toast = useToast();

  const onFile = async (f?: File | null) => {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { setPhase({ k: "error", msg: "That photo is over 25 MB. Pick a smaller one.", kind: "other" }); return; }
    try { setPhoto(await shrinkImage(f)); setPhase({ k: "pick" }); }
    catch (e) { setPhase({ k: "error", msg: (e as Error).message, kind: "other" }); }
  };

  const analyse = async () => {
    if (!photo) return;
    abort.current?.abort();
    abort.current = new AbortController();
    setPhase({ k: "busy" });
    try {
      const run = estimator ?? (await import("../lib/snap")).estimatePhoto;
      const result = await run({ apiKey: settings.apiKey, model: settings.model, base64: photo.base64, hint: hint.trim() || undefined, signal: abort.current.signal });
      setPhase({ k: "review", result, rows: result.items.map(matchItem) });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const kind = (e as { kind?: string }).kind;
      setPhase({ k: "error", msg: kind ? (e as Error).message : "Something went wrong reading the photo. Try again.", kind: kind ?? "other" });
    }
  };

  const setRow = (i: number, r: Partial<Matched>) => phase.k === "review" && setPhase({ ...phase, rows: phase.rows.map((x, j) => (j === i ? { ...x, ...r } : x)) });
  const kcalOf = (r: Matched) => (r.chosen ? scale(r.chosen, r.grams).kcal : Math.round((r.item.kcal * r.grams) / Math.max(1, r.item.grams)));

  const save = () => {
    if (phase.k !== "review") return;
    const entries = phase.rows.map((r) => {
      const food = r.chosen ?? photoFood(r.item);
      rememberFood(food);
      return makeEntry(food, { grams: r.grams, label: "1 g", qty: r.grams, meal }, day, "photo", uid());
    });
    addEntries(entries);
    toast(`Added ${entries.length} item${entries.length === 1 ? "" : "s"} to ${MEALS.find((m) => m.key === meal)!.label.toLowerCase()}`);
    setPhoto(null); setHint(""); setPhase({ k: "pick" });
    goToday();
  };

  const noKey = !settings.apiKey;

  return (
    <main className="main">
      <div className="topbar"><h1>Snap a meal</h1></div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="camera-input" />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="file-input" />

      {noKey && (
        <div className="notice" role="note" style={{ marginBottom: 12 }}>
          <strong>Photo estimates need your own Claude API key.</strong> Your photo goes straight from this device to Anthropic, and you pay Anthropic per photo (about a cent or two). Add a key in Me, or log the meal by search.
          <div className="row" style={{ marginTop: 8 }}><button className="btn sm" onClick={goSettings}><KeyRound size={16} /> Add API key</button></div>
        </div>
      )}

      {phase.k !== "review" && (
        <div className="card stack">
          {photo ? <img src={photo.dataUrl} alt="Your meal photo" className="photo-preview" /> : (
            <div className="empty" style={{ border: "2px dashed var(--border)", borderRadius: "var(--r-md)" }}>
              <Camera size={36} aria-hidden="true" />
              <p style={{ margin: "8px 0 0" }}>Take a photo from above with the whole plate in view.</p>
            </div>
          )}
          <div className="grid2">
            <button className="btn" onClick={() => camRef.current?.click()}><Camera size={18} /> {photo ? "Retake" : "Take photo"}</button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /> Choose photo</button>
          </div>
          {photo && (
            <>
              <label className="field">Anything the photo can't show? (optional)
                <input className="input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. made with ghee, 2 rotis under the sabzi" maxLength={200} />
              </label>
              <button className="btn block" onClick={analyse} disabled={noKey || phase.k === "busy" || !ready}>{phase.k === "busy" ? "Reading your plate…" : "Estimate calories"}</button>
            </>
          )}
          {phase.k === "busy" && <div className="row muted small" role="status"><div className="spinner" /> Looking at the photo. This takes 5 to 20 seconds.</div>}
          {phase.k === "error" && (
            <div className="notice err" role="alert">
              {phase.msg}
              {phase.kind === "key" && <div style={{ marginTop: 8 }}><button className="btn sm" onClick={goSettings}>Open settings</button></div>}
            </div>
          )}
        </div>
      )}

      {phase.k === "review" && (
        <div className="stack">
          {photo && <img src={photo.dataUrl} alt="Your meal photo" className="photo-preview" style={{ maxHeight: 180 }} />}
          {!phase.result.is_food || phase.rows.length === 0 ? (
            <div className="notice" role="alert">No food found in that photo. Try another photo, or add the meal by search.</div>
          ) : (
            <>
              <p className="small muted" style={{ margin: 0 }}>Check each item. Weights are guesses from the photo, so fix any that look wrong.{phase.result.note ? ` ${phase.result.note}` : ""}</p>
              {phase.rows.map((r, i) => (
                <section className="card stack" key={i} aria-label={r.item.name} style={{ gap: 8 }}>
                  <div className="row between">
                    <div className="grow">
                      <div style={{ fontWeight: 700 }}>{cap(r.item.name)}{r.item.local_name ? <span className="muted" style={{ fontWeight: 400 }}> · {r.item.local_name}</span> : null}</div>
                      <div className="xs muted">{r.item.portion_text} · {r.item.confidence} confidence</div>
                    </div>
                    <strong className="num" style={{ fontSize: "var(--fs-lg)" }}>{kcalOf(r)} kcal</strong>
                    <button className="icon-btn" aria-label={`Remove ${r.item.name}`} onClick={() => phase.k === "review" && setPhase({ ...phase, rows: phase.rows.filter((_, j) => j !== i) })}><Trash2 size={18} /></button>
                  </div>
                  <div className="grid2" style={{ gridTemplateColumns: "96px 1fr" }}>
                    <label className="field">Weight (g)
                      <input className="input num" inputMode="numeric" value={r.grams} onChange={(e) => setRow(i, { grams: Math.max(0, Number(e.target.value) || 0) })} />
                    </label>
                    <label className="field">Match
                      <select className="input" value={r.chosen?.id ?? "photo"} onChange={(e) => setRow(i, { chosen: r.candidates.find((c) => c.id === e.target.value) ?? null })}>
                        {r.candidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({SOURCE_LABEL[c.src]}, {c.kcal}/100 g)</option>)}
                        <option value="photo">Use the photo estimate</option>
                      </select>
                    </label>
                  </div>
                </section>
              ))}
              <div className="card row between">
                <strong>Total</strong>
                <strong className="num" style={{ fontSize: "var(--fs-xl)" }}>{phase.rows.reduce((a, r) => a + kcalOf(r), 0)} kcal</strong>
              </div>
              <label className="field">Add to
                <select className="input" value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
                  {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </label>
            </>
          )}
          <div className="row">
            <button className="btn ghost" onClick={() => setPhase({ k: "pick" })}><RotateCcw size={18} /> Start over</button>
            {phase.rows.length > 0 && phase.result.is_food && <button className="btn grow" onClick={save} disabled={phase.rows.some((r) => !(r.grams > 0))}>Add to diary</button>}
          </div>
          <p className="xs muted" style={{ margin: 0 }}>Photo estimates are rough. Calories come from the food table when a match is picked, otherwise from the model's own estimate.</p>
        </div>
      )}
    </main>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
