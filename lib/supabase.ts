import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL is wrong. Length=${(url || "").length}. First 20 chars=[${(url || "").slice(0, 20)}]. Expected something like https://abcdxyz.supabase.co`
  );
}
if (!key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
}

export const supabase = createClient(url, key);