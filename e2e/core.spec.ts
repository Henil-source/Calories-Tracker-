import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
});
test.afterEach(() => { expect(errors, errors.join("\n")).toEqual([]); });

async function onboard(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Let's set your daily calories" })).toBeVisible();
  await page.getByLabel("Your first name (optional)").fill("Asha");
  await page.getByLabel(/Year of birth/).fill("1994");
  await page.getByLabel(/Height/).fill("160");
  await page.getByLabel(/Weight/).fill("68");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Moderate/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Goal weight/).fill("60");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/kcal$/).first()).toBeVisible();
  await page.getByRole("button", { name: "Start tracking" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function noSideScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(w).toBeLessThanOrEqual(0);
}

test("F01-H1 onboarding sets a target and lands on today", async ({ page }) => {
  await page.goto("/");
  await axe(page);
  await page.getByLabel(/Year of birth/).fill("1800");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Enter a year between/)).toBeVisible(); // F01-N1
  await page.reload();
  await onboard(page);
  await expect(page.getByText("Hi Asha.")).toBeVisible();
  await expect(page.getByText("kcal left")).toBeVisible();
  await axe(page);
  await noSideScroll(page);
});

test("F02-H1 search, add, edit and remove a food", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Add food to Breakfast" }).click();
  const search = page.getByRole("searchbox", { name: "Search foods" });
  await search.fill("idli");
  await page.getByRole("button", { name: /^Idli/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Choose amount" })).toBeVisible();
  await page.getByRole("textbox", { name: "Amount" }).fill("3");
  await axe(page);
  await page.getByRole("button", { name: "Add to breakfast" }).click();
  await expect(page.getByRole("status")).toContainText("Added Idli");
  await search.fill("croissant");
  await expect(page.getByRole("button", { name: /Croissant/ }).first()).toBeVisible();
  await search.fill("zzqqxx"); // F02-E1 no results
  await expect(page.getByText(/No match for/)).toBeVisible();
  await noSideScroll(page);
  await page.getByRole("button", { name: "Back to today" }).click();
  const entry = page.getByRole("button", { name: /Idli, \d+ kcal\. Edit/ });
  await expect(entry).toBeVisible();
  const kcal = Number((await entry.getAttribute("aria-label"))!.match(/(\d+) kcal/)![1]);
  expect(kcal).toBeGreaterThan(80);
  await entry.click();
  await page.getByRole("textbox", { name: "Amount" }).fill("0"); // F02-N1
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Amount" }).fill("1");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: /Idli, \d+ kcal\. Edit/ })).toBeVisible();
  // survives reload
  await page.reload();
  await page.getByRole("button", { name: /Idli, \d+ kcal\. Edit/ }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("button", { name: /Idli, \d+ kcal\. Edit/ })).toHaveCount(0);
});

test("F03-H1 quick calories and water", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Add food to Dinner" }).click();
  await page.getByRole("button", { name: "Quick calories" }).click();
  await page.getByLabel("Calories (kcal)").fill("450");
  await page.getByLabel(/What was it/).fill("Wedding buffet plate 😋");
  await page.getByRole("dialog", { name: "Quick calories" }).getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Back to today" }).click();
  await expect(page.getByRole("button", { name: /Wedding buffet plate 😋, 450 kcal/ })).toBeVisible();
  await expect(page.getByText("450 kcal").first()).toBeVisible();
  await page.getByRole("button", { name: /Add one glass of water/ }).click();
  await expect(page.getByText("0.25 / 2.5 L")).toBeVisible();
});

test("F04-H1 set my own daily limit", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Year of birth/).fill("1994");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Use the suggested target/)).toBeVisible();
  await page.getByLabel("Set my own limit").check();
  await page.getByLabel("My daily limit (kcal)").fill("300"); // F04-N1
  await page.getByRole("button", { name: "Start tracking" }).click();
  await expect(page.getByText(/Enter a limit between 800 and 6000/)).toBeVisible();
  await page.getByLabel("My daily limit (kcal)").fill("1600");
  await axe(page);
  await page.getByRole("button", { name: "Start tracking" }).click();
  await expect(page.getByRole("button", { name: "Daily limit 1600 kcal. Change" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Calories summary" }).getByText("1,600", { exact: true })).toBeVisible();
  // change it from the diary
  await page.getByRole("button", { name: "Daily limit 1600 kcal. Change" }).click();
  const sheet = page.getByRole("dialog", { name: "Daily calorie limit" });
  await sheet.getByLabel("My daily limit (kcal)").fill("1750");
  await axe(page);
  await sheet.getByRole("button", { name: "Save limit" }).click();
  await expect(page.getByRole("button", { name: "Daily limit 1750 kcal. Change" })).toBeVisible();
  await page.getByRole("button", { name: /Daily limit 1750/ }).click();
  await page.getByLabel(/Use the suggested target/).check();
  await page.getByRole("button", { name: "Save limit" }).click();
  await expect(page.getByRole("button", { name: /^Daily target \d+ kcal\. Change$/ })).toBeVisible();
});

test("F07-H1 imperial units are converted and stored in metric", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Year of birth/).fill("1990");
  await page.getByRole("button", { name: "Imperial (lb, ft)" }).click();
  await page.getByLabel("Height, feet").fill("5");
  await page.getByLabel("Height, inches").fill("3");
  await page.getByLabel("Weight (lb)").fill("150");
  await axe(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Goal weight (lb)").fill("135");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start tracking" }).click();
  const prof = await page.evaluate(() => JSON.parse(localStorage.getItem("thalika.v1")!).profile);
  expect(prof.heightCm).toBeCloseTo(160, 0);
  expect(prof.weightKg).toBeCloseTo(68, 0);
  expect(prof.targetKg).toBeCloseTo(61.2, 0);
  await page.getByRole("button", { name: "Progress" }).click();
  await expect(page.getByText("150 lb")).toBeVisible();
  await page.getByLabel("Today's weight (lb)").fill("149");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("149 lb")).toBeVisible();
  await page.getByRole("button", { name: "Me" }).click();
  await expect(page.getByLabel("Height, feet")).toHaveValue("5");
  await page.getByRole("button", { name: "Metric (kg, cm)" }).click();
  await expect(page.getByLabel("Height (cm)")).toHaveValue("160");
  await expect(page.getByLabel("Weight (kg)", { exact: true })).toHaveValue("67.6");
});

