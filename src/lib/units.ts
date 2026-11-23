import type { Units } from "./types";

/** Everything is stored in metric. These convert for display and input only. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  let totalIn = Math.round((cm / CM_PER_IN) * 2) / 2; // nearest half inch
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round((totalIn - ft * 12) * 2) / 2;
  if (inch >= 12) { ft += 1; inch -= 12; }
  return { ft, inch };
}
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * CM_PER_IN * 10) / 10;

const round1 = (x: number) => Math.round(x * 10) / 10;

export function weightText(kg: number, u: Units) {
  return u === "imperial" ? `${round1(kgToLb(kg))} lb` : `${round1(kg)} kg`;
}
export function heightText(cm: number, u: Units) {
  if (u === "metric") return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft} ft ${inch} in`;
}
/** Value in the user's unit, for an input box. */
export const weightIn = (kg: number, u: Units) => (Number.isFinite(kg) ? round1(u === "imperial" ? kgToLb(kg) : kg) : NaN);
export const weightFrom = (v: number, u: Units) => (u === "imperial" ? Math.round(lbToKg(v) * 100) / 100 : v);
export const weightUnit = (u: Units) => (u === "imperial" ? "lb" : "kg");
