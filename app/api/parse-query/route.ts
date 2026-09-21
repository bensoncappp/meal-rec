import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// This step's ONLY job is understanding what the user typed — not generating food.
// Same principle as the AI/algorithm split for portions: each step does the one thing it's best at,
// and defaults for anything unspecified are applied by our own code, not guessed by the AI.
const EXTRACTION_PROMPT = `Extract structured meal-planning parameters from the user's natural-language request.

Rules:
- calorieTarget: a number if mentioned, otherwise null
- proteinPercent, fatPercent, carbPercent: numbers ONLY if the user gives an explicit macro split. Do not convert vague goals like "high protein" into a number — leave null instead.
- cuisinePreference: a cuisine style if mentioned (e.g. "Mexican", "Japanese"), otherwise null
- Return ONLY valid JSON, no other text, in this exact shape:
{
  "calorieTarget": 000,
  "proteinPercent": 00,
  "fatPercent": 00,
  "carbPercent": 00,
  "cuisinePreference": "string or null"
}`;

export async function POST(req: Request) {
  const { query } = await req.json();

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: EXTRACTION_PROMPT + "\n\nUser request: " + query }],
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Query parsing failed", detail: err.message ?? String(err) },
      { status: 502 },
    );
  }

  const text = response.text;
  if (!text) {
    return NextResponse.json(
      { error: "Gemini returned no text" },
      { status: 500 },
    );
  }

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
