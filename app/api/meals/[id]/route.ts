import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Renames a saved meal. `params` is a Promise in this Next.js version.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name } = await req.json();
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