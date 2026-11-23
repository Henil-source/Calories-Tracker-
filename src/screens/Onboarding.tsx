import { useState } from "react";
import type { Activity, Cuisine, GoalKind, Profile, Sex, Units } from "../lib/types";
import { ACTIVITY_LABEL, dailyTarget } from "../lib/nutrition";
import { CUISINES } from "../lib/foods";
import { update, useStore } from "../lib/store";
import { heightText, weightText } from "../lib/units";
import { Seg } from "../components/ui";
import { HeightField, UnitsToggle, WeightField } from "../components/BodyInputs";
import { LimitPicker, limitError } from "../components/LimitPicker";

const THIS_YEAR = new Date().getFullYear();

export const blankProfile = (): Profile => ({
  name: "", sex: "female", birthYear: THIS_YEAR - 30, heightCm: 165, weightKg: 70, targetKg: 65,
  activity: "light", goal: "lose", pace: 0.5, kcalOverride: null, cuisines: ["IN", "FR", "US"],
});

export function validateProfile(p: Profile, u: Units = "metric"): Record<string, string> {
  const e: Record<string, string> = {};
  const wr = `${weightText(25, u)} and ${weightText(300, u)}`;
  if (!(p.birthYear >= THIS_YEAR - 100 && p.birthYear <= THIS_YEAR - 13)) e.birthYear = `Enter a year between ${THIS_YEAR - 100} and ${THIS_YEAR - 13}.`;
  if (!(p.heightCm >= 100 && p.heightCm <= 250)) e.heightCm = `Enter a height between ${heightText(100, u)} and ${heightText(250, u)}.`;
  if (!(p.weightKg >= 25 && p.weightKg <= 300)) e.weightKg = `Enter a weight between ${wr}.`;
  if (!(p.targetKg >= 25 && p.targetKg <= 300)) e.targetKg = `Enter a goal weight between ${wr}.`;
  const le = limitError(p.kcalOverride);
  if (le) e.kcalOverride = le;
  return e;
}

export const setUnits = (units: Units) => update((s) => ({ ...s, settings: { ...s.settings, units } }));

/** Pace choices, labelled in the user's unit. */
export function paceLabel(kg: number, u: Units) {
  return u === "imperial" ? `${Math.round(kg * 2.2046 * 4) / 4} lb a week` : `${kg} kg a week`;
}

