"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./MealCard.module.css";
import AddToBoardButton from "./AddToBoardButton";
import MealDetailModal from "./MealDetailModal";

type MealItem = { food_name: string; grams: number };
type Meal = {
  id: string;
  name: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  image_url: string | null;
  meal_items: MealItem[];
  board_meals?: { board_id: string }[];
};

export default function SavedMealCard({
  meal,
  boards,
  boardId,
}: {
  meal: Meal;
  boards?: { id: string; name: string }[];
  boardId?: string; // set when this card is shown inside a board -> the button removes it from that board
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState<string>(meal.name ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [removing, setRemoving] = useState(false);
  const memberOf = (meal.board_meals ?? []).map((bm) => bm.board_id);

  async function saveName() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === name) return; // empty or unchanged: keep the old name
    const res = await fetch(`/api/meals/${meal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (res.ok) setName(next);
  }

  // In Saved Meals: take it off the saved list (it stays on any boards).
  // Inside a board: take it off that board (it stays in Saved Meals if saved).
  async function handleRemove() {
    const message = boardId
      ? "Remove this meal from the board? If you saved it, it stays in Saved Meals."
      : "Remove this meal from Saved Meals? It stays on any boards it's already on.";
    if (!window.confirm(message)) return;

    setRemoving(true);
    const res = boardId
      ? await fetch("/api/board-meals", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardId, mealId: meal.id }),
        })
      : await fetch(`/api/meals/${meal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: false }),
        });

    // 404 = it's already gone, which is what we wanted anyway
    if (res.ok || res.status === 404) {
      router.refresh(); // re-fetches the page so the card disappears
    } else {
      setRemoving(false);
      window.alert("Couldn't remove it. Try again.");
    }
  }

  return (
    <>
      <div className={styles.card} onClick={() => setExpanded(true)}>
        <div className={styles.left}>
          <div>
            {/* stopPropagation: editing the name shouldn't open the detail view */}
            <div className={styles.titleRow} onClick={(e) => e.stopPropagation()}>
              {editing ? (
                <input
                  autoFocus
                  className={styles.titleInput}
                  value={draft}
                  maxLength={80}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
              ) : (
                <>
                  <span
                    className={`${styles.title} ${name ? "" : styles.untitled}`}
                  >
                    {name || "Untitled meal"}
                  </span>
                  <button
                    className={styles.editBtn}
                    aria-label="Rename meal"
                    onClick={() => {
                      setDraft(name);
                      setEditing(true);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            <div className={styles.calories}>
              {Math.round(meal.calories)} kcal
            </div>
            <div className={styles.macros}>
              <span>P {Math.round(meal.protein)}g</span>
              <span>F {Math.round(meal.fat)}g</span>
              <span>C {Math.round(meal.carbs)}g</span>
            </div>
          </div>

          <ul className={styles.list}>
            {meal.meal_items.slice(0, 4).map((item, i) => (
              <li key={i} className={styles.item}>
                {item.food_name}
              </li>
            ))}
            {meal.meal_items.length > 4 && <li className={styles.more}>...</li>}
          </ul>

          {/* stopPropagation: clicking these buttons shouldn't also open the detail view */}
          <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
            {boards && (
              <AddToBoardButton
                mealId={meal.id}
                boards={boards}
                memberOf={memberOf}
              />
            )}
            <button
              className={styles.removeBtn}
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "Removing…" : boardId ? "Remove from board" : "Remove"}
            </button>
          </div>
        </div>

        <div className={styles.imagePanel}>
          {meal.image_url ? (
            <img src={meal.image_url} alt={name || "Saved meal"} className={styles.image} />
          ) : (
            <div className={styles.placeholder} />
          )}
        </div>
      </div>

      {expanded && (
        <MealDetailModal
          meal={{
            name,
            items: meal.meal_items.map((i) => ({
              food: i.food_name,
              grams: i.grams,
            })),
            totals: {
              calories: meal.calories,
              protein: meal.protein,
              fat: meal.fat,
              carbs: meal.carbs,
            },
            imageUrl: meal.image_url,
          }}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}