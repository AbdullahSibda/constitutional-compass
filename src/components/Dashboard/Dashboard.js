import React, { useState } from "react";
import "./Dashboard.css";
import Navbar from "../Navbar/Navbar";
import UploadSection from "./UploadSection";
import EditSection from "./EditSection";
import ManageSection from "./ManageSection";

function Dashboard() {
  const [activeSection, setActiveSection] = useState("upload");

  return (
    <>
      <Navbar />
      <article className="app">
        <header className="app-header">
          <h1>Admin Dashboard</h1>
        </header>
        <section className="app-container">
          <nav className="sidebar">
            <ul className="sidebar-menu">
              <li className={`sidebar-item ${activeSection === "upload" ? "active" : ""}`}>
                <button
                  className="sidebar-link"
                  onClick={() => setActiveSection("upload")}
                >
                  Upload Data
                </button>
              </li>
              <li className={`sidebar-item ${activeSection === "edit" ? "active" : ""}`}>
                <button
                  className="sidebar-link"
                  onClick={() => setActiveSection("edit")}
                >
                  <p>Edit</p> <p>Data</p>
                </button>
              </li>
              <li className={`sidebar-item ${activeSection === "manage" ? "active" : ""}`}>
                <button
                  className="sidebar-link"
                  onClick={() => setActiveSection("manage")}
                >
                  Manage Data
                </button>
              </li>
            </ul>
          </nav>
          <main className="main-content">
            {activeSection === "upload" && <UploadSection />}
            {activeSection === "edit" && <EditSection />}
            {activeSection === "manage" && <ManageSection />}
          </main>
        </section>
      </article>
    </>
  );
}

export default Dashboard;
