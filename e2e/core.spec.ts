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

test("F04-H1 photo estimate with a mocked Claude reply", async ({ page }) => {
  await page.route("https://api.anthropic.com/**", async (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const body = JSON.parse(route.request().postData() || "{}");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.messages[0].content[0].type).toBe("image");
    const result = {
      is_food: true, note: "Oil used in the dal is hard to see.",
      items: [
        { name: "chapati", local_name: "roti", cuisine: "Indian", search_terms: ["chapati", "roti"], grams: 80, portion_text: "2 rotis", kcal: 230, protein_g: 7, carbs_g: 36, fat_g: 6, confidence: "high" },
        { name: "dal", local_name: "dal tadka", cuisine: "Indian", search_terms: ["dal tadka", "dal"], grams: 200, portion_text: "1 bowl", kcal: 240, protein_g: 12, carbs_g: 30, fat_g: 8, confidence: "medium" },
      ],
    };
    return route.fulfill({ status: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({
      id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
      content: [{ type: "text", text: JSON.stringify(result) }], usage: { input_tokens: 10, output_tokens: 10 },
    }) });
  });
  await onboard(page);
  await page.getByRole("button", { name: "Snap" }).click();
  await expect(page.getByText(/need your own Claude API key/)).toBeVisible(); // F04-E1
  await page.getByRole("button", { name: "Add API key" }).click();
  await page.getByLabel("Claude API key").fill("not-a-key"); // F04-N1
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("status")).toContainText("doesn't look like");
  await page.getByLabel("Claude API key").fill("sk-ant-test-0000");
  await page.getByRole("button", { name: "Save key" }).click();
  await page.getByRole("button", { name: "Snap" }).click();
  await page.getByTestId("file-input").setInputFiles("e2e/plate.jpg");
  await expect(page.getByAltText("Your meal photo")).toBeVisible();
  await page.getByRole("button", { name: "Estimate calories" }).click();
  await expect(page.getByRole("region", { name: "chapati" })).toBeVisible();
  await expect(page.getByRole("region", { name: "dal" })).toBeVisible();
  await axe(page);
  await noSideScroll(page);
  await page.getByRole("region", { name: "chapati" }).getByLabel("Weight (g)").fill("120");
  await page.getByLabel("Add to").selectOption("lunch");
  await page.getByRole("button", { name: "Add to diary" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  const lunch = page.getByRole("region", { name: "Lunch" });
  await expect(lunch.getByText("from photo").first()).toBeVisible();
  await expect(lunch.getByRole("button", { name: /Edit$/ })).toHaveCount(2);
});

test("F04-N2 rejected API key shows a fix", async ({ page }) => {
  await page.route("https://api.anthropic.com/**", (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 401, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) });
  });
  await onboard(page);
  await page.getByRole("button", { name: "Me" }).click();
  await page.getByLabel("Claude API key").fill("sk-ant-bad");
  await page.getByRole("button", { name: "Save key" }).click();
  await page.getByRole("button", { name: "Snap" }).click();
  await page.getByTestId("file-input").setInputFiles("e2e/plate.jpg");
  await page.getByRole("button", { name: "Estimate calories" }).click();
  await expect(page.getByRole("alert")).toContainText("key was rejected");
  errors.splice(0); // the 401 is logged by the browser on purpose here
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
