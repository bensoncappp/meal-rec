import { supabase } from "@/lib/supabase";
import { deleteMealIfOrphan } from "@/lib/mealCleanup";
import { NextResponse } from "next/server";

// Updates a meal. `params` is a Promise in this Next.js version.
// Body is either { saved: boolean } (add to / remove from Saved Meals) or { name: string } (rename).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  // Save / unsave
  if (typeof body.saved === "boolean") {
    const { data, error } = await supabase
      .from("meals")
      .update({ is_saved: body.saved })
      .eq("id", id)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // 0 rows updated = the meal no longer exists (e.g. it was removed from another page)
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Meal not found", gone: true }, { status: 404 });
    }

    // Unsaving a meal that isn't on any board leaves nothing pointing at it -> clean it up.
    const deleted = body.saved ? false : await deleteMealIfOrphan(id);
    return NextResponse.json({ success: true, saved: body.saved, deleted });
  }

  // Rename
  const { name } = body;
  const trimmed = typeof name === "string" ? name.trim().slice(0, 80) : "";

  if (!trimmed) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("meals")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, name: trimmed });
}