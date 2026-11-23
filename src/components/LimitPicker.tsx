import { useState } from "react";
import { recommendedTarget } from "../lib/nutrition";
import { update } from "../lib/store";
import type { Profile } from "../lib/types";
import { Sheet, useToast } from "./ui";

export const LIMIT_MIN = 800;
export const LIMIT_MAX = 6000;
export const limitError = (v: number | null) =>
  v != null && !(v >= LIMIT_MIN && v <= LIMIT_MAX) ? `Enter a limit between ${LIMIT_MIN} and ${LIMIT_MAX} kcal.` : "";

/** Choose between the suggested target and a daily limit of your own. */
export function LimitPicker({ p, onChange, error, hideLegend }: { p: Profile; onChange: (kcalOverride: number | null) => void; error?: string; hideLegend?: boolean }) {
  const rec = recommendedTarget(p);
  const custom = p.kcalOverride != null;
  const [text, setText] = useState(custom ? String(p.kcalOverride) : "");
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={hideLegend ? "sr-only" : "small"} style={{ fontWeight: 600, marginBottom: 8 }}>Daily calorie limit</legend>
      <label className="choice">
        <input type="radio" name="limit" checked={!custom} onChange={() => onChange(null)} />
        <span className="grow">Use the suggested target <strong className="num">{rec.toLocaleString()} kcal</strong>
          <span className="hint" style={{ display: "block" }}>From your height, weight, age, activity and goal.</span></span>
      </label>
      <label className="choice">
        <input type="radio" name="limit" checked={custom} onChange={() => onChange(text === "" ? Math.min(rec, 1600) : Number(text))} />
        <span className="grow">Set my own limit</span>
      </label>
      {custom && (
        <label className="field">My daily limit (kcal)
          <input className="input num" type="number" inputMode="numeric" value={text} autoFocus
            onChange={(e) => { setText(e.target.value); onChange(e.target.value === "" ? NaN : Math.round(Number(e.target.value))); }}
            aria-invalid={!!error} aria-describedby={error ? "limit-err" : undefined} />
          {error && <span className="field-err" id="limit-err">{error}</span>}
        </label>
      )}
    </fieldset>
  );
}

/** Opened from the Today screen by tapping the daily target. */
export function LimitSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [p, setP] = useState(profile);
  const [err, setErr] = useState("");
  const toast = useToast();
  const save = () => {
    const e = limitError(p.kcalOverride);
    setErr(e);
    if (e) return;
    update((s) => ({ ...s, profile: s.profile ? { ...s.profile, kcalOverride: p.kcalOverride } : s.profile }));
    toast(p.kcalOverride != null ? `Daily limit set to ${p.kcalOverride.toLocaleString()} kcal` : "Using the suggested target");
    onClose();
  };
  return (
    <Sheet title="Daily calorie limit" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <LimitPicker p={p} onChange={(v) => { setP({ ...p, kcalOverride: v }); setErr(""); }} error={err} hideLegend />
        <button className="btn" type="submit">Save limit</button>
      </form>
    </Sheet>
  );
}