test("F08-H1 build a dish from raw ingredients", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Add food to Lunch" }).click();
  await page.getByRole("searchbox", { name: "Search foods" }).fill("Nani's chicken pulao");
  await page.getByRole("button", { name: /Build "Nani's chicken pulao" from ingredients/ }).click();
  const dlg = page.getByRole("dialog", { name: "New recipe" });
  await expect(dlg.getByLabel("Dish name")).toHaveValue("Nani's chicken pulao");
  await dlg.getByRole("button", { name: "Save and log it" }).click(); // F08-N1
  await expect(dlg.getByRole("alert")).toContainText("Add at least one ingredient");
  const ing = dlg.getByRole("searchbox", { name: "Search ingredients" });
  await ing.fill("rice white long grain cooked");
  await dlg.getByRole("list", { name: "Ingredient matches" }).getByRole("button").first().click();
  await dlg.getByLabel(/^Unit for Rice/).selectOption({ label: "1 g" });
  await dlg.getByLabel(/^Amount of Rice/).fill("600");
  await ing.fill("chicken thigh raw");
  await dlg.getByRole("list", { name: "Ingredient matches" }).getByRole("button").first().click();
  await dlg.getByLabel(/^Unit for Chicken/).selectOption({ label: "1 g" });
  await dlg.getByLabel(/^Amount of Chicken/).fill("400");
  await ing.fill("ghee");
  await dlg.getByRole("list", { name: "Ingredient matches" }).getByRole("button").first().click();
  await dlg.getByLabel(/^Unit for Ghee/).selectOption({ label: "1 g" });
  await dlg.getByLabel(/^Amount of Ghee/).fill("30");
  await dlg.getByLabel("Servings it makes").fill("4");
  const per = Number((await dlg.getByRole("region", { name: "Recipe totals" }).getByText(/^\d+ kcal$/).last().textContent())!.replace(/\D/g, ""));
  expect(per).toBeGreaterThan(250);
  expect(per).toBeLessThan(700);
  await axe(page);
  await noSideScroll(page);
  await dlg.getByRole("button", { name: "Save and log it" }).click();
  await expect(page.getByRole("dialog", { name: "Choose amount" })).toContainText("Nani's chicken pulao");
  await page.getByRole("button", { name: "Add to lunch" }).click();
  await page.getByRole("button", { name: "My foods" }).click();
  await expect(page.getByRole("button", { name: "Edit recipe Nani's chicken pulao" })).toBeVisible();
  await page.getByRole("button", { name: "Edit recipe Nani's chicken pulao" }).click();
  await page.getByLabel("Servings it makes").fill("5");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("status")).toContainText("Saved Nani's chicken pulao");
  await page.getByRole("button", { name: "Back to today" }).click();
  const logged = page.getByRole("region", { name: "Lunch" }).getByRole("button", { name: /Nani's chicken pulao, \d+ kcal/ });
  await expect(logged).toBeVisible();
  const got = Number((await logged.getAttribute("aria-label"))!.match(/(\d+) kcal/)![1]);
  expect(Math.abs(got - per)).toBeLessThanOrEqual(1); // logged entries keep the numbers they were logged with
});

test("F09-H1 browse Korean, Japanese and Chinese dishes", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Add food to Dinner" }).click();
  const cuisine = page.getByRole("group", { name: "Cuisine" });
  await cuisine.getByRole("button", { name: "Korean" }).click();
  await expect(page.getByRole("button", { name: /Bulgogi/ }).first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Search foods" }).fill("kimchi");
  await expect(page.getByRole("button", { name: /Kimchi jjigae/ })).toBeVisible();
  await cuisine.getByRole("button", { name: "Japanese" }).click();
  await page.getByRole("searchbox", { name: "Search foods" }).fill("gyoza");
  await page.getByRole("button", { name: /^Gyoza/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Choose amount" })).toContainText("6 gyoza");
  await page.getByRole("button", { name: "Close" }).click();
  await cuisine.getByRole("button", { name: "Chinese" }).click();
  await page.getByRole("searchbox", { name: "Search foods" }).fill("mapo");
  await expect(page.getByRole("button", { name: /Mapo tofu/ }).first()).toBeVisible();
  await axe(page);
  await noSideScroll(page);
});

test("F05-H1 progress and weight", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Progress" }).click();
  await expect(page.getByRole("img", { name: /Daily calories for the last 7 days/ })).toBeVisible();
  await page.getByLabel("Today's weight (kg)").fill("67.4");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("67.4 kg")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Me" }).click();
  await expect(page.getByText(/foods on this device/)).toBeVisible();
  await axe(page);
  await noSideScroll(page);
});

test("F06-H1 delete all data", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Me" }).click();
  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Let's set your daily calories" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("thalika.v1"))).toContain('"profile":null');
});
