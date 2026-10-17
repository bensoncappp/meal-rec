import { supabase } from "@/lib/supabase";
import { deleteMealIfOrphan } from "@/lib/mealCleanup";
import { NextResponse } from "next/server";

// Deletes a board. Saved meals are NOT deleted. A meal that was only on this board
// (not saved, on no other board) has nothing left pointing at it, so it's cleaned up too.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: links } = await supabase
    .from("board_meals")
    .select("meal_id")
    .eq("board_id", id);

  await supabase.from("board_meals").delete().eq("board_id", id);
  const { error } = await supabase.from("boards").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const link of links ?? []) {
    await deleteMealIfOrphan(link.meal_id);
  }

  return NextResponse.json({ success: true });
}