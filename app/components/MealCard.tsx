import { useState } from "react";
import styles from "./MealCard.module.css";
import { TEMP_USER_ID } from "@/lib/constants";

type Ingredient = {
  food: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};
type MealCardProps = {
  ingredients: Ingredient[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
};

export default function MealCard({ ingredients, totals }: MealCardProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: TEMP_USER_ID, ingredients, totals }),
    });

    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.calories}>
          {Math.round(totals.calories)} kcal
        </span>
        <div className={styles.macros}>
          <span>P {Math.round(totals.protein)}g</span>
          <span>F {Math.round(totals.fat)}g</span>
          <span>C {Math.round(totals.carbs)}g</span>
        </div>
      </div>

      <ul className={styles.list}>
        {ingredients.map((item) => (
          <li key={item.food} className={styles.item}>
            <span className={styles.foodName}>{item.food}</span>
            <span className={styles.grams}>{item.grams}g</span>
          </li>
        ))}
      </ul>

      <button
        className={styles.saveButton}
        onClick={handleSave}
        disabled={saving || saved}
      >
        {saved ? "Saved ✓" : saving ? "Saving…" : "Save meal"}
      </button>
    </div>
  );
}
