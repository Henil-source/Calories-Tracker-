import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { recipeTotals, rowToFood, scale, searchFoods, setFoods } from "./foods";
import { addDays, dayKey } from "./date";
import { bmr, dailyTarget } from "./nutrition";
import { norm } from "./text";

const db = JSON.parse(readFileSync("public/data/foods.json", "utf8"));
setFoods(db.foods.map(rowToFood), { sources: db.sources });

describe("food database", () => {
  it("has the open tables, USDA basics and world dish estimates", () => {
    const src = new Set(db.foods.map((r: unknown[]) => r[3]));
    expect([...src].sort()).toEqual(["FR", "IN", "RC", "SR", "US"]);
    expect(db.foods.length).toBeGreaterThan(15000);
  });
  it.each([
    ["bulgogi", "KR"], ["bibimbap", "KR"], ["kimchi", "KR"], ["japchae", "KR"],
    ["sushi", "JP"], ["ramen", "JP"], ["gyoza", "JP"], ["tonkatsu", "JP"],
    ["chow mein", "CN"], ["mapo tofu", "CN"], ["kung pao", "CN"],
    ["pad thai", "TH"], ["pho", "VN"], ["banh mi", "VN"], ["burrito", "MX"], ["lasagna", "IT"], ["hummus", "ME"],
  ])("finds %s in %s cuisine", (q, c) => {
    const r = searchFoods(q, { cuisine: c as "KR" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((f) => f.cuisine === c)).toBe(true);
  });
  it("lists a cuisine's dishes with no search words, recipes first", () => {
    const r = searchFoods("", { cuisine: "KR" });
    expect(r.length).toBeGreaterThan(10);
    expect(r[0].src).toBe("RC");
  });
  it("world dish estimates have a serving and sane energy", () => {
    const rc = db.foods.filter((r: unknown[]) => r[3] === "RC");
    expect(rc.length).toBeGreaterThanOrEqual(40);
    for (const r of rc) { expect(r[10].length).toBe(1); expect(r[5]).toBeGreaterThan(20); expect(r[5]).toBeLessThan(600); }
  });
  it("adds up a recipe from raw ingredients", () => {
    const rice = searchFoods("rice white long grain cooked")[0];
    const oil = searchFoods("oil olive salad")[0];
    const t = recipeTotals([{ food: rice, grams: 300 }, { food: oil, grams: 10 }]);
    expect(t.grams).toBe(310);
    expect(t.kcal).toBeCloseTo(rice.kcal * 3 + oil.kcal * 0.1, 5);
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
