import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../../contexts/AuthContext"; // Assuming you have an auth context for signOut

const Navbar = () => {
  const { signOut } = useAuth(); // Assuming you have signOut in the context
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();  // This is where you call the signOut function from the context
      navigate("/");    // After logging out, navigate to the home page
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const isDashboard = location.pathname.includes("dashboard");

  return (
    <nav className="navbar">
      <header className="navbar-logo">
        {isDashboard ? (
          <img
            src="/images/logo.png"
            alt="Logo"
            className="logo-image"
          />
        ) : (
          <Link to="/">
            Constitutional Compass
          </Link>
        )}
      </header>
      <ul className="navbar-links">
        {!isDashboard && (
          <>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/features">Features</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </>
        )}
        <li>
          <button className="navbar-logout" onClick={handleLogout}>
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
