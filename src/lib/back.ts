import { useEffect, useRef } from "react";

/**
 * The phone's back button closes the top-most open layer first (a sheet, then
 * the Add food screen). Each open layer registers a handler here; the newest
 * one runs first.
 */
const stack: { current: () => void }[] = [];

export function useBackHandler(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const entry = { get current() { return ref.current; } };
    stack.push(entry);
    return () => { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1); };
  }, []);
}

/** Runs the top handler. Returns false when nothing was open. */
export function handleBack(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.current();
  return true;
}

/** What the hardware back button does: close a layer, else go to the diary, else leave the app. */
export function onHardwareBack(o: { closeLayer: () => boolean; onDiary: boolean; goDiary: () => void; exit: () => void }) {
  if (o.closeLayer()) return "closed";
  if (!o.onDiary) { o.goDiary(); return "diary"; }
  o.exit();
  return "exit";
}
