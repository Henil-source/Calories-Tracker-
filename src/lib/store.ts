import { useSyncExternalStore } from "react";
import type { Food, LogEntry, Profile, Settings, WaterEntry, WeightEntry } from "./types";

/** All data stays on the device, in local storage, under versioned keys. */
const KEY = "thalika.v1";

export interface State {
  profile: Profile | null;
  settings: Settings;
  log: LogEntry[];
  myFoods: Food[];
  recent: string[];       // food ids, most recent first
  weights: WeightEntry[];
  water: WaterEntry[];
}

export const DEFAULT_SETTINGS: Settings = { apiKey: "", model: "claude-opus-5-5", onlineSearch: true, waterGoalMl: 2500 };

const empty = (): State => ({ profile: null, settings: { ...DEFAULT_SETTINGS }, log: [], myFoods: [], recent: [], weights: [], water: [] });

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const s = JSON.parse(raw);
    return { ...empty(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) } };
  } catch {
    return empty();
  }
}

let state: State = read();
const subs = new Set<() => void>();
let saveError: string | null = null;

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    saveError = null;
  } catch (e) {
    saveError = "Couldn't save on this device. Storage may be full.";
  }
  subs.forEach((f) => f());
}

export const getState = () => state;
export const getSaveError = () => saveError;
export function update(fn: (s: State) => State) { commit(fn(state)); }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => sel(state),
  );
}

// Other tabs or windows (desktop) writing the same storage.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { state = read(); subs.forEach((f) => f()); }
  });
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export function addEntries(entries: LogEntry[]) {
  update((s) => ({
    ...s,
    log: [...s.log, ...entries],
    recent: [...new Set([...entries.map((e) => e.foodId), ...s.recent])].slice(0, 30),
  }));
}

export function removeEntry(id: string) {
  update((s) => ({ ...s, log: s.log.filter((e) => e.id !== id) }));
}

export function replaceEntry(e: LogEntry) {
  update((s) => ({ ...s, log: s.log.map((x) => (x.id === e.id ? e : x)) }));
}

export function setWater(day: string, ml: number) {
  update((s) => ({ ...s, water: [...s.water.filter((w) => w.day !== day), { day, ml: Math.max(0, ml) }] }));
}

export function setWeight(day: string, kg: number) {
  update((s) => ({
    ...s,
    weights: [...s.weights.filter((w) => w.day !== day), { day, kg }].sort((a, b) => a.day.localeCompare(b.day)),
    profile: s.profile ? { ...s.profile, weightKg: kg } : s.profile,
  }));
}

export function exportJson(): string {
  return JSON.stringify({ app: "thalika", version: 1, exportedAt: new Date().toISOString(), data: { ...state, settings: { ...state.settings, apiKey: "" } } }, null, 1);
}

export function importJson(text: string) {
  const j = JSON.parse(text);
  if (j?.app !== "thalika" || !j.data) throw new Error("This file isn't a Thalika backup.");
  const keepKey = state.settings.apiKey;
  commit({ ...empty(), ...j.data, settings: { ...DEFAULT_SETTINGS, ...j.data.settings, apiKey: keepKey } });
}

export function wipeAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  commit(empty());
}
