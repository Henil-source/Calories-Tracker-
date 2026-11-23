/** Local calendar day as YYYY-MM-DD. Entries are filed under the day the user ate, in their own time zone. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Shift a day key by n days using calendar arithmetic (safe across DST). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n, 12); // noon avoids DST edges
  return dayKey(dt);
}

export function prettyDay(day: string, today = dayKey()): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  if (day === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function mealForTime(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return "breakfast" as const;
  if (h < 12) return "morning" as const;
  if (h < 15.5) return "lunch" as const;
  if (h < 18.5) return "evening" as const;
  return "dinner" as const;
}
