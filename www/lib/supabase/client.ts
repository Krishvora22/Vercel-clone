import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.priyanshuvaliya.dev";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczMDY1MDYyLCJleHAiOjE5MzA3NDUwNjJ9.D53Rr_3BrQr_jSKM16u5Yh1Lb-AKeDqZEtvLsJmb6DE";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables in www !!");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
