// Captures the clone's screens for replica/clone-screens. Run with the preview server up on :4173.
import { chromium } from "playwright";
const out = process.argv[2] || "replica/clone-screens";
const base = "http://localhost:4173/";
const today = new Date(); const d = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const local = (n) => { const x = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n, 12); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const E = (day, meal, name, kcal, p, c, f, grams, label, qty, via = "search") => ({ id: Math.random().toString(36).slice(2), day, meal, foodId: "x:" + name, name, grams, portionLabel: label, qty, kcal, protein: p, carbs: c, fat: f, fibre: 2, via, createdAt: new Date().toISOString() });
const log = [
  E(local(0), "breakfast", "Masala dosa", 346, 7, 41, 16, 210, "1 dosa", 1), E(local(0), "breakfast", "Hot tea (Garam Chai)", 32, 1, 5, 1, 200, "1 tea cup", 1),
  E(local(0), "lunch", "Chapati/Roti", 146, 4, 26, 3, 72, "1 chapati", 2), E(local(0), "lunch", "Dal tadka", 230, 11, 28, 8, 200, "1 g", 200),
  E(local(0), "evening", "Croissant (average)", 250, 4, 28, 13, 60, "1 g", 60),
];
for (let i = 1; i < 7; i++) log.push(E(local(-i), "lunch", "Day total", [1650, 1820, 2100, 1540, 1760, 1900][i - 1], 60, 200, 60, 100, "entry", 1, "quick"));
const state = { profile: { name: "Asha", sex: "female", birthYear: 1994, heightCm: 160, weightKg: 67.4, targetKg: 60, activity: "moderate", goal: "lose", pace: 0.5, kcalOverride: 1600, cuisines: ["IN", "KR", "JP"] },
  settings: { units: "metric", onlineSearch: true, waterGoalMl: 2500 }, log, myFoods: [], recent: [], weights: [{ day: local(-14), kg: 68.6 }, { day: local(-7), kg: 68.0 }, { day: local(0), kg: 67.4 }], water: [{ day: local(0), ml: 1250 }] };

const browser = await chromium.launch();
const shot = async (page, name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${name}.png` }); };
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  // Pretend to be the Android app: Capacitor sets these for the status and navigation bars.
  await page.addInitScript(() => { const r = document.documentElement.style; r.setProperty("--safe-area-inset-top", "36px"); r.setProperty("--safe-area-inset-bottom", "24px"); });
  const sfx = scheme === "dark" ? "-dark" : "";
  if (scheme === "light") { await page.goto(base); await shot(page, "S01-onboarding"); }
  await page.goto(base);
  await page.evaluate((s) => localStorage.setItem("thalika.v1", JSON.stringify(s)), state);
  await page.reload();
  await shot(page, "S02-diary" + sfx);
  if (scheme === "dark") { await ctx.close(); continue; }
  await page.getByRole("button", { name: /Daily limit/ }).click();
  await shot(page, "S02-daily-limit");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add food to Dinner" }).click();
  await page.getByRole("group", { name: "Cuisine" }).getByRole("button", { name: "Korean" }).click();
  await shot(page, "S03-add-food-korean");
  await page.locator(".food-row").first().click();
  await shot(page, "S04-portion");
  await page.keyboard.press("Escape");
  await page.getByRole("group", { name: "Cuisine" }).getByRole("button", { name: "All cuisines" }).click();
  await page.getByRole("button", { name: "Build from ingredients" }).click();
  await page.getByLabel("Dish name").fill("Mum's paneer bhurji");
  await page.getByLabel("Servings it makes").fill("2");
  for (const [q, g] of [["paneer", 200], ["onions raw", 80], ["tomatoes red ripe raw", 100], ["ghee", 15]]) {
    await page.getByRole("searchbox", { name: "Search ingredients" }).fill(q);
    await page.getByRole("list", { name: "Ingredient matches" }).getByRole("button").first().click();
    const unit = page.locator(".ing-row").last().locator("select");
    await unit.selectOption({ label: "1 g" });
    await page.locator(".ing-row").last().locator("input").fill(String(g));
  }
  await shot(page, "S05-recipe");
  await page.getByRole("button", { name: "Back to add food" }).click();
  await page.getByRole("button", { name: "Back to today" }).click();
  await page.getByRole("button", { name: "Progress" }).click();
  await shot(page, "S06-progress");
  await page.getByRole("button", { name: "Me" }).click();
  await page.getByRole("button", { name: "Imperial (lb, ft)" }).click();
  await shot(page, "S07-me-imperial");
  await ctx.close();
}
await browser.close();
console.log("screens saved to", out);