export function CuisinePicker({ value, onChange }: { value: Cuisine[]; onChange: (v: Cuisine[]) => void }) {
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>Which cuisines do you eat most? Search shows these first.</legend>
      <div className="chips">
        {CUISINES.map((c) => (
          <label key={c.v} className="chip">
            <input type="checkbox" checked={value.includes(c.v)} onChange={(e) => onChange(e.target.checked ? [...value, c.v] : value.filter((x) => x !== c.v))} />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function profileFieldHelpers({ p, set, errors }: { p: Profile; set: (p: Profile) => void; errors: Record<string, string> }) {
  const numIn = (k: keyof Profile, label: string, unit: string, step = 1) => (
    <label className="field">
      {label} ({unit})
      <input className="input num" type="number" inputMode="decimal" step={step} value={Number.isFinite(p[k] as number) ? (p[k] as number) : ""}
        onChange={(e) => set({ ...p, [k]: e.target.value === "" ? NaN : Number(e.target.value) })}
        aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined} />
      {errors[k] && <span className="field-err" id={`${k}-err`}>{errors[k]}</span>}
    </label>
  );
  return { numIn };
}

export default function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(blankProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useStore((s) => s.settings.units);
  const { numIn } = profileFieldHelpers({ p, set: setP, errors });

  const next = () => {
    const e = validateProfile(p, units);
    const keys = step === 0 ? ["birthYear", "heightCm", "weightKg"] : step === 2 ? ["targetKg"] : step === 3 ? ["kcalOverride"] : [];
    const relevant = Object.fromEntries(Object.entries(e).filter(([k]) => keys.includes(k)));
    setErrors(relevant);
    if (Object.keys(relevant).length) return;
    if (step < 3) setStep(step + 1);
    else onDone(p);
  };

  return (
    <main className="main" style={{ paddingBottom: 32 }}>
      <div className="steps" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className={i <= step ? "on" : ""} />)}</div>
      <p className="muted small" style={{ margin: 0 }}>Step {step + 1} of 4</p>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
        {step === 0 && (
          <>
            <h1 style={{ fontSize: "var(--fs-xl)", margin: "4px 0 0" }}>Let's set your daily calories</h1>
            <p className="muted" style={{ margin: 0 }}>Your answers stay on this device. They're used only to work out a daily target.</p>
            <label className="field">Your first name (optional)
              <input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} autoComplete="given-name" maxLength={40} />
            </label>
            <div className="field" role="group" aria-label="Body type for the energy formula">
              <span>Body type for the energy formula</span>
              <Seg<Sex> label="Body type" value={p.sex} onChange={(v) => setP({ ...p, sex: v })} options={[{ v: "female", label: "Female" }, { v: "male", label: "Male" }]} />
            </div>
            {numIn("birthYear", "Year of birth", "e.g. 1995")}
            <div className="field" role="group" aria-label="Units">
              <span>Units</span>
              <UnitsToggle units={units} onChange={setUnits} />
            </div>
            <HeightField cm={p.heightCm} onCm={(heightCm) => setP({ ...p, heightCm })} units={units} error={errors.heightCm} />
            <WeightField id="weightKg" label="Weight" kg={p.weightKg} onKg={(weightKg) => setP({ ...p, weightKg })} units={units} error={errors.weightKg} />
          </>
        )}
        {step === 1 && (
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend><h1 style={{ fontSize: "var(--fs-xl)", margin: "4px 0 12px" }}>How active is a normal week?</h1></legend>
            {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
              <label key={a} className="choice">
                <input type="radio" name="activity" checked={p.activity === a} onChange={() => setP({ ...p, activity: a })} />
                <span>{ACTIVITY_LABEL[a]}</span>
              </label>
            ))}
          </fieldset>
        )}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: "var(--fs-xl)", margin: "4px 0 0" }}>What's your goal?</h1>
            <Seg<GoalKind> label="Goal" value={p.goal} onChange={(v) => setP({ ...p, goal: v })}
              options={[{ v: "lose", label: "Lose weight" }, { v: "maintain", label: "Stay the same" }, { v: "gain", label: "Gain weight" }]} />
            {p.goal !== "maintain" && (
              <>
                <WeightField id="targetKg" label="Goal weight" kg={p.targetKg} onKg={(targetKg) => setP({ ...p, targetKg })} units={units} error={errors.targetKg} />
                <label className="field">Pace
                  <select className="input" value={p.pace} onChange={(e) => setP({ ...p, pace: Number(e.target.value) })}>
                    <option value={0.25}>Gentle: {paceLabel(0.25, units)}</option>
                    <option value={0.5}>Steady: {paceLabel(0.5, units)}</option>
                    <option value={0.75}>Fast: {paceLabel(0.75, units)}</option>
                  </select>
                </label>
              </>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h1 style={{ fontSize: "var(--fs-xl)", margin: "4px 0 0" }}>Your daily target</h1>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="num" style={{ fontSize: "var(--fs-xxl)", fontWeight: 700 }}>{dailyTarget(p).toLocaleString()} kcal</div>
              <p className="muted small" style={{ margin: 0 }}>{p.kcalOverride != null ? "Your own limit. " : "Worked out with the Mifflin-St Jeor formula and your activity level. "}You can change it any time by tapping the target on the diary.</p>
            </div>
            <LimitPicker p={p} onChange={(kcalOverride) => setP({ ...p, kcalOverride })} error={errors.kcalOverride} />
            <CuisinePicker value={p.cuisines} onChange={(cuisines) => setP({ ...p, cuisines })} />
            <p className="xs muted" style={{ margin: 0 }}>Thalika is a food diary, not medical advice. If you're pregnant, under 18 or managing a health condition, check your target with a doctor or dietitian.</p>
          </>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          {step > 0 && <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="submit" className="btn grow">{step < 3 ? "Continue" : "Start tracking"}</button>
        </div>
      </form>
    </main>
  );
}
