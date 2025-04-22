import "./Features.css";
import { useState, React } from "react";
import Sidebar from "../Sidebar/Sidebar";

function Features() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <article className="features-section">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <section className="features-container">
      <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          style={{ display: isSidebarOpen ? 'none' : 'block' }}
        >
          ☰
        </button>
        <h1 className="features-title">Features</h1>

        <ul className="feature-list">
          <li>
            <h2>Admin Portal</h2>
            <ul>
              <li>Secure sign-up and login for authorized users</li>
              <li>File upload interface with metadata tagging</li>
              <li>Hierarchical folder organization for archival integrity</li>
            </ul>
          </li>

          <li>
            <h2>Natural Language Search</h2>
            <ul>
              <li>Public-facing search bar with Perplexity-style query experience</li>
              <li>AI-enhanced understanding of user questions</li>
              <li>Returns relevant text snippets, PDFs, and media files</li>
            </ul>
          </li>

          <li>
            <h2>Structured Archival System</h2>
            <ul>
              <li>Archive file management that mirrors “Access to Memory” hierarchy</li>
              <li>Folder-based navigation and filtering</li>
              <li>Metadata support for contextual search</li>
            </ul>
          </li>

          <li>
            <h2>Document & Media Access</h2>
            <ul>
              <li>Inline previews of text content</li>
              <li>Embedded PDF viewer</li>
              <li>Audio/video playback for historical recordings</li>
            </ul>
          </li>

          <li>
            <h2>Role-Based Access</h2>
            <ul>
              <li>Admin and public user separation</li>
              <li>Secure document management for archivists</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}

export default Features;
