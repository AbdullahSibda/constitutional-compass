import React, { useEffect, useState } from "react";
import "./Home.css";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import SearchResults from "../SearchResults/SearchResults";

const Home = () => {
  const { user, loading, userRole } = useAuth();
  const [ready, setReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setResults([]);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:4000/api/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced version of handleSearch
  // const debouncedSearch = debounce(handleSearch, 300);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    // debouncedSearch(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setReady(true);
      return;
    }
    const timeout = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timeout);
  }, []);

  if (loading || !ready) return <h2 className="loading">Loading...</h2>;

  return (
    <section className="app-container">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="main-content">
        <button
          data-testid="sidebar-toggle"
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          style={{ display: isSidebarOpen ? "none" : "block" }}
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
              <h2 className="welcome-message">Welcome, {user.email}</h2>
              {(userRole === "admin" || userRole === "moderator") && (
                <Link to="/dashboard" className="dashboard-link">
                  Go to Dashboard →
                </Link>
              )}
            </section>
          )}

          <p className="slogan">Navigate the Foundations of Democracy</p>

          <form className="search-container" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask the compass..."
              className="search-input"
              value={query}
              onChange={handleInputChange}
            />
            <button className="search-button" type="submit">
              <img src="/images/search.png" alt="Search" />
            </button>
          </form>
        </article>
        <section className="search-results-container">
          {isSearching && (
            <section className="loading-indicator">Searching...</section>
          )}
          {error && <section className="error-message">{error}</section>}
          {results.length > 0 && <SearchResults results={results} />}
        </section>

        <p className="tagline">
          Explore constitutional documents from across the world
        </p>
      </main>
    </section>
  );
};

export default Home;
