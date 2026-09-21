const fs = require("fs");

const sampleIngredients = [
  { food: "one whole 150g pan-seared chicken breast fillet", grams: 150 },
  { food: "fluffy white rice", grams: 200 },
  { food: "steamed broccoli florets", grams: 120 },
  { food: "extra virgin olive oil", grams: 10 }, // filtered out
];

const VISIBLE_THRESHOLD_GRAMS = 15;
const visibleIngredients = sampleIngredients.filter(
  (item) => item.grams >= VISIBLE_THRESHOLD_GRAMS,
);

// Give each food an explicit clock-position on the plate, instead of a vague "arranged separately"
const positions = ["at 12 o'clock", "at 4 o'clock", "at 8 o'clock"];
const layout = visibleIngredients
  .map((item, i) => `${positions[i]}: ${item.food}`)
  .join(", ");

const prompt = `Food photography, high 45-degree angle, one white circular plate with three separate portions: ${layout}. Natural matte texture, visible grill char marks on the chicken, shot on DSLR, soft diffused daylight, shallow depth of field, realistic, appetizing, plain background, no sauce, no garnish, no text, no utensils`;
const negativePrompt =
  "sauce, gravy, dollop, cream, mousse, blended, pudding, mixed together, garnish, mash, plastic texture, waxy, glossy shine, 3d render, cgi, illustration, cartoon, artificial";

async function testImageGeneration() {
  const params = new URLSearchParams({
    model: "flux",
    width: "1024",
    height: "1024",
    nologo: "true",
    enhance: "false",
    private: "true",
    negative: negativePrompt,
    seed: String(Math.floor(Math.random() * 1000000)),
  });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

  console.log("Requesting:", url);
  const start = Date.now();

  const res = await fetch(url);
  const elapsed = Date.now() - start;

  if (!res.ok) {
    console.log(`FAILED — status ${res.status}`);
    return;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("test-meal-image.png", buffer);

  console.log(`Success — ${elapsed}ms — saved to test-meal-image.png`);
}

testImageGeneration();
