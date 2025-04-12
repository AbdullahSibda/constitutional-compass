import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import { useAuth } from "./contexts/AuthContext";
import Home from "./components/Home/Home";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";

const App = () => {
  const { user } = useAuth();

  return (
    <section className="App">
      {/* Main content goes here */}
      <Routes>
        {/* Define your routes here */}
        <Route path="/" element={<Home />} />
        {/* <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Login />} />
        {/* Add more routes as needed */}
      </Routes>
    </section>
  );
};

export default App;
