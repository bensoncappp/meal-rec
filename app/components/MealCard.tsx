"use client";

import { useMemo, useState } from "react";
import styles from "./MealCard.module.css";
import { TEMP_USER_ID } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { rebalance, splitOfItems } from "@/lib/rebalance";
import type { Split } from "@/lib/macros";
import MealDetailModal from "./MealDetailModal";
import AddToBoardModal from "./AddToBoardModal";

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

export default function MealCard({ meal: original }: { meal: Meal }) {
  const [savedMealId, setSavedMealId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [boards, setBoards] = useState<{ id: string; name: string }[] | null>(
    null,
  ); // not null = "Choose board" modal is open

  // The macro pie lives here (not in the modal) so the card, the modal and the Save button all see
  // the SAME adjusted meal. `split` is null until the user touches the pie = the AI's original meal.
  const baseSplit = useMemo(() => splitOfItems(original.items), [original.items]);
  const [split, setSplit] = useState<Split | null>(null);
  const [resetKey, setResetKey] = useState(0); // remounts the pie on reset so its rotation resets too

  const adjusted = useMemo(
    () => (split ? rebalance(original.items, split) : null),
    [original.items, split],
  );

  // `meal` is what everything below shows and saves: the adjusted version if there is one.
  const meal: Meal = adjusted
    ? { ...original, items: adjusted.items, totals: adjusted.totals }
    : original;

  function resetSplit() {
    setSplit(null);
    setResetKey((k) => k + 1);
  }

  const previewItems = meal.items.slice(0, 4);
  const hasMore = meal.items.length > 4;

  async function openBoardPicker() {
    const { data } = await supabase
      .from("boards")
      .select("id, name")
      .eq("user_id", TEMP_USER_ID)
      .order("created_at", { ascending: false });
    setBoards(data ?? []);
  }

  // First click: save the meal, then open the "Choose board" modal.
  // Later clicks: the meal is already saved, so just reopen the modal (no duplicate rows).
  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation(); // don't also trigger the card's expand click

    if (savedMealId) {
      await openBoardPicker();
      return;
    }

    setSaving(true);
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: TEMP_USER_ID,
        name: meal.name ?? null,
        ingredients: meal.items, // the adjusted ingredients, if the user changed the macros
        totals: meal.totals,
        imageUrl: meal.imageUrl ?? null,
      }),
    });

    if (res.ok) {
      const { mealId } = await res.json();
      setSavedMealId(mealId);
      await openBoardPicker();
    }
    setSaving(false);
  }

  return (
    <>
      <div className={styles.row}>
        <div className={styles.card} onClick={() => setExpanded(true)}>
          <div className={styles.left}>
            <div>
              <div className={styles.title}>{meal.name ?? "Meal"}</div>
              <div className={styles.calories}>
                {Math.round(meal.totals.calories)} kcal
              </div>
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

          <div className={styles.imagePanel}>
            {meal.imageUrl ? (
              <img
                src={meal.imageUrl}
                alt={meal.name ?? meal.cuisine ?? "Meal"}
                className={styles.image}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder-meal.png"; // add a simple placeholder image to /public
                }}
              />
            ) : (
              <div className={styles.placeholder} />
            )}
          </div>
        </div>

        <button
          className={`${styles.saveButton} ${savedMealId ? styles.savedState : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
          {saving
            ? "Saving…"
            : savedMealId
              ? "Saved · Add to board"
              : "Save meal plan"}
        </button>
      </div>

      {expanded && (
        <MealDetailModal
          meal={meal}
          onClose={() => setExpanded(false)}
          onSave={handleSave}
          saved={!!savedMealId}
          saving={saving}
          split={split ?? baseSplit}
          onSplitChange={setSplit}
          onResetSplit={resetSplit}
          resetKey={resetKey}
          adjusted={!!adjusted}
          limited={adjusted?.limited ?? false}
        />
      )}

      {boards && savedMealId && (
        <AddToBoardModal
          mealId={savedMealId}
          boards={boards}
          memberOf={[]}
          onClose={() => setBoards(null)}
        />
      )}
    </>
  );
}