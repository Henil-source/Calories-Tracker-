import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { dbInfo } from "../lib/foods";
import { ACTIVITY_LABEL, bmi, dailyTarget } from "../lib/nutrition";
import { exportJson, importJson, update, useStore, wipeAll } from "../lib/store";
import type { Activity, GoalKind, Profile } from "../lib/types";
import { CuisinePicker, paceLabel, profileFieldHelpers, setUnits, validateProfile } from "./Onboarding";
import { HeightField, UnitsToggle, WeightField } from "../components/BodyInputs";
import { LimitPicker } from "../components/LimitPicker";
import { Seg, Sheet, useToast } from "../components/ui";

export default function Me() {
  const profile = useStore((s) => s.profile)!;
  const settings = useStore((s) => s.settings);
  const [p, setP] = useState<Profile>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { numIn } = profileFieldHelpers({ p, set: setP, errors });
  const info = dbInfo();

  const units = settings.units;
  const saveProfile = () => {
    const e = validateProfile(p, units);
    setErrors(e);
    if (Object.keys(e).length) return;
    update((s) => ({ ...s, profile: p }));
    toast("Profile saved");
  };


  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `thalika-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <main className="main">
      <div className="topbar"><h1>Me</h1></div>

      <section className="card stack" aria-labelledby="goal-h">
        <h2 id="goal-h">Goal and body</h2>
        <div className="row between small"><span className="muted">{p.kcalOverride != null ? "Daily limit (your own)" : "Daily target"}</span><strong className="num">{dailyTarget(p).toLocaleString()} kcal</strong></div>
        <div className="row between small"><span className="muted">BMI</span><strong className="num">{Number.isFinite(p.weightKg) && Number.isFinite(p.heightCm) ? bmi(p.weightKg, p.heightCm) : "–"}</strong></div>
        <label className="field">First name<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} maxLength={40} /></label>
        <Seg label="Body type" value={p.sex} onChange={(v) => setP({ ...p, sex: v })} options={[{ v: "female", label: "Female" }, { v: "male", label: "Male" }]} />
        {numIn("birthYear", "Year of birth", "yyyy")}
        <div className="field" role="group" aria-label="Units"><span>Units</span><UnitsToggle units={units} onChange={setUnits} /></div>
        <HeightField key={"h" + units} cm={p.heightCm} onCm={(heightCm) => setP({ ...p, heightCm })} units={units} error={errors.heightCm} />
        <div className="grid2">
          <WeightField key={"w" + units} id="weightKg" label="Weight" kg={p.weightKg} onKg={(weightKg) => setP({ ...p, weightKg })} units={units} error={errors.weightKg} />
          <WeightField key={"t" + units} id="targetKg" label="Goal weight" kg={p.targetKg} onKg={(targetKg) => setP({ ...p, targetKg })} units={units} error={errors.targetKg} />
        </div>
        <label className="field">Activity
          <select className="input" value={p.activity} onChange={(e) => setP({ ...p, activity: e.target.value as Activity })}>
            {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
          </select>
        </label>
        <Seg<GoalKind> label="Goal" value={p.goal} onChange={(v) => setP({ ...p, goal: v })} options={[{ v: "lose", label: "Lose" }, { v: "maintain", label: "Maintain" }, { v: "gain", label: "Gain" }]} />
        {p.goal !== "maintain" && (
          <label className="field">Pace
            <select className="input" value={p.pace} onChange={(e) => setP({ ...p, pace: Number(e.target.value) })}>
              {[0.25, 0.5, 0.75].map((k) => <option key={k} value={k}>{paceLabel(k, units)}</option>)}
            </select>
          </label>
        )}
        <LimitPicker p={p} onChange={(kcalOverride) => setP({ ...p, kcalOverride })} error={errors.kcalOverride} />
        <CuisinePicker value={p.cuisines} onChange={(cuisines) => setP({ ...p, cuisines })} />
        <button className="btn" onClick={saveProfile}>Save</button>
      </section>

      <section className="card stack" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <label className="choice">
          <input type="checkbox" checked={settings.onlineSearch} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, onlineSearch: e.target.checked } }))} />
          <span>Allow online search of packaged foods and barcodes (Open Food Facts). Only your search words are sent.</span>
        </label>
        <label className="field">Daily water goal (ml)
          <input className="input num" inputMode="numeric" value={settings.waterGoalMl} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, waterGoalMl: Math.max(250, Number(e.target.value) || 2500) } }))} />
        </label>
        <div className="grid2">
          <button className="btn ghost" onClick={download}><Download size={18} /> Back up</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}><Upload size={18} /> Restore</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          try { importJson(await f.text()); toast("Backup restored"); location.reload(); } catch (err) { toast((err as Error).message || "That file couldn't be read"); }
        }} />
        <button className="btn danger ghost" onClick={() => setConfirmWipe(true)}>Delete all my data</button>
      </section>

      <section className="card stack small" aria-labelledby="about-h">
        <h2 id="about-h">About the food data</h2>
        <p className="muted" style={{ margin: 0 }}>{info.count.toLocaleString()} foods on this device, values per 100 g:</p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {Object.entries(info.sources).map(([k, s]) => <li key={k}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>, {s.by}. {s.licence}.</li>)}
          <li>Packaged foods: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>, ODbL.</li>
        </ul>
        <p className="muted xs" style={{ margin: 0 }}>Thalika is a food diary, not medical advice. Everything you log stays on this device unless you back it up.</p>
      </section>

      {confirmWipe && (
        <Sheet title="Delete everything?" onClose={() => setConfirmWipe(false)}>
          <div className="stack">
            <p style={{ margin: 0 }}>This removes your profile, diary, weights, and foods from this device. It can't be undone. Back up first if you might want it later.</p>
            <div className="row"><button className="btn ghost grow" onClick={() => setConfirmWipe(false)}>Keep my data</button><button className="btn danger grow" onClick={() => { wipeAll(); location.reload(); }}>Delete everything</button></div>
          </div>
        </Sheet>
      )}
    </main>
  );
}
