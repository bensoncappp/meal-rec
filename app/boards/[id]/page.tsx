import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { sumMacros } from "@/lib/totals";
import SavedMealCard from "../../components/SavedMealCard";
import pageStyles from "../../page.module.css";
import styles from "../../components/Boards.module.css";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("boards")
    .select("id, name, board_meals(meals(*, meal_items(*)))")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const board = data as any;
  const meals = (board.board_meals ?? [])
    .map((bm: any) => bm.meals)
    .filter(Boolean);
  const totals = sumMacros(meals);

    return (
    <div>
        <Link href="/boards" className={styles.backLink}>← All boards</Link>
        <h1 className={styles.pageTitle}>{board.name}</h1>

        <div className={styles.summary}>
        <span className={styles.tag}>{Math.round(totals.calories)} kcal</span>
        <span className={styles.tag}>P {Math.round(totals.protein)}g</span>
        <span className={styles.tag}>F {Math.round(totals.fat)}g</span>
        <span className={styles.tag}>C {Math.round(totals.carbs)}g</span>
        </div>

        {meals.length === 0 ? (
        <p>No meals in this board yet.</p>
        ) : (
        <div className={pageStyles.grid}>
            {meals.map((meal: any) => (
            <SavedMealCard key={meal.id} meal={meal} />
            ))}
        </div>
        )}
    </div>
    );
}