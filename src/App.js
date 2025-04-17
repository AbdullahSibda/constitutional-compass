import React from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Home from "./components/Home/Home";
import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";

// Create a layout component that wraps your routes
const AppLayout = () => {
  return (
    <section className="App">
      <Outlet /> {/* This renders the matched route */}
    </section>
  );
};

// Create protected route wrapper
const ProtectedRoute = ({ element }) => {
  const { user } = useAuth();
  return user ? element : <Login />;
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
        path: "/login",
        element: <Login />
      },
      {
        path: "/dashboard",
        element: <ProtectedRoute element={<Dashboard />} />
      },
      // Add more routes as needed
      // {
      //   path: "/about",
      //   element: <About />
      // }
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