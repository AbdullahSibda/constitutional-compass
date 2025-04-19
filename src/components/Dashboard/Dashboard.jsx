import React from "react";
import "./Dashboard.css";
import Navbar from "../Navbar/Navbar";
import FolderBrowser from "../FileManager/FolderBrowser";

function Dashboard() {
  return (
    <main>
      <Navbar />
      <header>
        <h1>Admin Dashboard</h1>
      </header>
      <section aria-label="File browser interface">
        <FolderBrowser />
      </section>
    </main>
  );
}

export default Dashboard;