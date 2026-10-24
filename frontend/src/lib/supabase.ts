import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mpqpdpqafehxlknthzxh.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wcXBkcHFhZmVoeGxrbnRoenhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTg1MTksImV4cCI6MjEwODE3NDUxOX0.rXJU3dO5aeU_bHaCmy3KKvmhpVkRT2z9WwS7smJDGKg";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_bmA69hWIkIKnRyeMByb1tg_EV-Lr4k8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
