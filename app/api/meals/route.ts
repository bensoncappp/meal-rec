import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, name, ingredients, totals } = await req.json();

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
