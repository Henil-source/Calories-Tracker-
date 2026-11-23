// Captures the clone's screens for replica/clone-screens. Run with the preview server up on :4173.
import { chromium } from "playwright";
const out = process.argv[2] || "replica/clone-screens";
const base = "http://localhost:4173/";
const today = new Date(); const d = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const local = (n) => { const x = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n, 12); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const E = (day, meal, name, kcal, p, c, f, grams, label, qty, via = "search") => ({ id: Math.random().toString(36).slice(2), day, meal, foodId: "x:" + name, name, grams, portionLabel: label, qty, kcal, protein: p, carbs: c, fat: f, fibre: 2, via, createdAt: new Date().toISOString() });
const log = [
  E(local(0), "breakfast", "Masala dosa", 346, 7, 41, 16, 210, "1 dosa", 1), E(local(0), "breakfast", "Hot tea (Garam Chai)", 32, 1, 5, 1, 200, "1 tea cup", 1),
  E(local(0), "lunch", "Chapati/Roti", 146, 4, 26, 3, 72, "1 chapati", 2), E(local(0), "lunch", "Dal tadka", 230, 11, 28, 8, 200, "1 g", 200, "photo"),
  E(local(0), "evening", "Croissant (average)", 250, 4, 28, 13, 60, "1 g", 60),
];
for (let i = 1; i < 7; i++) log.push(E(local(-i), "lunch", "Day total", [1650, 1820, 2100, 1540, 1760, 1900][i - 1], 60, 200, 60, 100, "entry", 1, "quick"));
const state = { profile: { name: "Asha", sex: "female", birthYear: 1994, heightCm: 160, weightKg: 67.4, targetKg: 60, activity: "moderate", goal: "lose", pace: 0.5, kcalOverride: null, cuisines: ["IN", "FR", "US"] },
  settings: { apiKey: "sk-ant-demo", model: "claude-opus-5-5", onlineSearch: true, waterGoalMl: 2500 }, log, myFoods: [], recent: [], weights: [{ day: local(-14), kg: 68.6 }, { day: local(-7), kg: 68.0 }, { day: local(0), kg: 67.4 }], water: [{ day: local(0), ml: 1250 }] };

const browser = await chromium.launch();
const shot = async (page, name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${name}.png` }); };
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  const sfx = scheme === "dark" ? "-dark" : "";
  if (scheme === "light") { await page.goto(base); await shot(page, "S01-onboarding"); }
  await page.goto(base);
  await page.evaluate((s) => localStorage.setItem("thalika.v1", JSON.stringify(s)), state);
  await page.reload();
  await shot(page, "S02-diary" + sfx);
  if (scheme === "dark") { await ctx.close(); continue; }
  await page.getByRole("button", { name: "Add food to Dinner" }).click();
  await page.getByRole("searchbox", { name: "Search foods" }).fill("paneer");
  await shot(page, "S03-add-food");
  await page.locator(".food-row").first().click();
  await shot(page, "S04-portion");
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Back to today" }).click();
  await page.route("https://api.anthropic.com/**", (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const result = { is_food: true, note: "Ghee on the rotis is hard to see.", items: [
      { name: "chapati", local_name: "roti", cuisine: "Indian", search_terms: ["chapati"], grams: 72, portion_text: "2 rotis", kcal: 210, protein_g: 6, carbs_g: 34, fat_g: 5, confidence: "high" },
      { name: "rajma", local_name: "rajma masala", cuisine: "Indian", search_terms: ["rajma", "kidney bean curry"], grams: 180, portion_text: "1 katori", kcal: 200, protein_g: 9, carbs_g: 25, fat_g: 7, confidence: "medium" },
      { name: "steamed rice", local_name: "chawal", cuisine: "Indian", search_terms: ["rice, cooked", "boiled rice"], grams: 150, portion_text: "1 cup", kcal: 190, protein_g: 4, carbs_g: 42, fat_g: 0.4, confidence: "high" }] };
    return route.fulfill({ status: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null, content: [{ type: "text", text: JSON.stringify(result) }], usage: { input_tokens: 1, output_tokens: 1 } }) });
  });
  await page.getByRole("button", { name: "Snap" }).click();
  await page.getByTestId("file-input").setInputFiles("e2e/plate.jpg");
  await shot(page, "S05-snap-photo");
  await page.getByRole("button", { name: "Estimate calories" }).click();
  await page.getByText("Total").waitFor();
  await shot(page, "S05-snap-review");
  await page.getByRole("button", { name: "Progress" }).click();
  await shot(page, "S06-progress");
  await page.getByRole("button", { name: "Me" }).click();
  await shot(page, "S07-me");
  await ctx.close();
}
await browser.close();
console.log("screens saved to", out);
