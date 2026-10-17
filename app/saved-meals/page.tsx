import { supabase } from "@/lib/supabase";
import { TEMP_USER_ID } from "@/lib/constants";
import SavedMealCard from "../components/SavedMealCard";
import styles from "../page.module.css";
import boardStyles from "../components/Boards.module.css";

export default async function SavedMealsPage() {
  // Only meals the user actually saved. Meals that exist just because they sit on a board are not listed here.
  const { data: meals, error } = await supabase
    .from("meals")
    .select("*, meal_items(*), board_meals(board_id)")
    .eq("user_id", TEMP_USER_ID)
    .eq("is_saved", true)
    .order("created_at", { ascending: false });

  // The user's boards, so each card's modal can list them.
  const { data: boards } = await supabase
    .from("boards")
    .select("id, name")
    .eq("user_id", TEMP_USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Failed to load saved meals: {error.message}</p>;
  }

  if (!meals || meals.length === 0) {
    return (
      <div>
        <h1 className={boardStyles.pageTitle}>Saved Meals</h1>
        <p>No saved meals yet — hit Save on a result from the Home page.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={boardStyles.pageTitle}>Saved Meals</h1>
      <div className={styles.grid}>
        {meals.map((meal) => (
          <SavedMealCard key={meal.id} meal={meal} boards={boards ?? []} />
        ))}
      </div>
    </div>
  );
}