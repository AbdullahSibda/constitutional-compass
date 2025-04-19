import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./client";

// Create the context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
        redirectTo: `${siteUrl}/dashboard`,
      },
    });

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = `${siteUrl}/`;
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signOut, supabase, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);