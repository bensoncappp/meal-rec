import { supabase } from "@/lib/supabase";

// The image's file name inside the meal-images bucket, taken from its public URL.
function storageFileName(url: string | null) {
  if (!url) return null;
  const marker = "/meal-images/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length).split("?")[0];
}

// A meal row only needs to exist while it's saved OR on at least one board.
// Once it's neither, nothing can reach it any more, so delete it (ingredients, stored image, row).
// Returns true if the meal is gone afterwards.
export async function deleteMealIfOrphan(mealId: string): Promise<boolean> {
  const { data: meal } = await supabase
    .from("meals")
    .select("id, is_saved, image_url")
    .eq("id", mealId)
    .maybeSingle();

  if (!meal) return true; // already gone
  if (meal.is_saved) return false; // still in Saved Meals

  const { count } = await supabase
    .from("board_meals")
    .select("*", { count: "exact", head: true })
    .eq("meal_id", mealId);
  if ((count ?? 0) > 0) return false; // still on a board

  await supabase.from("meal_items").delete().eq("meal_id", mealId);
  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) return false;

  const file = storageFileName(meal.image_url);
  if (file) await supabase.storage.from("meal-images").remove([file]);
  return true;
}