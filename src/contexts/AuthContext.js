import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const refreshRef = useRef();

  const fetchUserRole = useCallback(async (userId) => {
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
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (newSession?.user) {
        const role = await fetchUserRole(newSession.user.id);
        setSession(newSession);
        setUser(newSession.user);
        setUserRole(role);
      } else {
        setSession(null);
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRole]);

  // Store refreshSession in ref
  useEffect(() => {
    refreshRef.current = refreshSession;
  }, [refreshSession]);

  useEffect(() => {
    let isMounted = true;
    let authListener;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRef.current?.();
      }
    };

    const initializeAuth = async () => {
      try {
        await refreshSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;
            refreshRef.current?.();
          }
        );
        authListener = subscription;

        document.addEventListener('visibilitychange', handleVisibilityChange);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshRef.current?.();
      }
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      authListener?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refreshSession]);

  // Rest of the component remains the same
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
      loading,
      refreshSession
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