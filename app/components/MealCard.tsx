"use client";

import { useState } from "react";
import styles from "./MealCard.module.css";
import { TEMP_USER_ID } from "@/lib/constants";
import MealDetailModal from "./MealDetailModal";

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

export default function MealCard({ meal }: { meal: Meal }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const previewItems = meal.items.slice(0, 4);
  const hasMore = meal.items.length > 4;

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation(); // don't also trigger the card's expand click
    setSaving(true);

    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: TEMP_USER_ID,
        ingredients: meal.items,
        totals: meal.totals,
      }),
    });

    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <>
      <div className={styles.card} onClick={() => setExpanded(true)}>
        <div className={styles.left}>
          <div className={styles.header}>
            <span className={styles.calories}>
              {Math.round(meal.totals.calories)} kcal
            </span>
            <div className={styles.macros}>
              <span>P {Math.round(meal.totals.protein)}g</span>
              <span>F {Math.round(meal.totals.fat)}g</span>
              <span>C {Math.round(meal.totals.carbs)}g</span>
            </div>
          </div>

          <ul className={styles.list}>
            {previewItems.map((item) => (
              <li key={item.food} className={styles.item}>
                {item.food}
              </li>
            ))}
            {hasMore && <li className={styles.more}>...</li>}
          </ul>
        </div>

        <div className={styles.imageWrap}>
          <img
            src={meal.imageUrl}
            alt={meal.cuisine ?? "Meal"}
            className={styles.image}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/placeholder-meal.png"; // add a simple placeholder image to /public
            }}
          />
          <button
            className={styles.saveIcon}
            onClick={handleSave}
            disabled={saving || saved}
            title="Save meal"
          >
            {saved ? "✓" : "🔖"}
          </button>
        </div>
      </div>

      {expanded && (
        <MealDetailModal meal={meal} onClose={() => setExpanded(false)} />
      )}
    </>
  );
}
