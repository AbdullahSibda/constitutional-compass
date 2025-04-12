import React from "react";
import "./Home.css";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../Navbar/Navbar";
import { Link } from "react-router-dom";

const Home = () => {
  const { user } = useAuth();
  return (
    <section>
      <Navbar />
      {user ? (
        <>
          <p>Welcome back, {user.email}!</p>
          <p className="link">
            <Link to="/dashboard">Go to Dashboard</Link>
          </p>
        </>
      ) : (
        <>
          <h1>Constitutional Compass</h1>
          <p>Your guide to understanding the Constitution.</p>
        </>
      )}
    </section>
  );
};

export default Home;
