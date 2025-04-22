import "./About.css";
import { useState, React } from "react";
import Sidebar from "../Sidebar/Sidebar";

function About() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <article className="about-section">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <section className="about-container">
      <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          style={{ display: isSidebarOpen ? 'none' : 'block' }}
        >
          ☰
        </button>
        <h1 className="about-title">About</h1>
        <p className="about-text">
        Welcome to the Constitutional compass.
         A Historical Constitutional Archive Platform designed to preserve, organize, and explore constitutional history.
          This platform encourages and promotes preservation and display of factual and accurate historical information.
           Whether you're a researcher, student, or history enthusiast, this system helps you uncover historical documents, multimedia, and PDF records with ease and relevance.
        </p>
      </section>
    </article>
  );
}

export default About;
