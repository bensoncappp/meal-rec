import styles from "./MealCard.module.css";

type MealItem = {
  food_name: string;
  grams: number;
};

type Meal = {
  id: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  meal_items: MealItem[];
};

export default function SavedMealCard({ meal }: { meal: Meal }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.calories}>
          {Math.round(meal.calories)} kcal
        </span>
        <div className={styles.macros}>
          <span>P {Math.round(meal.protein)}g</span>
          <span>F {Math.round(meal.fat)}g</span>
          <span>C {Math.round(meal.carbs)}g</span>
        </div>
      </div>

      <ul className={styles.list}>
        {meal.meal_items.map((item, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.foodName}>{item.food_name}</span>
            <span className={styles.grams}>{item.grams}g</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
