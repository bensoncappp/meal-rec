import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// This creates one "client" object, authenticated with your API key. basically just another layer of abstraction
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Dev/cost switch from .env.local. Image generation is OFF unless explicitly set to "true",
// which keeps the main meal flow fast and free of image-provider failures while testing.
const IMAGES_ENABLED = process.env.ENABLE_IMAGE_GENERATION === "true";

const SYSTEM_PROMPT = `You are an expert chef and meal-prep planner. Given a calorie target and macro split, generate exactly 3 distinct full meals.

Rules:
- THE USER'S REQUEST COMES FIRST. If the request names specific foods, ingredients or dishes, every one of the 3 meals MUST prominently feature them (as the main protein or the star of the dish) — never ignore or merely garnish them. If it names an ingredient (e.g. prawn), give 3 different dishes built around it. If it names a specific dish (e.g. pad thai), give 3 variations of that dish (e.g. different proteins or styles). Also respect any stated preferences or restrictions (spicy, vegetarian, no dairy, etc.) in every meal.
- Every meal must be a REAL, existing dish from a specific cuisine that people already know and order (e.g. Chicken Teriyaki Rice Bowl, Butter Chicken with Basmati Rice, Bibimbap, Chicken Burrito Bowl, Greek Chicken Gyro Plate, Grilled Salmon with Roasted Vegetables). Start from the authentic dish, then SIMPLIFY it — fewer ingredients, lean proteins, lighter cooking methods, sensible portions — so it fits the calorie and macro target. Never invent a dish by just combining foods to hit macros.
- Every ingredient must belong in that dish. Use the ingredients, sauces and seasonings the dish is actually known for (e.g. teriyaki sauce in a teriyaki bowl, not olive oil and salsa). No random extras. Use 4 to 7 ingredients per meal.
- Vary the cuisine across the 3 meals (e.g. one Asian, one Western, one Indian or Mexican) so the user gets real variety. If the user asks for one cuisine, give 3 different dishes from that cuisine.
- "name": a short, appetizing dish name of 2 to 5 words, with no calorie numbers and no quotes (e.g. "Teriyaki Chicken Rice Bowl").
- "cuisine": the single cuisine the dish comes from (e.g. "Japanese").
- Only suggest whole, generic, realistic foods (no branded products).
- If a sauce, dressing, or oil is used, include it as its own ingredient with realistic quantities and its own macros.
- For each food, estimate a realistic portion size in grams and its calories, protein, fat, and carbs for that portion, based on typical nutritional values. Keep each food's calories consistent with its macros (about 4 per gram of protein, 4 per gram of carbs, 9 per gram of fat).
- The sum of the foods should roughly hit the calorie and macro target given.
- Return ONLY valid JSON, no other text, in this exact shape:
{
  "meals": [
    {
      "name": "Teriyaki Chicken Rice Bowl",
      "cuisine": "Japanese",
      "items": [
        { "food": "ingredient name", "grams": 000, "calories": 000, "protein": 00, "fat": 00, "carbs": 00 }
      ]
    }
  ]
}`;

// Words/foods to explicitly exclude from the generated plate image (fights the "plastic AI food" look)
const NEGATIVE_PROMPT =
  "sauce, gravy, dollop, cream, mousse, blended, pudding, mixed together, garnish, mash, plastic texture, waxy, glossy shine, 3d render, cgi, illustration, cartoon, artificial";

// Gives each visible ingredient an explicit clock-position on the plate instead of a vague "arranged separately" —
// concrete positions genuinely produce cleaner, more separated results than a generic adjective would.
const CLOCK_POSITIONS: Record<number, string[]> = {
  1: ["at the center"],
  2: ["at 9 o'clock", "at 3 o'clock"],
  3: ["at 12 o'clock", "at 4 o'clock", "at 8 o'clock"],
  4: ["at 12 o'clock", "at 3 o'clock", "at 6 o'clock", "at 9 o'clock"],
};

// Strips database-style qualifiers that mean nothing visually (nutrition states, percentages,
// parenthetical notes) so the image model gets a clean, natural food description instead of
// raw nutrition-label text like "Pasta, Dry" or "Lean Ground Beef (90% Lean)".
function sanitizeForImagePrompt(foodName: string): string {
  return foodName
    .replace(/\([^)]*\)/g, "") // remove anything in parentheses, e.g. "(90% Lean)"
    .replace(/,?\s*(dry weight|dry|raw|canned|uncooked)\b/gi, "") // remove state words that don't describe the cooked dish
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Filters a meal's ingredients down to only what should actually be drawn on the plate —
// oils/vinegars are invisible in a photo, sauces get folded into a descriptor instead of shown as a separate item,
// and anything under 15g is too small to render meaningfully.
function pickVisibleIngredients(items: { food: string; grams: number }[]) {
  const visible: string[] = [];
  let sauceDescriptor = "";

  for (const item of items) {
    const name = item.food.toLowerCase();
    if (name.includes("oil") || name.includes("vinegar")) continue;
    if (
      name.includes("sauce") ||
      name.includes("dressing") ||
      name.includes("glaze")
    ) {
      sauceDescriptor = `lightly glazed with ${sanitizeForImagePrompt(item.food)}`;
      continue;
    }
    if (item.grams < 15) continue;
    visible.push(sanitizeForImagePrompt(item.food));
  }

  return { visible, sauceDescriptor };
}

