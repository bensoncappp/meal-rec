import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { boardId, mealId } = await req.json();

  const { error } = await supabase
    .from("board_meals")
    .insert({ board_id: boardId, meal_id: mealId });

  if (error) {
    // 23505 = primary key violation: this meal is already linked to this board.
    // The composite primary key on board_meals is what enforces this.
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already in this board" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}