import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Dashboard.css";
import Sidebar from "../Sidebar/Sidebar";
import FolderBrowser from "../FileManager/FolderBrowser";

function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { userRole} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userRole !== "admin" && userRole !== "moderator") {
      navigate("/");
    }
  }, [userRole, navigate]);

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
        <section aria-label="File browser interface" className="folder-browser">
          <FolderBrowser />
        </section>
      </main>
    </section>
  );
}

export default Dashboard;