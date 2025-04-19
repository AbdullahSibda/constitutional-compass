import React, { useState } from "react";
import "./Dashboard.css";
import Sidebar from "../Sidebar/Sidebar";
import FolderBrowser from "../FileManager/FolderBrowser";

function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <header className="dashboard-header">
          <h1>Admin Dashboard</h1>
        </header>
        <section aria-label="File browser interface" className="folder-browser">
          <FolderBrowser />
        </section>
      </main>
    </section>
  );
}

export default Dashboard;