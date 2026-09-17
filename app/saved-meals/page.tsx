import { supabase } from "@/lib/supabase";
import { TEMP_USER_ID } from "@/lib/constants";
import SavedMealCard from "../components/SavedMealCard";
import styles from "../page.module.css";

export default async function SavedMealsPage() {
  const { data: meals, error } = await supabase
    .from("meals")
    .select("*, meal_items(*)")
    .eq("user_id", TEMP_USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Failed to load saved meals: {error.message}</p>;
  }

  if (!meals || meals.length === 0) {
    return (
      <p>No saved meals yet — generate one on the Home page and hit Save.</p>
    );
  }

  return (
    <div className={styles.grid}>
      {meals.map((meal) => (
        <SavedMealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}
