import MacroPie from "./MacroPie";
import type { Split } from "@/lib/macros";
import styles from "./MealDetailModal.module.css";

type Ingredient = {
  food: string;
  grams: number;
};

type Meal = {
  name?: string | null;
  cuisine?: string;
  items: Ingredient[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
  imageUrl?: string | null;
};

export default function MealDetailModal({
  meal,
  onClose,
  onSave,
  saved,
  saving,
  onAddToBoard,
  locked,
  split,
  onSplitChange,
  onResetSplit,
  resetKey,
  adjusted,
  limited,
}: {
  meal: Meal;
  onClose: () => void;
  // Home results only: Save / Saved toggle and Add to board
  onSave?: (e: React.MouseEvent) => void;
  saved?: boolean;
  saving?: boolean;
  onAddToBoard?: (e: React.MouseEvent) => void;
  locked?: boolean; // meal is stored (saved or on a board) -> macros can't be changed any more
  // The macro pie only appears when the parent passes these (Home results). Saved Meals doesn't.
  split?: Split;
  onSplitChange?: (s: Split) => void;
  onResetSplit?: () => void;
  resetKey?: number;
  adjusted?: boolean; // true once the user has changed the macros
  limited?: boolean; // true when the ingredients can't reach the target any closer
}) {
  const showPie = !!split && !!onSplitChange;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.wrap} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal}>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>

          <div className={styles.left}>
            <h2 className={styles.title}>{meal.name || "Untitled meal"}</h2>
            <p className={styles.calories}>
              {Math.round(meal.totals.calories)} kcal
            </p>
            {meal.cuisine && <p className={styles.cuisine}>{meal.cuisine}</p>}
            <div className={styles.macros}>
              <span>P {Math.round(meal.totals.protein)}g</span>
              <span>F {Math.round(meal.totals.fat)}g</span>
              <span>C {Math.round(meal.totals.carbs)}g</span>
            </div>

            <ul className={styles.list}>
              {meal.items.map((item) => (
                <li key={item.food} className={styles.item}>
                  <span className={styles.food}>{item.food}</span>
                  <span>{item.grams}g</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.imageBox}>
            {meal.imageUrl ? (
              <img
                src={meal.imageUrl}
                alt={meal.name ?? meal.cuisine ?? "Meal"}
                className={styles.image}
              />
            ) : (
              <div className={styles.placeholder} />
            )}

            {showPie && (
              <section className={styles.tune}>
                <div className={styles.tuneHeader}>
                  <h3 className={styles.tuneTitle}>Adjust macros</h3>
                  {adjusted && !locked && (
                    <button className={styles.resetBtn} onClick={onResetSplit}>
                      Reset
                    </button>
                  )}
                </div>

                <MacroPie
                  key={resetKey}
                  value={split!}
                  onChange={onSplitChange!}
                  calories={Math.round(meal.totals.calories)}
                  disabled={locked}
                />

                {locked ? (
                  <p className={styles.note}>
                    Macros are locked once a meal is saved or on a board.
                  </p>
                ) : limited ? (
                  <p className={styles.note}>
                    Closest this meal&apos;s ingredients allow.
                  </p>
                ) : null}
              </section>
            )}
          </div>
        </div>

        {(onSave || onAddToBoard) && (
          <div className={styles.actions}>
            {onSave && (
              <button
                className={styles.actionButton}
                onClick={onSave}
                disabled={saving}
                aria-label={saved ? "Remove from saved meals" : "Save meal"}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill={saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <path d="M6 3h12v18l-6-4-6 4z" />
                </svg>
                <span>{saved ? "Saved" : "Save"}</span>
              </button>
            )}
            {onAddToBoard && (
              <button
                className={styles.actionButton}
                onClick={onAddToBoard}
                disabled={saving}
                aria-label="Add to board"
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="4" y="4" width="16" height="16" rx="3" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
                <span>Add to board</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}