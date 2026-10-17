import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Downloads the image from a given URL (our own /api/plate-image route) and uploads
// the actual bytes into Supabase Storage, returning a stable, permanent public URL.
// This means saved meals own their own copy of the image instead of depending on
// the image generator being up, or on that prompt still giving the same picture later.
async function saveImageToStorage(
  sourceUrl: string,
  origin: string,
): Promise<string | null> {
  try {
    // Our own images come back as a relative URL (/api/plate-image?...), which a server-side fetch can't use on its own,
    // so resolve it against this request's origin.
    const imageRes = await fetch(new URL(sourceUrl, origin));
    if (!imageRes.ok) return null;

    const buffer = Buffer.from(await imageRes.arrayBuffer());
    // Keep the real type (FLUX gives JPEG) instead of labelling everything png.
    const contentType = imageRes.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg") ? "jpg" : "png";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("meal-images")
      .upload(fileName, buffer, { contentType });

    if (uploadError) {
      console.error("Image upload failed:", uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("meal-images").getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error("Image fetch/upload error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  // `saved` decides whether the meal shows up in Saved Meals. A meal can also be created just so it
  // can sit on a board (saved: false). Left out = saved, so older callers keep working.
  const { userId, name, ingredients, totals, imageUrl, saved } = await req.json();

  // If a source image URL was provided, download it and store our own permanent copy first.
  // If this fails for any reason, we still save the meal — just without an image, rather than
  // blocking the whole save on an image problem.
  const storedImageUrl = imageUrl
    ? await saveImageToStorage(imageUrl, new URL(req.url).origin)
    : null;

  // 1. Insert the meal itself, get back its generated id
  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      name: name ?? null,
      calories: totals.calories,
      protein: totals.protein,
      fat: totals.fat,
      carbs: totals.carbs,
      image_url: storedImageUrl,
      is_saved: saved !== false,
    })
    .select()
    .single();

  if (mealError) {
    return NextResponse.json({ error: mealError.message }, { status: 500 });
  }

  // 2. Insert each ingredient, linked to that meal's id
  const items = ingredients.map((item: any) => ({
    meal_id: meal.id,
    food_name: item.food,
    grams: item.grams,
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
  }));

  const { error: itemsError } = await supabase.from("meal_items").insert(items);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, mealId: meal.id });
}