import { useEffect, useRef, useState } from "react";
import { Camera, CircleUser, LineChart, Sun } from "lucide-react";
import { addFoods, loadFoods } from "./lib/foods";
import { dayKey } from "./lib/date";
import { dailyTarget } from "./lib/nutrition";
import { getSaveError, getState, update, useStore } from "./lib/store";
import type { MealKey } from "./lib/types";
import Onboarding from "./screens/Onboarding";
import Today from "./screens/Today";
import AddFood from "./screens/AddFood";
import Snap from "./screens/Snap";
import Progress from "./screens/Progress";
import Me from "./screens/Me";
import { ToastProvider } from "./components/ui";

type Tab = "today" | "snap" | "progress" | "me";

export default function App() {
  const profile = useStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>("today");
  const [day, setDay] = useState(dayKey());
  const [adding, setAdding] = useState<MealKey | null>(null);
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  useStore((s) => s.log); // re-render on save so the storage warning shows

  useEffect(() => {
    addFoods(getState().myFoods);
    loadFoods().then(() => setReady(true)).catch((e) => setLoadErr(e.message));
  }, []);

  // Roll "today" over at midnight if the app stays open.
  const lastToday = useRef(dayKey());
  useEffect(() => {
    const t = setInterval(() => {
      const d = dayKey();
      if (d !== lastToday.current) { const prev = lastToday.current; lastToday.current = d; setDay((cur) => (cur === prev ? d : cur)); }
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!profile) return <ToastProvider><div className="app"><Onboarding onDone={(p) => update((s) => ({ ...s, profile: p, weights: [{ day: dayKey(), kg: p.weightKg }] }))} /></div></ToastProvider>;

  const target = dailyTarget(profile);
  const saveErr = getSaveError();

  return (
    <ToastProvider>
      <div className="app">
        {loadErr && <div className="notice err" role="alert" style={{ margin: 12 }}>{loadErr}. Search won't work until it loads. <button className="btn sm" onClick={() => location.reload()}>Retry</button></div>}
        {saveErr && <div className="notice err" role="alert" style={{ margin: 12 }}>{saveErr}</div>}
        {tab === "today" && <Today day={day} setDay={setDay} target={target} onAdd={setAdding} />}
        {tab === "snap" && <Snap day={dayKey()} ready={ready} goSettings={() => setTab("me")} goToday={() => { setDay(dayKey()); setTab("today"); }} />}
        {tab === "progress" && <Progress target={target} />}
        {tab === "me" && <Me />}
        <footer className="tabbar">
          <nav aria-label="Main">
            <TabBtn tab="today" cur={tab} set={setTab} label="Diary" icon={<Sun size={22} />} />
            <TabBtn tab="snap" cur={tab} set={setTab} label="Snap" icon={<span className="pill"><Camera size={20} /></span>} cls="snap-tab" />
            <TabBtn tab="progress" cur={tab} set={setTab} label="Progress" icon={<LineChart size={22} />} />
            <TabBtn tab="me" cur={tab} set={setTab} label="Me" icon={<CircleUser size={22} />} />
          </nav>
        </footer>
        {adding && <AddFood day={day} meal={adding} ready={ready} onClose={() => setAdding(null)} />}
      </div>
    </ToastProvider>
  );
}

function TabBtn({ tab, cur, set, label, icon, cls }: { tab: Tab; cur: Tab; set: (t: Tab) => void; label: string; icon: React.ReactNode; cls?: string }) {
  return <button className={cls} aria-current={cur === tab ? "page" : undefined} onClick={() => set(tab)}>{icon}<span>{label}</span></button>;
}
