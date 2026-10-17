"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import MealCard from "./components/MealCard";
import CalorieSlider from "./components/CalorieSlider";
import MacroPie from "./components/MacroPie";
import {
  DEFAULT_CALORIES,
  DEFAULT_SPLIT,
  clampCalories,
  mergeSplit,
  type Split,
} from "@/lib/macros";
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

function HomeInner() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The targets the user dials in with the slider + pie. These are the product defaults now
  // (700 kcal per meal, 50% carbs / 30% protein / 20% fat) — they live in lib/macros.ts,
  // applied in code, not trusted to the AI, so they're consistent every time.
  const [calorieTarget, setCalorieTarget] = useState(DEFAULT_CALORIES);
  const [split, setSplit] = useState<Split>(DEFAULT_SPLIT);
  const [resetCount, setResetCount] = useState(0); // bumping this remounts the pie (resets its rotation)

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

  function resetTargets() {
    setCalorieTarget(DEFAULT_CALORIES);
    setSplit(DEFAULT_SPLIT);
    setResetCount((c) => c + 1);
  }

  async function handleGenerate(query: string) {
    setLoading(true);
    setError("");
    setMeals([]);

    try {
      // Step 1 — understand what the user typed
      const parseRes = await fetch("/api/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Couldn't read that search");

      // Step 2 — "typed words win": anything the user actually typed overrides the sliders,
      // and the sliders then jump to match. Anything they didn't type keeps the slider value.
      const calories =
        typeof parsed.calorieTarget === "number"
          ? clampCalories(parsed.calorieTarget)
          : calorieTarget;
      const mergedSplit = mergeSplit(split, {
        carbs: parsed.carbPercent,
        protein: parsed.proteinPercent,
        fat: parsed.fatPercent,
      });
      setCalorieTarget(calories);
      setSplit(mergedSplit);

      const resolved = {
        calorieTarget: calories,
        protein: mergedSplit.protein,
        fat: mergedSplit.fat,
        carbs: mergedSplit.carbs,
        cuisinePreference: parsed.cuisinePreference ?? null,
        // what the user actually asked to see (e.g. "prawn") + other preferences (e.g. "spicy").
        mustInclude: parsed.mustInclude ?? [],
        notes: parsed.notes ?? null,
      };

      // Step 3 — generate
      const res = await fetch("/api/generate-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolved),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      for (const meal of data.meals ?? []) {
        if (meal.imageUrl) await preloadImage(meal.imageUrl);
        setMeals((prev) => [...prev, meal]);
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

    // Nothing to show yet: no results, not loading, no error -> show the "results go here" placeholder
  const showEmpty = !loading && !error && meals.length === 0;

  return (
    <div className={styles.layout}>
      <div className={styles.results}>
        {showEmpty && (
          <div className={styles.empty}>
            <span className={styles.emptyEmoji}>🍽️</span>
            <p className={styles.emptyText}>Your results will be displayed here</p>
          </div>
        )}

        {loading && meals.length === 0 && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Generating meals</p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.scrollArea}>
          {meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}
        </div>
      </div>

      {/* targets panel now sits on the right-hand side */}
      <aside className={styles.panel}>
        <h2 className={styles.panelTitle}>Your targets</h2>

        <CalorieSlider value={calorieTarget} onChange={setCalorieTarget} />

        <MacroPie
          key={resetCount}
          value={split}
          onChange={setSplit}
          calories={calorieTarget}
        />

        <div className={styles.panelFooter}>
          <button className={styles.resetButton} onClick={resetTargets}>
            Reset
          </button>
          <span className={styles.hint}>Applies to your next search</span>
        </div>
      </aside>
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