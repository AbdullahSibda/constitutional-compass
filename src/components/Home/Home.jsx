import React, { useEffect, useState } from "react";
import "./Home.css";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";

const Home = () => {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    if (!loading && ready && user) {
      navigate("/dashboard");
    }
  }, [user, ready, loading, navigate]);

  if (loading || !ready) return <h2 className="loading">Loading...</h2>;

  return (
    <section className="app-container">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="main-content">
        <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          style={{ display: isSidebarOpen ? 'none' : 'block' }}
        >
          ☰
        </button>
        <article className="hero-section">
          <header className="home-header">
            <img src="/images/logo.png" alt="Logo" className="header-logo" />
            <h1 className="header-title">Constitutional Compass</h1>
          </header>
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