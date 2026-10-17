"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MealCard.module.css";
import { TEMP_USER_ID } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { rebalance, splitOfItems } from "@/lib/rebalance";
import type { Split } from "@/lib/macros";
import type { CardState } from "@/lib/homeCache";
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
type Board = { id: string; name: string };

export default function MealCard({
  meal: original,
  initial,
  onStateChange,
}: {
  meal: Meal;
  initial?: CardState; // restored from the Home cache when you come back to the page
  onStateChange?: (s: CardState) => void;
}) {
  // `mealId` = this meal's row in the database. It exists once the meal has been saved OR put on a board.
  // `saved`  = whether it's in the Saved Meals list. The two are independent: a meal can sit on a
  //            board without ever being saved, and saving doesn't put it on a board.
  const [mealId, setMealId] = useState<string | null>(initial?.mealId ?? null);
  const [saved, setSaved] = useState(initial?.saved ?? false);
  const idRef = useRef<string | null>(initial?.mealId ?? null); // always-current copy of mealId
  const creating = useRef<Promise<string | null> | null>(null); // stops two quick clicks creating two rows

  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [picker, setPicker] = useState<{
    boards: Board[];
    memberOf: string[];
  } | null>(null); // not null = "Choose board" modal is open

  // The macro pie lives here (not in the modal) so the card, the modal and the saved copy all see
  // the SAME adjusted meal. `split` is null until the user touches the pie = the AI's original meal.
  const baseSplit = useMemo(() => splitOfItems(original.items), [original.items]);
  const [split, setSplit] = useState<Split | null>(initial?.split ?? null);
  const [resetKey, setResetKey] = useState(0); // remounts the pie on reset so its rotation resets too

  // Report database id / saved flag / tweaks upward so the Home cache can restore them later.
  useEffect(() => {
    onStateChange?.({ mealId, saved, split });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, saved, split]);

  const adjusted = useMemo(
    () => (split ? rebalance(original.items, split) : null),
    [original.items, split],
  );

  // `meal` is what everything below shows and stores: the adjusted version if there is one.
  const meal: Meal = adjusted
    ? { ...original, items: adjusted.items, totals: adjusted.totals }
    : original;

  function resetSplit() {
    setSplit(null);
    setResetKey((k) => k + 1);
  }

  // The meal's database row is gone (removed from another page) -> go back to "never stored".
  function forget() {
    idRef.current = null;
    setMealId(null);
    setSaved(false);
  }

  // Makes sure the meal exists in the database and returns its id.
  // `asSaved` only matters when it has to be created: Save creates it as saved,
  // Add to board creates it as NOT saved (it only lives on the board).
  function ensureMeal(asSaved: boolean): Promise<string | null> {
    if (idRef.current) return Promise.resolve(idRef.current);
    if (creating.current) return creating.current;

    const p = (async () => {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEMP_USER_ID,
          name: meal.name ?? null,
          ingredients: meal.items, // the adjusted ingredients, if the user changed the macros
          totals: meal.totals,
          imageUrl: meal.imageUrl ?? null,
          saved: asSaved,
        }),
      });
      if (!res.ok) return null;
      const { mealId: id } = await res.json();
      idRef.current = id;
      setMealId(id);
      setSaved(asSaved);
      return id as string;
    })().finally(() => {
      creating.current = null;
    });

    creating.current = p;
    return p;
  }

  // Save / Saved toggle. Only touches the Saved Meals list, never the boards.
  async function handleSave(e?: React.MouseEvent) {
    e?.stopPropagation(); // don't also trigger the card's expand click
    if (busy) return;
    setBusy(true);
    try {
      if (!idRef.current) {
        await ensureMeal(true); // not stored yet: create it as saved
        return;
      }

      const next = !saved;
      const res = await fetch(`/api/meals/${idRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: next }),
      });
      if (res.status === 404) {
        forget();
        return;
      }
      if (!res.ok) return;

      // `deleted` = it was only saved (on no board), so un-saving removed the row completely
      const { deleted } = await res.json();
      if (deleted) forget();
      else setSaved(next);
    } finally {
      setBusy(false);
    }
  }

  // Opens the board picker. The meal isn't stored until you actually add it to a board,
  // so opening and closing the picker leaves nothing behind.
  async function handleAddToBoard(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const { data: boards } = await supabase
        .from("boards")
        .select("id, name")
        .eq("user_id", TEMP_USER_ID)
        .order("created_at", { ascending: false });

      let memberOf: string[] = [];
      if (idRef.current) {
        const { data: links } = await supabase
          .from("board_meals")
          .select("board_id")
          .eq("meal_id", idRef.current);
        memberOf = (links ?? []).map((l) => l.board_id);
      }

      setPicker({ boards: boards ?? [], memberOf });
    } finally {
      setBusy(false);
    }
  }

  const previewItems = meal.items.slice(0, 4);
  const hasMore = meal.items.length > 4;

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

        {/* beside the card: shows on hover, and stays visible once the meal is saved / on a board */}
        <div className={`${styles.sideActions} ${mealId ? styles.pinned : ""}`}>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={busy}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M6 3h12v18l-6-4-6 4z" />
            </svg>
            {saved ? "Saved" : "Save"}
          </button>

          <button
            className={styles.saveButton}
            onClick={handleAddToBoard}
            disabled={busy}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M12 9v6M9 12h6" />
            </svg>
            Add to board
          </button>
        </div>
      </div>

      {expanded && (
        <MealDetailModal
          meal={meal}
          onClose={() => setExpanded(false)}
          onSave={handleSave}
          saved={saved}
          saving={busy}
          onAddToBoard={handleAddToBoard}
          locked={!!mealId}
          split={split ?? baseSplit}
          onSplitChange={setSplit}
          onResetSplit={resetSplit}
          resetKey={resetKey}
          adjusted={!!adjusted}
          limited={adjusted?.limited ?? false}
        />
      )}

      {picker && (
        <AddToBoardModal
          getMealId={() => ensureMeal(false)}
          boards={picker.boards}
          memberOf={picker.memberOf}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}