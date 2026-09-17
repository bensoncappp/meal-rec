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
type MealResult = {
  meal: Ingredient[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
};

export default function Home() {
  const [calorieTarget, setCalorieTarget] = useState(600);
  const [result, setResult] = useState<MealResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/generate-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calorieTarget, protein: 30, fat: 25, carbs: 45 }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.label}>
          Calorie target
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(Number(e.target.value))}
            className={styles.input}
          />
        </label>
        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate meal"}
        </button>
      </div>

      <div className={styles.grid}>
        {result && (
          <MealCard ingredients={result.meal} totals={result.totals} />
        )}
      </div>
    </div>
  );
}
