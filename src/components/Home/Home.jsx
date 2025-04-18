import React, { useEffect, useState } from "react";
import "./Home.css";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const { user, signIn } = useAuth();
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      setReady(true);
      return;
    }
    const timeout = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (user && ready) {
      navigate("/dashboard");
    }
  }, [user, ready, navigate]);

  if (!ready) return null;

  return (
    <section className="app-container">
      <aside className="sidebar">
        <header className="sidebar-header">
          <img src="/images/logo.png" alt="Logo" className="logo-image" />
          <h1 className="sidebar-title">Constitutional Compass</h1>
        </header>

        {!user && (
  <nav className="auth-container">
  <Link to="/prelogin" className="auth-button">
    Become A Collaborator
  </Link>
</nav>
)}

      </aside>

      <main className="main-content">
        <article className="hero-section">
          {user && (
            <section className="welcome-section">
              <h2 className="welcome-message">Welcome back, {user.email}</h2>
              <Link to="/dashboard" className="dashboard-link">
                Go to Dashboard →
              </Link>
            </section>
          )}

          <p className="slogan">Navigate the Foundations of Democracy</p>
          
          <form
            className="search-container"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="text"
              placeholder="Ask the compass..."
              className="search-input"
            />
            <button className="search-button">
              <img src="/images/search.png" alt="Search" />
            </button>
          </form>

          <p className="tagline">
            Explore constitutional documents from across the world
          </p>
        </article>
      </main>
    </section>
  );
};

export default Home;
