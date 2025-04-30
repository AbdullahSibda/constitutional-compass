import React from "react";
import "./SearchResults.css";

const SearchResults = ({ results }) => {
  return (
    <section className="search-results">
      {results.map((result, index) => (
        <main key={index} className="result-card">
          <header className="result-header">
            <h3 className="result-title">{result.title}</h3>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="document-link"
            >
              View Document
            </a>
          </header>

          {result.metadata && (
            <section className="metadata-section">
              {result.metadata.publication_date && (
                <span className="metadata-item">
                  📅{" "}
                  {new Date(
                    result.metadata.publication_date
                  ).toLocaleDateString()}
                </span>
              )}
              {result.metadata.document_type && (
                <span className="metadata-item">
                  📄 {result.metadata.document_type}
                </span>
              )}
            </section>
          )}

          <section className="snippets-container">
            {result.snippets.map((snippet, idx) => (
              <section key={idx} className="snippet">
                <p className="snippet-text">{snippet.text}</p>
                <section className="similarity-score">
                  {Math.round((1 - snippet.score) * 100)}% match
                </section>
              </section>
            ))}
          </section>
        </main>
      ))}
    </section>
  );
};

export default SearchResults;
