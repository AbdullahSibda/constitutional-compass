import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./AuthCallback.css"; // We'll create this CSS file

const AuthCallback = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on user role
      if (userRole === 'admin' || userRole === 'moderator') {
        navigate('/dashboard');
      } else if (userRole === 'pending') {
        navigate('/'); // Send pending users back home
      } else {
        navigate('/PostLogin');
      }
    }
  }, [user, userRole, loading, navigate]);

  return (
    <main className="auth-callback-container">
      <article className="auth-callback-content">
        <p className="auth-callback-message">Loading user information...</p>
      </article>
    </main>
  );
};

export default AuthCallback;