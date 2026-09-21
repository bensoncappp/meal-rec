import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// This creates one "client" object, authenticated with your API key. basically just another layer of abstraction
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are an expert chef and meal-prep planner. Given a calorie target and macro split, generate exactly 3 distinct full meals.

Rules:
- Each meal's ingredients MUST make culinary sense together — build each meal around a real, recognizable cuisine style (e.g. Japanese, Korean, Italian, Mexican, Indian, Mediterranean, Western). Do not just combine foods to hit macros; they must belong together as a dish a person would actually recognize and want to eat.
- Vary the cuisine style across the 3 meals so the user gets real variety, not 3 versions of the same thing.
- Only suggest whole, generic, realistic foods (no branded products).
- If a sauce, dressing, or oil is used, include it as its own ingredient with estimated macros, but keep quantities realistic.
- For each food, estimate a realistic portion size in grams and its calories, protein, fat, and carbs for that portion, based on typical nutritional values.
- Each meal's totals should roughly hit the calorie and macro target given.
- Return ONLY valid JSON, no other text, in this exact shape:
{
  "meals": [
    {
      "cuisine": "Japanese",
      "items": [
        { "food": "ingredient name", "grams": 000, "calories": 000, "protein": 00, "fat": 00, "carbs": 00 }
      ],
      "totals": { "calories": 000, "protein": 00, "fat": 00, "carbs": 00 }
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
      sauceDescriptor = `lightly glazed with ${item.food}`;
      continue;
    }
    if (item.grams < 15) continue;
    visible.push(item.food);
  }

  return { visible, sauceDescriptor };
}

// Builds the actual text prompt sent to the image model, based on one meal's visible ingredients.
function buildImagePrompt(items: { food: string; grams: number }[]) {
  const { visible, sauceDescriptor } = pickVisibleIngredients(items);
  const count = Math.min(visible.length, 4) || 1;
  const positions = CLOCK_POSITIONS[count];

  const layout = visible
    .slice(0, 4)
    .map((food, i) => `${positions[i]}: ${food}`)
    .join(", ");

  const sauceText = sauceDescriptor ? `, ${sauceDescriptor}` : "";

  return `Food photography, high 45-degree angle, one white circular plate with separate portions: ${layout}${sauceText}. Natural matte texture, visible grill char marks where relevant, shot on DSLR, soft diffused daylight, shallow depth of field, realistic, appetizing, plain background, no extra garnish, no text, no utensils`;
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
  const { calorieTarget, protein, fat, carbs, cuisinePreference } =
    await req.json();

  //Builds the actual question to ask Gemini, using the values the user sent in.
  // const userPrompt = `Generate 3 meals, each roughly ${calorieTarget} calories, targeting ${protein}% protein, ${fat}% fat, ${carbs}% carbs.`;

  // Update userPrompt construction to include it when present:
  const userPrompt = cuisinePreference
    ? `Generate 3 meals, each roughly ${calorieTarget} calories, targeting ${protein}% protein, ${fat}% fat, ${carbs}% carbs, all in the ${cuisinePreference} cuisine style.`
    : `Generate 3 meals, each roughly ${calorieTarget} calories, targeting ${protein}% protein, ${fat}% fat, ${carbs}% carbs.`;

  //'await' makes it synchronous, pauses this line until Promise resovles,  if just plain 'model.generateContent' it will generate a promise instead of the result,
  // 'await' makes the code pause and wait for the actual repsonse before proceeding to next line
  // the network call is still async under the hood, we're just waiting for its result before continuing.
  // await is only allowed to appear inside a function marked async — that's a hard JavaScript rule, not optional styling.
  // wrapped in try/catch now — if Gemini throws (rate limit, outage, etc.), we return a real JSON error
  // instead of an empty response body that would crash the frontend's res.json() call.
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }],
        },
      ],
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

  // For each of Gemini's 3 meals, generate a matching plate image URL from its own ingredient list.
  const meals = (parsed.meals ?? []).map((meal: any) => ({
    ...meal,
    imageUrl: buildImageUrl(buildImagePrompt(meal.items)),
  }));

  return NextResponse.json({ meals });
}
