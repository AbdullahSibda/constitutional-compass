import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./client";

// Create the context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Optional: sign in with magic link or providers
  const siteUrl =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://wonderful-river-0d8fbf010.6.azurestaticapps.net";
  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: siteUrl,
      },
    });

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, user, signIn, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);
