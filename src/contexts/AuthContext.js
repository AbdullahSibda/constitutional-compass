import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data?.role || 'user'; 
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authListener;

    const initializeAuth = async () => {
      try {
        // First check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (isMounted) {
            setSession(session);
            setUser(session.user);
            setUserRole(role);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      // Then set up the auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return;

          if (session?.user) {
            const role = await fetchUserRole(session.user.id);
            setSession(session);
            setUser(session.user);
            setUserRole(role);
          } else {
            setSession(null);
            setUser(null);
            setUserRole(null);
          }
          setLoading(false);
        }
      );
      authListener = subscription;
    };

    initializeAuth();

    return () => {
      isMounted = false;
      authListener?.unsubscribe();
    };
  }, []);

  const siteUrl =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://wonderful-river-0d8fbf010.6.azurestaticapps.net";

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth-callback`,
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
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userRole,
      signIn, 
      signOut, 
      supabase, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};