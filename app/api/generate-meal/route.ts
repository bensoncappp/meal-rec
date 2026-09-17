import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// This creates one "client" object, authenticated with your API key. basically just another layer of abstraction
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are a meal-planning assistant. Given a calorie target and macro split, suggest realistic food combinations for a single meal.

Rules:
- Only suggest whole, generic ingredients — never branded or packaged products.
- Each ingredient name MUST be qualified with its preparation state (e.g. "raw", "uncooked", "boneless, skinless") so it can be looked up accurately in a nutrition database.
- Do NOT calculate or output any gram amounts, calories, or macros yourself — that will be handled separately.
- Return ONLY valid JSON, no other text, in this exact shape:
{
  "ingredients": ["ingredient name 1", "ingredient name 2", "ingredient name 3"]
}`;

//conventiaonl set style to write like this
export async function POST(req: Request) {
  const { calorieTarget, protein, fat, carbs } = await req.json();

  //Builds the actual question to ask Gemini, using the values the user sent in.
  const userPrompt = `Suggest a meal with roughly ${calorieTarget} calories, targeting ${protein}% protein, ${fat}% fat, ${carbs}% carbs.`;

  //'await' makes it synchronous, pauses this line until Promise resovles,  if just plain 'model.generateContent' it will generate a promise instead of the result,
  // 'await' makes the code pause and wait for the actual repsonse before proceeding to next line
  // the network call is still async under the hood, we're just waiting for its result before continuing.
  // await is only allowed to appear inside a function marked async — that's a hard JavaScript rule, not optional styling.
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] },
    ],
  });

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
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid JSON", raw: text },
      { status: 500 },
    );
  }
}
