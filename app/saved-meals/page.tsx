import { supabase } from "@/lib/supabase";
import { TEMP_USER_ID } from "@/lib/constants";
import SavedMealCard from "../components/SavedMealCard";
import SortBar, { SORTS, type SortKey, type SortDir } from "../components/SortBar";
import styles from "../page.module.css";
import boardStyles from "../components/Boards.module.css";

// In Next 16 searchParams is a Promise.
type Props = {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
};

export default async function SavedMealsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sort = SORTS.find((s) => s.key === params.sort)?.key ?? null;
  const dir: SortDir = params.dir === "asc" ? "asc" : "desc";

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

  // Search: every word you type has to appear in the meal name or one of its ingredients.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = meals.filter((meal) => {
    if (words.length === 0) return true;
    const haystack = [
      meal.name,
      ...(meal.meal_items ?? []).map((i: any) => i.food_name),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  // Sort: no sort chosen = newest first (the order the query already gave us).
  if (sort) {
    const key: SortKey = sort;
    shown = [...shown].sort((a, b) => {
      const diff = Number(a[key]) - Number(b[key]);
      return dir === "asc" ? diff : -diff;
    });
  }

  return (
    <div>
      <h1 className={boardStyles.pageTitle}>Saved Meals</h1>
      <SortBar basePath="/saved-meals" q={q} sort={sort} dir={dir} />

      {shown.length === 0 ? (
        <p>No saved meals match "{q}".</p>
      ) : (
        <div className={styles.grid}>
          {shown.map((meal) => (
            <SavedMealCard key={meal.id} meal={meal} boards={boards ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}