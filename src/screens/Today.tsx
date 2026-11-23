import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Droplet, Minus, Plus } from "lucide-react";
import { addDays, dayKey, prettyDay } from "../lib/date";
import { MEALS, totals } from "../lib/meals";
import { macroTargets } from "../lib/nutrition";
import { removeEntry, replaceEntry, setWater, useStore } from "../lib/store";
import type { LogEntry, MealKey } from "../lib/types";
import { Bar, Ring, useToast } from "../components/ui";
import PortionSheet, { makeEntry } from "../components/PortionSheet";
import { foodForEntry } from "../lib/entryFood";

export default function Today({ day, setDay, target, onAdd }: { day: string; setDay: (d: string) => void; target: number; onAdd: (m: MealKey) => void }) {
  const log = useStore((s) => s.log);
  const water = useStore((s) => s.water);
  const waterGoal = useStore((s) => s.settings.waterGoalMl);
  const profile = useStore((s) => s.profile);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const toast = useToast();

  const entries = useMemo(() => log.filter((e) => e.day === day), [log, day]);
  const t = totals(entries);
  const left = target - Math.round(t.kcal);
  const mt = macroTargets(target);
  const ml = water.find((w) => w.day === day)?.ml ?? 0;
  const today = dayKey();

  return (
    <main className="main">
      <div className="topbar">
        <button className="icon-btn" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day"><ChevronLeft size={22} /></button>
        <h1 style={{ textAlign: "center" }} aria-live="polite">{prettyDay(day)}</h1>
        <button className="icon-btn" onClick={() => setDay(addDays(day, 1))} aria-label="Next day" disabled={day >= today} style={day >= today ? { opacity: 0.3 } : undefined}><ChevronRight size={22} /></button>
      </div>
      {day === today && profile?.name && <p className="muted small" style={{ marginTop: -8 }}>Hi {profile.name}.</p>}

      <section className="card" aria-label="Calories summary">
        <div className="summary">
          <Ring value={t.kcal} max={target}>
            <span className={`big num ${left < 0 ? "over" : ""}`}>{Math.abs(left).toLocaleString()}</span>
            <span className="xs muted">{left < 0 ? "kcal over" : "kcal left"}</span>
          </Ring>
          <div className="stack" style={{ gap: 8 }}>
            <div className="kv"><span className="muted">Eaten</span><strong className="num">{Math.round(t.kcal).toLocaleString()} kcal</strong></div>
            <div className="kv"><span className="muted">Daily target</span><strong className="num">{target.toLocaleString()} kcal</strong></div>
            <Bar label="Protein" value={t.protein} max={mt.protein} color="var(--protein)" />
            <Bar label="Carbs" value={t.carbs} max={mt.carbs} color="var(--carbs)" />
            <Bar label="Fat" value={t.fat} max={mt.fat} color="var(--fat)" />
          </div>
        </div>
      </section>

      {MEALS.map((m) => {
        const es = entries.filter((e) => e.meal === m.key);
        const mk = Math.round(totals(es).kcal);
        return (
          <section className="card" key={m.key} aria-labelledby={`meal-${m.key}`}>
            <div className="meal-head">
              <h2 id={`meal-${m.key}`}>{m.label}</h2>
              <span className="small muted num">{es.length ? `${mk} kcal` : `aim ~${Math.round(target * m.share)} kcal`}</span>
              <button className="btn soft sm" onClick={() => onAdd(m.key)} aria-label={`Add food to ${m.label}`}><Plus size={16} /> Add</button>
            </div>
            {es.map((e) => (
              <button key={e.id} className="entry" onClick={() => setEditing(e)} aria-label={`${e.name}, ${e.kcal} kcal. Edit`}>
                <span className="grow">
                  <span className="ellipsis" style={{ display: "block" }}>{e.name}</span>
                  <span className="xs muted">{formatQty(e)}{e.via === "photo" ? " · from photo" : ""}</span>
                </span>
                <span className="kcal num">{e.kcal}</span>
              </button>
            ))}
          </section>
        );
      })}

      <section className="card" aria-labelledby="water-h">
        <div className="meal-head">
          <Droplet size={20} aria-hidden="true" color="var(--protein)" />
          <h2 id="water-h">Water</h2>
          <span className="small muted num">{(ml / 1000).toFixed(2)} / {(waterGoal / 1000).toFixed(1)} L</span>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn ghost sm" onClick={() => setWater(day, ml - 250)} disabled={ml <= 0} aria-label="Remove one glass of water"><Minus size={16} /></button>
          <div className="bar grow"><span style={{ width: `${Math.min(100, (ml / waterGoal) * 100)}%`, background: "var(--protein)" }} /></div>
          <button className="btn soft sm" onClick={() => setWater(day, ml + 250)} aria-label="Add one glass of water (250 ml)"><Plus size={16} /> Glass</button>
        </div>
      </section>

      {editing && (() => {
        const food = foodForEntry(editing);
        return (
          <PortionSheet food={food} meal={editing.meal} entry={editing} onClose={() => setEditing(null)}
            onDelete={() => { removeEntry(editing.id); setEditing(null); toast("Removed"); }}
            onAdd={(x) => { replaceEntry({ ...makeEntry(food, x, editing.day, editing.via, editing.id), createdAt: editing.createdAt }); setEditing(null); toast("Saved"); }} />
        );
      })()}
    </main>
  );
}

function formatQty(e: LogEntry) {
  if (e.via === "quick") return "quick entry";
  if (e.portionLabel === "1 g") return `${Math.round(e.grams)} g`;
  if (e.portionLabel === "100 g") return `${e.qty * 100} g`;
  return `${e.qty} × ${e.portionLabel} · ${Math.round(e.grams)} g`;
}
