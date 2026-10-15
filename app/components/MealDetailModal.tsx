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
}: {
  meal: Meal;
  onClose: () => void;
  onSave?: (e: React.MouseEvent) => void;
  saved?: boolean;
  saving?: boolean;
}) {
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
          </div>
        </div>

        {onSave && (
          <button
            className={styles.saveButton}
            onClick={onSave}
            disabled={saving}
            aria-label="Save meal plan"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 3h12v18l-6-4-6 4z" />
            </svg>
            <span>{saved ? "Add to board" : "Save"}</span>
          </button>
        )}
      </div>
    </div>
  );
}