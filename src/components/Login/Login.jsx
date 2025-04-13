import React from "react";
import "./Login.css";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const { signIn } = useAuth();

  return (
    <main className="login-container">
      <section className="login-form-container">
        <h2 className="login-title">Login</h2>
        <button className="login-google-button" onClick={signIn}>
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