import React, { useState } from "react";
import "./SearchResults.css";

const SearchResults = ({ results }) => {
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [yearRange, setYearRange] = useState({ min: "", max: "" });
  const [groupByFileType, setGroupByFileType] = useState(false);

  const allYears = [...new Set(results.map(r => r.metadata?.year))].filter(Boolean).sort();
  const allFileTypes = [...new Set(results.map(r => r.metadata?.file_type))].filter(Boolean);

  const filteredResults = results.filter(result => {
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
    setYearRange(prev => ({
      ...prev,
      [type]: e.target.value
    }));
  };

  const groupResultsByFileType = () => {
    const groups = {};
    filteredResults.forEach(result => {
      const type = result.metadata?.file_type || "Unknown";
      if (!groups[type]) groups[type] = [];
      groups[type].push(result);
    });
    return groups;
  };

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
          {result.metadata.year && (
            <strong className="metadata-item">📅 {result.metadata.year}</strong>
          )}
          {result.metadata.file_type && (
            <strong className="metadata-item">📄 {result.metadata.file_type}</strong>
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
    </article>
  );

  return (
    <main className="search-results-container">
      {/* Filters positioned at the top */}
      <section className="filters-top-container">
        <section className="filters-wrapper">
          <section className="filter-group">
            <label>Filter by Year Range:</label>
            <section className="year-range-group">
              <select value={yearRange.min} onChange={(e) => handleYearRangeChange(e, "min")}>
                <option value="">From year</option>
                {allYears.map(year => (
                  <option key={`min-${year}`} value={year}>{year}</option>
                ))}
              </select>
              <strong>to</strong>
              <select value={yearRange.max} onChange={(e) => handleYearRangeChange(e, "max")}>
                <option value="">To year</option>
                {allYears.map(year => (
                  <option key={`max-${year}`} value={year}>{year}</option>
                ))}
              </select>
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
                {allFileTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <button onClick={() => setGroupByFileType(prev => !prev)}>
                {groupByFileType ? "Ungroup" : "Group by File Type"}
              </button>
            </section>
          </section>
        </section>
      </section>

      {/* Results display */}
      <section className="search-results">
        {filteredResults.length > 0 ? (
          groupByFileType ? (
            Object.entries(groupResultsByFileType()).map(([type, results]) => (
              <section key={type} className="file-type-group">
                <h2 className="file-type-heading">{type.toUpperCase()}</h2>
                {results.map(renderResultCard)}
              </section>
            ))
          ) : (
            filteredResults.map(renderResultCard)
          )
        ) : (
          <section className="no-results">
            No results match your filter criteria.
          </section>
        )}
      </section>
    </main>
  );
};

export default SearchResults;
