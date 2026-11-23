import { useState } from "react";
import type { Activity, GoalKind, Profile, Sex } from "../lib/types";
import { ACTIVITY_LABEL, dailyTarget } from "../lib/nutrition";
import { Seg } from "../components/ui";

const THIS_YEAR = new Date().getFullYear();

export const blankProfile = (): Profile => ({
  name: "", sex: "female", birthYear: THIS_YEAR - 30, heightCm: 165, weightKg: 70, targetKg: 65,
  activity: "light", goal: "lose", pace: 0.5, kcalOverride: null, cuisines: ["IN", "FR", "US"],
});

export function validateProfile(p: Profile): Record<string, string> {
  const e: Record<string, string> = {};
  if (!(p.birthYear >= THIS_YEAR - 100 && p.birthYear <= THIS_YEAR - 13)) e.birthYear = `Enter a year between ${THIS_YEAR - 100} and ${THIS_YEAR - 13}.`;
  if (!(p.heightCm >= 100 && p.heightCm <= 250)) e.heightCm = "Enter a height between 100 and 250 cm.";
  if (!(p.weightKg >= 25 && p.weightKg <= 300)) e.weightKg = "Enter a weight between 25 and 300 kg.";
  if (!(p.targetKg >= 25 && p.targetKg <= 300)) e.targetKg = "Enter a goal weight between 25 and 300 kg.";
  if (p.kcalOverride != null && !(p.kcalOverride >= 800 && p.kcalOverride <= 6000)) e.kcalOverride = "Enter a number between 800 and 6000, or leave it empty.";
  return e;
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
  const { numIn } = profileFieldHelpers({ p, set: setP, errors });

  const next = () => {
    const e = validateProfile(p);
    const keys = step === 0 ? ["birthYear", "heightCm", "weightKg"] : step === 2 ? ["targetKg"] : [];
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
            <div className="grid2">
              {numIn("heightCm", "Height", "cm")}
              {numIn("weightKg", "Weight", "kg", 0.1)}
            </div>
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
                {numIn("targetKg", "Goal weight", "kg", 0.1)}
                <label className="field">Pace
                  <select className="input" value={p.pace} onChange={(e) => setP({ ...p, pace: Number(e.target.value) })}>
                    <option value={0.25}>Gentle: 0.25 kg a week</option>
                    <option value={0.5}>Steady: 0.5 kg a week</option>
                    <option value={0.75}>Fast: 0.75 kg a week</option>
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
              <p className="muted small" style={{ margin: 0 }}>Worked out with the Mifflin-St Jeor formula and your activity level. You can change it any time in Me.</p>
            </div>
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>Which foods should search show first?</legend>
              {([["IN", "Indian"], ["FR", "French"], ["US", "American"]] as const).map(([k, l]) => (
                <label key={k} className="choice">
                  <input type="checkbox" checked={p.cuisines.includes(k)}
                    onChange={(e) => setP({ ...p, cuisines: e.target.checked ? [...p.cuisines, k] : p.cuisines.filter((c) => c !== k) })} />
                  <span>{l}</span>
                </label>
              ))}
            </fieldset>
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
