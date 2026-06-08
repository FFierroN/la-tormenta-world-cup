import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Aviso temprano y claro si falta config (no rompemos el render).
  console.warn(
    "[Tormenta] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
