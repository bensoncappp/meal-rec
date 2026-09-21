import styles from "./MealDetailModal.module.css";

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

export default function MealDetailModal({
  meal,
  onClose,
}: {
  meal: Meal;
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <img
          src={meal.imageUrl}
          alt={meal.cuisine ?? "Meal"}
          className={styles.image}
        />
        <h2>
          {Math.round(meal.totals.calories)} kcal
          {meal.cuisine ? ` — ${meal.cuisine}` : ""}
        </h2>
        <div className={styles.macros}>
          <span>Protein {Math.round(meal.totals.protein)}g</span>
          <span>Fat {Math.round(meal.totals.fat)}g</span>
          <span>Carbs {Math.round(meal.totals.carbs)}g</span>
        </div>
        <ul className={styles.list}>
          {meal.items.map((item) => (
            <li key={item.food} className={styles.item}>
              <span>{item.food}</span>
              <span>{item.grams}g</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
