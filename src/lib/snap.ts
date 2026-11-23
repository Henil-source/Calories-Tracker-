import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * Photo estimate. The photo goes straight from this device to the Claude API
 * with the user's own API key. Nothing passes through a Thalika server
 * (there isn't one). The model names each item and guesses its weight; the app
 * then grounds calories in the food database where it finds a match.
 */
export const SnapItem = z.object({
  name: z.string().describe("Plain English dish or food name, e.g. 'masala dosa', 'croissant', 'cheeseburger'"),
  local_name: z.string().describe("Regional name if there is one (e.g. 'rajma chawal'), else empty string"),
  cuisine: z.enum(["Indian", "French", "American", "Other"]),
  search_terms: z.array(z.string()).describe("2 to 4 short phrases to look the item up in a food composition table, most specific first"),
  grams: z.number().describe("Estimated edible weight in grams of the portion visible"),
  portion_text: z.string().describe("Human portion, e.g. '2 rotis', '1 bowl', '1 slice'"),
  kcal: z.number().describe("Your own estimate of energy for that portion, kcal"),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const SnapResult = z.object({
  is_food: z.boolean().describe("false if the photo shows no food or drink"),
  items: z.array(SnapItem),
  note: z.string().describe("One short sentence on anything that limits the estimate (hidden oil, size unclear), or empty"),
});

export type SnapItemT = z.infer<typeof SnapItem>;
export type SnapResultT = z.infer<typeof SnapResult>;

const SYSTEM = `You estimate the food in a meal photo for a calorie-tracking app used mostly for Indian, French and American food.
List each distinct item on the plate or in the frame separately (for a thali, each katori, roti and rice counts as an item; for a burger meal, burger, fries and drink are separate).
Estimate the edible weight from visual cues: plate and bowl size, cutlery, hands, packaging. Assume typical home or restaurant preparation, including cooking oil, ghee or butter that is usually used.
Use the dish's common name. Give search terms a nutrition table would use ("chapati", "dal, cooked", "french fries").
If you are unsure of an item, still give your best guess and mark confidence low. If the photo shows no food, set is_food to false and return no items.`;

export { SNAP_MODELS } from "./models";

export class SnapError extends Error {
  constructor(message: string, public kind: "key" | "rate" | "network" | "refused" | "other") { super(message); }
}

export async function estimatePhoto(opts: { apiKey: string; model: string; base64: string; hint?: string; signal?: AbortSignal }): Promise<SnapResultT> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
  const fallbackable = opts.model !== "claude-haiku-5-5"; // Haiku has no server-side fallback
  try {
    const res = await client.beta.messages.parse(
      {
        model: opts.model,
        max_tokens: 4000,
        system: SYSTEM,
        output_config: { effort: "low", format: betaZodOutputFormat(SnapResult) },
        ...(fallbackable ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: opts.base64 } },
              { type: "text", text: opts.hint ? `What's in this meal? The user adds: ${opts.hint}` : "What's in this meal?" },
            ],
          },
        ],
      },
      { signal: opts.signal },
    );
    if (res.stop_reason === "refusal") throw new SnapError("The photo couldn't be analysed. Try another photo or add the food by search.", "refused");
    if (!res.parsed_output) throw new SnapError("The estimate came back incomplete. Try again.", "other");
    return res.parsed_output;
  } catch (e) {
    if (e instanceof SnapError) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new SnapError("Your Claude API key was rejected. Check it in Settings.", "key");
    if (e instanceof Anthropic.RateLimitError) throw new SnapError("Too many photos in a short time. Wait a minute and try again.", "rate");
    if (e instanceof Anthropic.APIConnectionError) throw new SnapError("Couldn't reach the Claude API. Check your internet connection.", "network");
    if (e instanceof Anthropic.APIError) throw new SnapError(`The Claude API returned an error (${e.status ?? "?"}). Try again.`, "other");
    throw e;
  }
}
