import { useMemo, useState } from "react";
import { addDays, dayKey } from "../lib/date";
import { totals } from "../lib/meals";
import { setWeight, useStore } from "../lib/store";
import { Seg, useToast } from "../components/ui";
import { weightFrom, weightText, weightUnit } from "../lib/units";

export default function Progress({ target }: { target: number }) {
  const log = useStore((s) => s.log);
  const weights = useStore((s) => s.weights);
  const profile = useStore((s) => s.profile);
  const units = useStore((s) => s.settings.units);
  const [range, setRange] = useState<"7" | "30">("7");
  const [w, setW] = useState("");
  const toast = useToast();
  const today = dayKey();

  const days = useMemo(() => {
    const n = Number(range);
    const by = new Map<string, number>();
    for (const e of log) by.set(e.day, (by.get(e.day) ?? 0) + e.kcal);
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(today, i - n + 1);
      return { d, kcal: Math.round(by.get(d) ?? 0) };
    });
  }, [log, range, today]);

  const logged = days.filter((d) => d.kcal > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : 0;
  const onTarget = logged.filter((d) => d.kcal <= target * 1.05).length;
  const streak = useMemo(() => {
    const has = new Set(log.map((e) => e.day));
    let s = 0, d = has.has(today) ? today : addDays(today, -1);
    while (has.has(d)) { s++; d = addDays(d, -1); }
    return s;
  }, [log, today]);
  const max = Math.max(target * 1.3, ...days.map((d) => d.kcal), 1);
  const todayTotals = totals(log.filter((e) => e.day === today));

  const saveWeight = () => {
    const kg = weightFrom(Number(w.replace(",", ".")), units);
    if (!(kg >= 25 && kg <= 300)) return toast(`Enter a weight between ${weightText(25, units)} and ${weightText(300, units)}`);
    setWeight(today, Math.round(kg * 100) / 100); setW(""); toast("Weight saved");
  };
  const lastW = weights.slice(-8);
  const wMin = Math.min(...lastW.map((x) => x.kg), profile?.targetKg ?? Infinity) - 1;
  const wMax = Math.max(...lastW.map((x) => x.kg), profile?.targetKg ?? -Infinity) + 1;

  return (
    <main className="main">
      <div className="topbar"><h1>Progress</h1></div>
      <section className="card stack" aria-labelledby="cal-h">
        <div className="row between"><h2 id="cal-h">Calories</h2><div style={{ width: 180 }}><Seg label="Range" value={range} onChange={setRange} options={[{ v: "7", label: "7 days" }, { v: "30", label: "30 days" }]} /></div></div>
        <div className="chart" role="img" aria-label={`Daily calories for the last ${range} days. Average ${avg} kcal on logged days, target ${target} kcal.`}>
          <div className="goal-line" style={{ bottom: `${(target / max) * 100}%` }} aria-hidden="true" />
          {days.map((d) => (
            <div className="col" key={d.d} title={`${d.d}: ${d.kcal} kcal`}>
              <span className={`b ${d.kcal > target * 1.05 ? "over" : ""}`} style={{ height: `${(d.kcal / max) * 100}%`, minHeight: d.kcal ? 3 : 0 }} />
              {range === "7" && <span className="xs muted">{new Date(d.d + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span>}
            </div>
          ))}
        </div>
        <div className="grid2 small">
          <div><div className="muted">Average (logged days)</div><strong className="num">{avg.toLocaleString()} kcal</strong></div>
          <div><div className="muted">Days at or under target</div><strong className="num">{onTarget} of {logged.length}</strong></div>
          <div><div className="muted">Logging streak</div><strong className="num">{streak} day{streak === 1 ? "" : "s"}</strong></div>
          <div><div className="muted">Today so far</div><strong className="num">{Math.round(todayTotals.kcal)} kcal</strong></div>
        </div>
        <p className="xs muted" style={{ margin: 0 }}>The dashed line is your target of {target.toLocaleString()} kcal.</p>
      </section>

      <section className="card stack" aria-labelledby="w-h">
        <h2 id="w-h">Weight</h2>
        {lastW.length ? (
          <ul className="list small">
            {lastW.slice().reverse().map((x) => (
              <li key={x.day} className="row between" style={{ padding: "6px 0" }}>
                <span>{x.day}</span>
                <span className="row"><span className="bar" style={{ width: 120 }}><span style={{ width: `${((x.kg - wMin) / (wMax - wMin)) * 100}%`, background: "var(--accent)" }} /></span><strong className="num">{weightText(x.kg, units)}</strong></span>
              </li>
            ))}
          </ul>
        ) : <p className="muted small" style={{ margin: 0 }}>Log your weight once a week to see the trend.</p>}
        {profile && profile.goal !== "maintain" && <p className="small muted" style={{ margin: 0 }}>Goal: {weightText(profile.targetKg, units)}</p>}
        <form className="row" onSubmit={(e) => { e.preventDefault(); saveWeight(); }}>
          <label className="grow field">Today's weight ({weightUnit(units)})<input className="input num" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></label>
          <button className="btn" style={{ alignSelf: "flex-end" }} type="submit" disabled={!w}>Save</button>
        </form>
      </section>
    </main>
  );
}
