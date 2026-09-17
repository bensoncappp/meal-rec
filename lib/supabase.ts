import { createClient } from "@supabase/supabase-js";

//Any file that needs to query the database imports { supabase } from here, rather than creating a new client every time.

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
