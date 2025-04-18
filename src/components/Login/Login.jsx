import React from "react";
import { useNavigate } from "react-router-dom"; // Import the navigate hook
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate(); // Initialize navigate
  const { signIn } = useAuth(); // Get the signIn function from AuthContext

  const handleSignIn = async () => {
    try {
      await signIn(); // Call signIn method from AuthContext to sign in with Google
      navigate("/prelogin"); // Redirect to Prelogin page after login
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <main className="login-container">
      <section className="login-form-container">
        <h2 className="login-title">Login</h2>
        <button className="login-google-button" onClick={handleSignIn}>
          <img
            src="https://imagepng.org/wp-content/uploads/2019/08/google-icon.png"
            alt="Google Logo"
            className="login-google-logo"
          />
          Sign in with Google
        </button>
      </section>
    </main>
  );
};

export default Login;