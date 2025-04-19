import React from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Home from "./components/Home/Home";
import Dashboard from "./components/Dashboard/Dashboard";
import Prelogin from "./components/Login/prelogin";

// Create a layout component that wraps your routes
const AppLayout = () => {
  return (
    <section className="App">
      <Outlet />
    </section>
  );
};

// Create protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/" replace />; // Redirect to home
};

// Define your routes
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Home />
      },
      {
        path: "/home",
        element: <Home />
      },
      {
        path: "/prelogin",
        element: <Prelogin />
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )
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