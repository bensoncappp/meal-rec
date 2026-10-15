import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, name } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Board name is required" }, { status: 400 });
  }

  const { data: board, error } = await supabase
    .from("boards")
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ board });
}