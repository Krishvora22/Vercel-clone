import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://supabase.priyanshuvaliya.dev";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczMDY1MDYyLCJleHAiOjE5MzA3NDUwNjJ9.D53Rr_3BrQr_jSKM16u5Yh1Lb-AKeDqZEtvLsJmb6DE";

  // if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  //   throw new Error("Missing Supabase environment variables");
  // }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(async ({ name, value, options }) => {
          cookieStore.set(name, value, {
            ...options,
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });
        });
      },
    },
  });
}
