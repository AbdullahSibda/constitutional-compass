import React from "react";
import { useNavigate } from "react-router-dom";
import "./prelogin.css";

const Prelogin = () => {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  return (
    <div className="prelogin-container">
      <section className="prelogin-popup">
        <h1 className="prelogin-title">Constitutional Compass</h1>
        <p className="prelogin-subtext">
          Apply to become an admin or login as admin below:
        </p>

        <div className="prelogin-buttons">
          <button className="apply-button">Apply To Be An Admin</button>
          <button
            className="google-login-button"
            onClick={handleLoginRedirect}
          >
            Login as Admin
          </button>
        </div>
      </section>
    </div>
  );
};

export default Prelogin;

