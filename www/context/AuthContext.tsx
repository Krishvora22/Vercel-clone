/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { type User } from "../types/types";

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mapUser = (user: any): User | null => {
      if (!user) return null;
      return {
        id: user.id,
        email: user.email ?? "",
        user_metadata: {
          full_name: user.identities?.[0]?.identity_data?.preferred_username,
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
    };

    const getSession = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) throw new Error("No user in session");

        const id = user.id;
        const email = user.email;
        const name = user.user_metadata?.user_name;
        const profile_photo = user.user_metadata?.avatar_url;
        const github_token = sessionData?.session?.provider_token;

        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (existingUser) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ github_token })
            .eq("email", email);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("users")
            .insert({ id, name, email, profile_photo, github_token });

          if (insertError) {
            console.error(
              "Error inserting new user into database:",
              insertError,
            );
            throw insertError;
          }
        }

        setUser(mapUser(user));
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(mapUser(session?.user));
        setLoading(false);
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
