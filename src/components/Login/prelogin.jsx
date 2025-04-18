import React from "react";
import { useNavigate } from "react-router-dom";
import "./prelogin.css";
import { supabase } from '../../contexts/client';



const Prelogin = () => {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate("/dashboard");
  };

  const handleApplyClick = async() => {
    alert("Application Submitted, awaiting Verification.");
    await supabase.auth.signOut();
    navigate("/"); // Redirects to Home
  };

  return (
    <div className="prelogin-container">
      <section className="prelogin-popup">
        <h1 className="prelogin-title">Constitutional Compass</h1>
        <p className="prelogin-subtext">
          Apply to become an admin or if already verified, continue as admin:
        </p>

        <div className="prelogin-buttons">
          <button className="apply-button" onClick={handleApplyClick}>
            Apply To Be An Admin
          </button>
          <button
            className="google-login-button"
            onClick={handleLoginRedirect}
          >
            Continue as Admin
          </button>
        </div>
      </section>
    </div>
  );
};

export default Prelogin;

