"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  name?: string;
  cuisine?: string;
  items: Ingredient[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
  imageUrl?: string | null;
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

function HomeInner() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  // The search bar lives in the TopBar, which puts the query in the URL (?q=...).
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const key = searchParams.toString();
  const lastKey = useRef<string | null>(null); // stops dev StrictMode running the search twice

  useEffect(() => {
    if (!q || lastKey.current === key) return;
    lastKey.current = key;
    handleGenerate(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function handleGenerate(query: string) {
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
      // what the user actually asked to see (e.g. "prawn") + other preferences (e.g. "spicy").
      // Without these the generator never learns what the craving was.
      mustInclude: parsed.mustInclude ?? [],
      notes: parsed.notes ?? null,
    };

    // Step 3 — generate, exactly as before, just with resolved values instead of raw form inputs
    const res = await fetch("/api/generate-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resolved),
    });

    const data = await res.json();

    for (const meal of data.meals ?? []) {
      if (meal.imageUrl) await preloadImage(meal.imageUrl);
      setMeals((prev) => [...prev, meal]);
    }

    setLoading(false);
  }

  return (
    <div>
      {loading && meals.length === 0 && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Generating meals</p>
        </div>
      )}

      <div className={styles.scrollArea}>
        {meals.map((meal, i) => (
          <MealCard key={i} meal={meal} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}