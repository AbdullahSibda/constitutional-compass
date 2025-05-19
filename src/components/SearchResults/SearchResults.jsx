import React, { useState } from "react";
import "./SearchResults.css";
import { highlightText } from "../utils/highlightText";

const textToSpeech = (text) => {
  if (!window.speechSynthesis) {
    alert("Your browser does not support text-to-speech.");
    return;
  }

  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "en-US";
  window.speechSynthesis.speak(speech);
};

const download = (result) => {
  let content = `FROM: ${result.title} \n\n`;

  result.snippets.forEach((snippet) => {
    const matchPercentage = Math.round((1 - snippet.score) * 100);
    content += `• "${snippet.text}"\n  Match: ${matchPercentage}%\n\n`;
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.title.replace(/\.pdf$/i, "")}_results.txt`;
  link.click();

  URL.revokeObjectURL(url);
};

const SearchResults = ({ results, query }) => {
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [yearRange, setYearRange] = useState({ min: "", max: "" });
  const [groupByFileType, setGroupByFileType] = useState(false);

  const allFileTypes = [...new Set(results.map((r) => r.metadata?.file_type))].filter(Boolean);

  const filteredResults = results.filter((result) => {
    const matchesFileType = fileTypeFilter === "all" || result.metadata?.file_type === fileTypeFilter;
    const year = result.metadata?.year;
    if (!year) return matchesFileType;

    const yearNum = parseInt(year);
    const minYear = yearRange.min ? parseInt(yearRange.min) : -Infinity;
    const maxYear = yearRange.max ? parseInt(yearRange.max) : Infinity;

    const matchesYear = yearNum >= minYear && yearNum <= maxYear;
    return matchesFileType && matchesYear;
  });

  const handleYearRangeChange = (e, type) => {
    setYearRange((prev) => ({ ...prev, [type]: e.target.value }));
  };

  const groupResultsByFileType = () => {
    const groups = {};
    filteredResults.forEach((result) => {
      const type = result.metadata?.file_type || "Unknown";
      if (!groups[type]) groups[type] = [];
      groups[type].push(result);
    });
    return groups;
  };

  const renderSnippets = (snippets) => (
    <section className="snippets-container">
      {snippets.map((snippet, idx) => (
        <blockquote key={idx} className="snippet">
          <p className="snippet-text">{highlightText(snippet.text, query)}</p>
          <footer className="snippet-footer">
            <span className="similarity-score">
              {Math.round(100 - (1 + snippet.score) * 100)}% match
            </span>
            <button
              className="speak-button"
              onClick={() => textToSpeech(snippet.text)}
              title="Read this snippet aloud"
            >
              🔊 Speak
            </button>
          </footer>
        </blockquote>
      ))}
    </section>
  );

  const renderResultCard = (result, index) => (
    <article key={index} className="result-card">
      <header className="result-header">
        <h3 className="result-title">{result.title}</h3>
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="document-link">
          View Document
        </a>
      </header>

      {result.metadata && (
        <section className="metadata-section">
          {result.metadata.year && <span className="metadata-item">📅 {result.metadata.year}</span>}
          {result.metadata.file_type && <span className="metadata-item">📄 {result.metadata.file_type}</span>}
          {result.metadata.document_type && <span className="metadata-item">📄 {result.metadata.document_type}</span>}
          {result.metadata.publication_date && (
            <span className="metadata-item">
              📅 {new Date(result.metadata.publication_date).toLocaleDateString()}
            </span>
          )}
        </section>
      )}

      {renderSnippets(result.snippets)}

      <section className="download-button-container">
        <button className="download-button" onClick={() => download(result)}>
          Download
        </button>
      </section>
    </article>
  );

  return (
    <main className="search-results-container">
      <section className="filters-top-container">
        <section className="filters-wrapper">
          <section className="filter-group">
            <label>Filter by Year Range:</label>
            <section className="year-range-group">
              <input
                type="number"
                placeholder="Start year"
                value={yearRange.min}
                onChange={(e) => handleYearRangeChange(e, "min")}
                className="year-input"
              />
              <strong>to</strong>
              <input
                type="number"
                placeholder="End year"
                value={yearRange.max}
                onChange={(e) => handleYearRangeChange(e, "max")}
                className="year-input"
              />
            </section>
          </section>

          <section className="filter-group">
            <label htmlFor="file-type-filter">Filter by File Type:</label>
            <section style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <select
                id="file-type-filter"
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
              >
                <option value="all">All File Types</option>
                {allFileTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <button onClick={() => setGroupByFileType((prev) => !prev)}>
                {groupByFileType ? "Ungroup" : "Group by File Type"}
              </button>
            </section>
          </section>
        </section>
      </section>

      <section className="search-results">
        {filteredResults.length > 0 ? (
          groupByFileType ? (
            Object.entries(groupResultsByFileType()).map(([type, grouped]) => (
              <section key={type} className="file-type-group">
                <h2 className="file-type-heading">{type.toUpperCase()}</h2>
                {grouped.map(renderResultCard)}
              </section>
            ))
          ) : (
            filteredResults.map(renderResultCard)
          )
        ) : (
          <section className="no-results">No results match your filter criteria.</section>
        )}
      </section>
    </main>
  );
};

export default SearchResults;
