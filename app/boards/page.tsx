
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TEMP_USER_ID } from "@/lib/constants";
import { sumMacros } from "@/lib/totals";
import styles from "../components/Boards.module.css";

export default async function BoardsPage() {
  // Each board with the macros of every meal linked to it through board_meals.
  const { data: boards, error } = await supabase
    .from("boards")
    .select("id, name, board_meals(meals(calories, protein, fat, carbs))")
    .eq("user_id", TEMP_USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Failed to load boards: {error.message}</p>;
  }

  if (!boards || boards.length === 0) {
    return <p>No boards yet — use "Add to board" on a saved meal to create one.</p>;
  }

  return (
    <div className={styles.boardGrid}>
      {boards.map((board: any) => {
        const meals = (board.board_meals ?? [])
          .map((bm: any) => bm.meals)
          .filter(Boolean);
        const totals = sumMacros(meals);

        return (
          <Link key={board.id} href={`/boards/${board.id}`} className={styles.boardCard}>
            <span className={styles.boardName}>{board.name}</span>
            <span className={styles.boardTotals}>
              {meals.length} meal{meals.length === 1 ? "" : "s"} · {Math.round(totals.calories)} kcal
            </span>
          </Link>
        );
      })}
    </div>
  );
}