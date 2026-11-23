import { useRef, useState } from "react";
import { Download, Eye, EyeOff, Upload } from "lucide-react";
import { dbInfo } from "../lib/foods";
import { ACTIVITY_LABEL, bmi, dailyTarget } from "../lib/nutrition";
import { exportJson, importJson, update, useStore, wipeAll } from "../lib/store";
import { SNAP_MODELS } from "../lib/models";
import type { Activity, GoalKind, Profile } from "../lib/types";
import { profileFieldHelpers, validateProfile } from "./Onboarding";
import { Seg, Sheet, useToast } from "../components/ui";

export default function Me() {
  const profile = useStore((s) => s.profile)!;
  const settings = useStore((s) => s.settings);
  const [p, setP] = useState<Profile>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState(settings.apiKey);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { numIn } = profileFieldHelpers({ p, set: setP, errors });
  const info = dbInfo();

  const saveProfile = () => {
    const e = validateProfile(p);
    setErrors(e);
    if (Object.keys(e).length) return;
    update((s) => ({ ...s, profile: p }));
    toast("Profile saved");
  };

  const saveKey = () => {
    const k = key.trim();
    if (k && !k.startsWith("sk-ant-")) { toast("That doesn't look like a Claude API key (it starts with sk-ant-)"); return; }
    update((s) => ({ ...s, settings: { ...s.settings, apiKey: k } }));
    toast(k ? "API key saved on this device" : "API key removed");
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
        <div className="row between small"><span className="muted">Daily target</span><strong className="num">{dailyTarget(p).toLocaleString()} kcal</strong></div>
        <div className="row between small"><span className="muted">BMI</span><strong className="num">{Number.isFinite(p.weightKg) && Number.isFinite(p.heightCm) ? bmi(p.weightKg, p.heightCm) : "–"}</strong></div>
        <label className="field">First name<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} maxLength={40} /></label>
        <Seg label="Body type" value={p.sex} onChange={(v) => setP({ ...p, sex: v })} options={[{ v: "female", label: "Female" }, { v: "male", label: "Male" }]} />
        <div className="grid2">{numIn("birthYear", "Year of birth", "yyyy")}{numIn("heightCm", "Height", "cm")}</div>
        <div className="grid2">{numIn("weightKg", "Weight", "kg", 0.1)}{numIn("targetKg", "Goal weight", "kg", 0.1)}</div>
        <label className="field">Activity
          <select className="input" value={p.activity} onChange={(e) => setP({ ...p, activity: e.target.value as Activity })}>
            {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
          </select>
        </label>
        <Seg<GoalKind> label="Goal" value={p.goal} onChange={(v) => setP({ ...p, goal: v })} options={[{ v: "lose", label: "Lose" }, { v: "maintain", label: "Maintain" }, { v: "gain", label: "Gain" }]} />
        {p.goal !== "maintain" && (
          <label className="field">Pace
            <select className="input" value={p.pace} onChange={(e) => setP({ ...p, pace: Number(e.target.value) })}>
              <option value={0.25}>0.25 kg a week</option><option value={0.5}>0.5 kg a week</option><option value={0.75}>0.75 kg a week</option>
            </select>
          </label>
        )}
        <label className="field">Set my own target (kcal, optional)
          <input className="input num" inputMode="numeric" value={p.kcalOverride ?? ""} onChange={(e) => setP({ ...p, kcalOverride: e.target.value === "" ? null : Number(e.target.value) })} aria-invalid={!!errors.kcalOverride} />
          {errors.kcalOverride && <span className="field-err">{errors.kcalOverride}</span>}
        </label>
        <button className="btn" onClick={saveProfile}>Save</button>
      </section>

      <section className="card stack" aria-labelledby="snap-h" id="snap-settings">
        <h2 id="snap-h">Photo estimates</h2>
        <p className="small muted" style={{ margin: 0 }}>Uses your own key from <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">console.anthropic.com</a>. The key is stored only on this device and is never put in backups.</p>
        <label className="field">Claude API key
          <span className="row">
            <input className="input" type={showKey ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder="sk-ant-…" />
            <button className="icon-btn" type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? "Hide key" : "Show key"}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
        </label>
        <label className="field">Model
          <select className="input" value={settings.model} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, model: e.target.value } }))}>
            {SNAP_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <button className="btn" onClick={saveKey}>Save key</button>
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
            <p style={{ margin: 0 }}>This removes your profile, diary, weights, foods and API key from this device. It can't be undone. Back up first if you might want it later.</p>
            <div className="row"><button className="btn ghost grow" onClick={() => setConfirmWipe(false)}>Keep my data</button><button className="btn danger grow" onClick={() => { wipeAll(); location.reload(); }}>Delete everything</button></div>
          </div>
        </Sheet>
      )}
    </main>
  );
}
