"use client";

import { useState } from "react";
import MealCard from "./components/MealCard";
import styles from "./page.module.css";

type Ingredient = {
  food: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};
type Meal = {
  cuisine?: string;
  items: Ingredient[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
  imageUrl: string;
};

// Preloads one image URL and resolves once it's loaded (or failed) — used to serialize image
// requests one at a time, since Pollinations' free tier only allows 1 in-flight request per IP.
function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

// Your product defaults from the functional requirements — applied here in code,
// not trusted to the AI, so they're guaranteed consistent every time.
const DEFAULT_CALORIE_TARGET = 2000;
const DEFAULT_PROTEIN = 30;
const DEFAULT_FAT = 25;
const DEFAULT_CARBS = 45;

export default function Home() {
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setMeals([]);

    // Step 1 — understand what the user typed
    const parseRes = await fetch("/api/parse-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const parsed = await parseRes.json();

    // Step 2 — fill in anything the user didn't specify, with OUR defaults, not AI's guess
    const resolved = {
      calorieTarget: parsed.calorieTarget ?? DEFAULT_CALORIE_TARGET,
      protein: parsed.proteinPercent ?? DEFAULT_PROTEIN,
      fat: parsed.fatPercent ?? DEFAULT_FAT,
      carbs: parsed.carbPercent ?? DEFAULT_CARBS,
      cuisinePreference: parsed.cuisinePreference ?? null,
    };

    // Step 3 — generate, exactly as before, just with resolved values instead of raw form inputs
    const res = await fetch("/api/generate-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resolved),
    });

    const data = await res.json();

    for (const meal of data.meals ?? []) {
      await preloadImage(meal.imageUrl);
      setMeals((prev) => [...prev, meal]);
    }

    setLoading(false);
  }

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Type in your cravings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate meal"}
        </button>
      </div>

      <div className={styles.scrollArea}>
        {meals.map((meal, i) => (
          <MealCard key={i} meal={meal} />
        ))}
      </div>
    </div>
  );
}
