import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TEMP_USER_ID } from "@/lib/constants";
import { sumMacros } from "@/lib/totals";
import styles from "../components/Boards.module.css";

export default async function BoardsPage() {
  // Each board with the macros of every meal linked to it through board_meals.
  const { data: boards, error } = await supabase
    .from("boards")
    .select(
      "id, name, board_meals(meals(calories, protein, fat, carbs, image_url))",
    )
    .eq("user_id", TEMP_USER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Failed to load boards: {error.message}</p>;
  }

  if (!boards || boards.length === 0) {
    return (
      <div>
        <h1 className={styles.pageTitle}>Your Saved Boards</h1>
        <p>No boards yet — use "Add to board" on a saved meal to create one.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Your Saved Boards</h1>
      <div className={styles.boardGrid}>
        {boards.map((board: any) => {
          const meals = (board.board_meals ?? [])
            .map((bm: any) => bm.meals)
            .filter(Boolean);
          const totals = sumMacros(meals);
          const thumbs = meals
            .map((m: any) => m.image_url)
            .filter(Boolean)
            .slice(0, 4);

          return (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className={styles.boardLink}
            >
              <div className={styles.boardCard}>
                {thumbs.map((src: string, i: number) => (
                  <img key={i} src={src} alt="" className={styles.boardThumb} />
                ))}
              </div>
              <div className={styles.boardMeta}>
                <span className={styles.boardName}>{board.name}</span>
                <span className={styles.boardTotals}>
                  ={Math.round(totals.calories)}kcal
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}