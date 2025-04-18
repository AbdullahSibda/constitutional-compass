import React from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Home from "./components/Home/Home";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import Prelogin from "./components/Login/prelogin"; // Updated import

// Create a layout component that wraps your routes
const AppLayout = () => {
  return (
    <section className="App">
      <Outlet /> {/* This renders the matched route */}
    </section>
  );
};

// Create protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Login />; // Use `children` prop instead of `element`
};

// Define your routes
const router = createBrowserRouter([
  {
    element: <AppLayout />, // Main layout
    children: [
      {
        path: "/",
        element: <Home /> // Home page
      },
      {
        path: "/login",
        element: <Login /> // Login page
      },
      {
        path: "/prelogin",
        element: <Prelogin /> // Prelogin page (added route)
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard /> {/* Wrap protected component */}
          </ProtectedRoute>
        ) // Protected Dashboard route
      },
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

// Main App component
const App = () => {
  return <RouterProvider router={router} />;
};

export default App;

