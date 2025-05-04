import React from "react";
import "./SearchResults.css";
import { highlightText } from "../utils/highlightText"; 

const SearchResults = ({ results, query }) => {
  return (
    <section className="search-results">
      {results.map((result, index) => (
        <article key={index} className="result-card"> {}
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
            <aside className="metadata-section"> {}
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
            </aside>
          )}

          <section className="snippets-container">
            {result.snippets.map((snippet, idx) => (
              <blockquote key={idx} className="snippet"> {}
                <p className="snippet-text">
                  {highlightText(snippet.text, query)} {}
                </p>
                <footer className="similarity-score"> {}
                  {Math.round((1 - snippet.score) * 100)}% match
                </footer>
              </blockquote>
            ))}
          </section>
        </article>
      ))}
    </section>
  );
};

export default SearchResults;