import React, { useEffect, useState } from "react";
import "./Home.css";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import SearchResults from "../SearchResults/SearchResults";
import { getCorrection } from "../../api/thirdParty/dymtService";
import { initializeDictionary } from "../utils/spellCheck";

const Home = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const [ready, setReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  const [misspelledWords, setMisspelledWords] = useState([]);

  const formatQueryForExactMatch = (searchQuery) => {
    const words = searchQuery.trim().split(/\s+/);
    return words.map(word => `"${word}"`).join(' ');
  };

  const checkIndividualWords = async (text) => {
    if (!text.trim()) return false;
    
    const words = text.split(/\s+/);
    const misspellings = [];
    
    try {
      const dict = await initializeDictionary();
      
      for (const word of words) {
        const cleanWord = word.replace(/[^a-zA-Z-]/g, '').toLowerCase();
        if (cleanWord && !dict.check(cleanWord)) {
          misspellings.push(cleanWord);
        }
      }
    } catch (err) {
      return false;
    }
    
    setMisspelledWords(misspellings);
    return misspellings.length > 0;
  };

  const handleSearch = async (searchQuery, isOriginalQuery = false) => {  
    if (!searchQuery.trim()) {
      setResults([]);
      setSuggestion(null);
      setMisspelledWords([]);
      return;
    }
  
    setIsSearching(true);
    setError(null);
    setSuggestion(null);
  
    try {
      const hasMisspellings = await checkIndividualWords(searchQuery);
      
      if (hasMisspellings && !isOriginalQuery) {
        setIsCheckingSpelling(true);
        
        try {
          const correction = await getCorrection(searchQuery);
          
          if (correction.corrected_text && correction.corrected_text !== searchQuery) {
            setSuggestion({
              text: correction.corrected_text,
              confidence: correction.confidence,
              original: searchQuery
            });
            setIsSearching(false);
            setIsCheckingSpelling(false);
            return;
          }
        } catch (err) {
          setError("Spell check unavailable. Using original query...");
        } finally {
          setIsCheckingSpelling(false);
        }
      }
  
      await performSearch(searchQuery, searchQuery);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSuggestionChoice = (useSuggestion) => {
    const searchTerm = useSuggestion ? suggestion.text : suggestion.original;
    setQuery(searchTerm);
    setSuggestion(null);
    handleSearch(searchTerm, !useSuggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);
  };

  const performSearch = async (searchQuery, displayQuery) => {
    try {
      const exactMatchQuery = formatQueryForExactMatch(searchQuery);
      
      const response = await fetch(
        `http://localhost:4000/api/search?q=${encodeURIComponent(exactMatchQuery)}`
      );
  
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      setResults(data.results || []);
      setDisplayQuery(displayQuery);
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setReady(true);
      return;
    }
    const timeout = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(timeout);
  }, []);

  if (authLoading || !ready) return <h2 className="loading">Loading...</h2>;

  return (
    <>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="main-content">
        <button
          data-testid="sidebar-toggle"
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          style={{ display: isSidebarOpen ? "none" : "block" }}
          aria-label="Open sidebar"
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
                <nav>
                  <Link to="/dashboard" className="dashboard-link">
                    Go to Dashboard →
                  </Link>
                </nav>
              )}
            </section>
          )}

          <p className="slogan">Navigate the Foundations of Democracy</p>

          <form className="search-container" onSubmit={handleSubmit}>
            <label htmlFor="search-input" className="visually-hidden"></label>
            <input
              id="search-input"
              type="search"
              placeholder="Ask the compass..."
              className={`search-input ${error ? 'input-error' : ''}`}
              value={query}
              onChange={handleInputChange}
              aria-label="Search constitutional documents"
              aria-describedby={error ? "search-error" : undefined}
            />
            <button 
              className="search-button" 
              type="submit"
              disabled={isSearching || isCheckingSpelling}  
              aria-label="Search"
              aria-busy={isSearching || isCheckingSpelling}
            >
              {isSearching || isCheckingSpelling ? (
                ""
              ) : (
                <img src="/images/search.png" alt="Search" />
              )}
            </button>
            {error && (
              <p id="search-error" role="alert" className="error-message">{error}</p>
            )}
          </form>
        </article>

        <section className="search-results-container" aria-live="polite">
          {isSearching && (
            <p aria-busy="true" className="loading-indicator">Searching...</p>
          )}
          
          {/* In your JSX (unchanged from your last version) */}
        {suggestion && (
          <aside className="spelling-suggestions">
            <p>Possible spelling errors in: 
              <strong> {misspelledWords.join(', ')}</strong>
            </p>
            <menu className="suggestion-options">
              <li>
                <button
                  type="button"
                  className="suggestion-button primary"
                  onClick={() => handleSuggestionChoice(true)}
                  aria-label={`Use suggested correction: ${suggestion.text}`}
                >
                  Search for "{suggestion.text}" 
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="suggestion-button secondary"
                  onClick={() => handleSuggestionChoice(false)}
                  aria-label={`Use original query: ${suggestion.original}`}
                >
                  Use original: "{suggestion.original}"
                </button>
              </li>
            </menu>
          </aside>
        )}

          {results.length > 0 && (
            <>
              {displayQuery !== query && (
                <p className="corrected-message">
                  Showing results for: <strong>{displayQuery}</strong>
                </p>
              )}
              <SearchResults results={results} query={displayQuery} />
            </>
          )}
        </section>

        <footer className="tagline">
          <p>Explore constitutional documents from across the world</p>
        </footer>
      </main>
    </>
  );
};

export default Home;