// Builds the actual text prompt sent to the image model, based on one meal's visible ingredients.
// Explicitly says the foods are DIFFERENT, because a vague "separate portions" tends to produce
// N identical servings of one dish (stock-photo grid pattern) instead of N distinct foods.
function buildImagePrompt(items: { food: string; grams: number }[]) {
  const { visible, sauceDescriptor } = pickVisibleIngredients(items);
  const count = Math.min(visible.length, 4) || 1;
  const positions = CLOCK_POSITIONS[count];

  const layout = visible
    .slice(0, 4)
    .map((food, i) => `${positions[i]}: ${food}`)
    .join(", ");

  const sauceText = sauceDescriptor ? `, ${sauceDescriptor}` : "";

  return `Food photography, high 45-degree angle, one single plate showing ${count} DIFFERENT foods side by side (not ${count} servings of the same food): ${layout}${sauceText}. Each food item is visually distinct from the others in shape, color and texture. Natural matte texture, visible grill char marks where relevant, shot on DSLR, soft diffused daylight, shallow depth of field, realistic, appetizing, plain background, no extra garnish, no text, no utensils`;
}

// Turns a text prompt into a real Pollinations image URL. No API key needed — the URL itself IS the generated image;
// the browser triggers the actual generation the moment an <img> tag tries to load this URL.
function buildImageUrl(prompt: string) {
  const params = new URLSearchParams({
    model: "flux",
    width: "512",
    height: "512",
    nologo: "true",
    enhance: "false", // stops Pollinations' own LLM from silently rewriting/embellishing our prompt
    private: "true",
    negative_prompt: NEGATIVE_PROMPT, // was "negative" — wrong key, was being ignored entirely
    seed: String(Math.floor(Math.random() * 1_000_000)), // different image each generation, not a repeat
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

//conventiaonl set style to write like this
export async function POST(req: Request) {
  const {
    calorieTarget,
    protein,
    fat,
    carbs,
    cuisinePreference,
    mustInclude,
    notes,
  } = await req.json();

  //Builds the actual question to ask Gemini, using the values the user sent in.
  // Each extra line is only added when the user actually asked for it, so a plain
  // "2000 calories" request still behaves exactly as before.
  const promptLines = [
    `Generate 3 meals, each roughly ${calorieTarget} calories, targeting ${protein}% protein, ${fat}% fat, ${carbs}% carbs.`,
  ];
  if (cuisinePreference) {
    promptLines.push(
      `All 3 meals must be in the ${cuisinePreference} cuisine style (3 different dishes).`,
    );
  }
  if (Array.isArray(mustInclude) && mustInclude.length > 0) {
    promptLines.push(
      `The user specifically asked for: ${mustInclude.join(", ")}. Every one of the 3 meals MUST prominently feature this — it should be the main protein or the star of the dish, not a side or garnish.`,
    );
  }
  if (notes) {
    promptLines.push(`Also respect these preferences in every meal: ${notes}.`);
  }
  const userPrompt = promptLines.join("\n");

  //'await' makes it synchronous, pauses this line until Promise resovles,  if just plain 'model.generateContent' it will generate a promise instead of the result,
  // 'await' makes the code pause and wait for the actual repsonse before proceeding to next line
  // the network call is still async under the hood, we're just waiting for its result before continuing.
  // await is only allowed to appear inside a function marked async — that's a hard JavaScript rule, not optional styling.
  // wrapped in try/catch now — if Gemini throws (rate limit, outage, etc.), we return a real JSON error
  // instead of an empty response body that would crash the frontend's res.json() call.
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }],
        },
      ],
      config: { responseMimeType: "application/json" }, // ask Gemini for raw JSON, no markdown fences
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI generation failed", detail: err.message ?? String(err) },
      { status: 502 },
    );
  }

  //   Gemini's raw response is a more complex object; .text() extracts just the plain text content out of it —
  //    which, in your case, should be that JSON string you asked for
  const text = response.text;

  //Check for undefined before parsing.
  if (!text) {
    return NextResponse.json(
      { error: "Gemini returned no text" },
      { status: 500 },
    );
  }

  //just to check if AI followed the structure
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid JSON", raw: text },
      { status: 500 },
    );
  }

  // Totals are summed from the ingredient list here in code, not trusted from the AI,
  // so a meal's headline numbers always match the ingredients shown under it.
  // For each of Gemini's 3 meals, also generate a matching plate image URL
  // (only when the toggle is on; otherwise imageUrl is null and the UI shows the placeholder).
  const meals = (parsed.meals ?? []).map((meal: any) => {
    const totals = (meal.items ?? []).reduce(
      (t: any, i: any) => ({
        calories: t.calories + Number(i.calories ?? 0),
        protein: t.protein + Number(i.protein ?? 0),
        fat: t.fat + Number(i.fat ?? 0),
        carbs: t.carbs + Number(i.carbs ?? 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );
    return {
      ...meal,
      totals,
      imageUrl: IMAGES_ENABLED
        ? buildImageUrl(buildImagePrompt(meal.items))
        : null,
    };
  });

  return NextResponse.json({ meals });
}