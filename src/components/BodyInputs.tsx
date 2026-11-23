import { useEffect, useState } from "react";
import type { Units } from "../lib/types";
import { cmToFtIn, ftInToCm, weightFrom, weightIn, weightUnit } from "../lib/units";
import { Seg } from "./ui";

/** Shows a number in the user's unit and reports it back in metric (kg). */
export function WeightField({ label, kg, onKg, units, error, id }: { label: string; kg: number; onKg: (kg: number) => void; units: Units; error?: string; id: string }) {
  const [text, setText] = useState(() => fmt(weightIn(kg, units)));
  // Re-show the stored value when the unit changes.
  useEffect(() => { setText(fmt(weightIn(kg, units))); }, [units]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="field">
      {label} ({weightUnit(units)})
      <input className="input num" type="number" inputMode="decimal" step={0.1} value={text}
        onChange={(e) => { setText(e.target.value); const n = Number(e.target.value); onKg(e.target.value === "" || !Number.isFinite(n) ? NaN : weightFrom(n, units)); }}
        aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
      {error && <span className="field-err" id={`${id}-err`}>{error}</span>}
    </label>
  );
}

/** Height in cm, or in feet and inches. */
export function HeightField({ cm, onCm, units, error }: { cm: number; onCm: (cm: number) => void; units: Units; error?: string }) {
  const init = () => (Number.isFinite(cm) ? cmToFtIn(cm) : { ft: NaN, inch: NaN });
  const [ftIn, setFtIn] = useState<{ ft: string; inch: string }>(() => ({ ft: fmt(init().ft), inch: fmt(init().inch) }));
  const [cmText, setCmText] = useState(() => fmt(Number.isFinite(cm) ? Math.round(cm) : NaN));
  useEffect(() => {
    const v = init();
    setFtIn({ ft: fmt(v.ft), inch: fmt(v.inch) });
    setCmText(fmt(Number.isFinite(cm) ? Math.round(cm) : NaN));
  }, [units]); // eslint-disable-line react-hooks/exhaustive-deps
  const err = error ? <span className="field-err" id="height-err">{error}</span> : null;
  if (units === "metric") {
    return (
      <label className="field">Height (cm)
        <input className="input num" type="number" inputMode="decimal" value={cmText}
          onChange={(e) => { setCmText(e.target.value); onCm(e.target.value === "" ? NaN : Number(e.target.value)); }}
          aria-invalid={!!error} aria-describedby={error ? "height-err" : undefined} />
        {err}
      </label>
    );
  }
  const change = (k: "ft" | "inch", v: string) => {
    const next = { ...ftIn, [k]: v };
    setFtIn(next);
    const ft = Number(next.ft), inch = next.inch === "" ? 0 : Number(next.inch);
    onCm(next.ft === "" || !Number.isFinite(ft) || !Number.isFinite(inch) ? NaN : ftInToCm(ft, inch));
  };
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 600, fontSize: "var(--fs-sm)", padding: 0, marginBottom: 4 }}>Height</legend>
      <div className="row">
        <label className="row grow small" style={{ gap: 6 }}>
          <input className="input num" type="number" inputMode="numeric" aria-label="Height, feet" value={ftIn.ft} onChange={(e) => change("ft", e.target.value)}
            aria-invalid={!!error} aria-describedby={error ? "height-err" : undefined} /> ft
        </label>
        <label className="row grow small" style={{ gap: 6 }}>
          <input className="input num" type="number" inputMode="decimal" step={0.5} aria-label="Height, inches" value={ftIn.inch} onChange={(e) => change("inch", e.target.value)} /> in
        </label>
      </div>
      {err}
    </fieldset>
  );
}

export function UnitsToggle({ units, onChange }: { units: Units; onChange: (u: Units) => void }) {
  return <Seg<Units> label="Units" value={units} onChange={onChange} options={[{ v: "metric", label: "Metric (kg, cm)" }, { v: "imperial", label: "Imperial (lb, ft)" }]} />;
}

function fmt(n: number) { return Number.isFinite(n) ? String(n) : ""; }
