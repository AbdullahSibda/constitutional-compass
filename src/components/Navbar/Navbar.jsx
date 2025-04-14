import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/"); // Redirect to home after logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <nav className="navbar">
      <header className="navbar-logo">
        <Link to="/">Constitutional Compass</Link>
      </header>
      <ul className="navbar-links">
        <li>
          <Link to="/about">About</Link>
        </li>
        <li>
          <Link to="/features">Features</Link>
        </li>
        <li>
          <Link to="/contact">Contact</Link>
        </li>
        {user ? (
          <li>
            <button className="navbar-logout" onClick={handleLogout}>
              Logout
            </button>
          </li>
        ) : (
          <li>
            <Link to="/login">Want to contribute?</Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
