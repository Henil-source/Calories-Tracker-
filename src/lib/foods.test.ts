import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rowToFood, scale, searchFoods, setFoods } from "./foods";
import { addDays, dayKey } from "./date";
import { bmr, dailyTarget } from "./nutrition";
import { norm } from "./text";

const db = JSON.parse(readFileSync("public/data/foods.json", "utf8"));
setFoods(db.foods.map(rowToFood), { sources: db.sources });

describe("food database", () => {
  it("has the three cuisines and USDA basics", () => {
    const src = new Set(db.foods.map((r: unknown[]) => r[3]));
    expect([...src].sort()).toEqual(["FR", "IN", "SR", "US"]);
    expect(db.foods.length).toBeGreaterThan(15000);
  });
  it("every row has a plausible kcal per 100 g", () => {
    for (const r of db.foods) expect(r[5]).toBeGreaterThanOrEqual(0), expect(r[5]).toBeLessThanOrEqual(902);
  });
  it.each([
    ["idli", "IN"], ["masala dosa", "IN"], ["chapati", "IN"], ["dal makhani", "IN"],
    ["croissant", "FR"], ["baguette", "FR"], ["crepe", "FR"], ["quiche lorraine", "FR"],
    ["cheeseburger", "US"], ["pancakes", "US"], ["mac and cheese", "US"],
  ])("finds %s", (q, src) => {
    const r = searchFoods(q, { prefer: [src as "IN"] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.slice(0, 5).some((f) => f.src === src)).toBe(true);
  });
  it("matches without accents", () => {
    expect(norm("Crêpe Brûlée")).toBe("crepe brulee");
    expect(searchFoods("creme brulee").length).toBeGreaterThan(0);
  });
  it("scales per 100 g values", () => {
    const butter = searchFoods("butter salted", { prefer: ["US"] }).find((f) => f.name === "Butter, salted")!;
    expect(butter.kcal).toBe(717);
    expect(scale(butter, 14.2).kcal).toBe(102);
  });
});

describe("dates", () => {
  it("adds days across month and DST boundaries", () => {
    expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("targets", () => {
  const p = { name: "", sex: "female" as const, birthYear: 1996, heightCm: 165, weightKg: 70, targetKg: 62, activity: "light" as const, goal: "lose" as const, pace: 0.5, kcalOverride: null, cuisines: ["IN" as const] };
  it("uses Mifflin-St Jeor", () => {
    expect(bmr(p, 2026)).toBeCloseTo(10 * 70 + 6.25 * 165 - 5 * 30 - 161);
  });
  it("never goes below the floor", () => {
    expect(dailyTarget({ ...p, weightKg: 45, heightCm: 150, pace: 0.75, activity: "sedentary" })).toBe(1200);
  });
  it("respects a manual override", () => {
    expect(dailyTarget({ ...p, kcalOverride: 1850 })).toBe(1850);
  });
});
