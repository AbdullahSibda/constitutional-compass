import React from "react";
import "./Login.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom"; // Importing useNavigate for navigation

const Login = () => {
  const { signIn } = useAuth();

  return (
    <div className="login-container">
      <div className="login-form-container">
        <h2 className="login-title">Login</h2>
        <button className="login-google-button" onClick={signIn}>
          <img
            src="https://imagepng.org/wp-content/uploads/2019/08/google-icon.png"
            alt="Google Logo"
            className="login-google-logo"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f5f5f5",
  },
  formContainer: {
    padding: "20px",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
    fontSize: "24px",
    color: "#333",
  },
  googleButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 20px",
    border: "none",
    borderRadius: "4px",
    backgroundColor: "#4285F4",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  googleLogo: {
    width: "20px",
    height: "20px",
    marginRight: "10px",
  },
};

export default Login;
