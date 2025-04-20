import React from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Home from "./components/Home/Home";
import Dashboard from "./components/Dashboard/Dashboard";
import PostLogin from "./components/Login/PostLogin";
import AuthCallback from "./components/Auth/AuthCallback";
import Applications from "./components/Applications/Applications";

const AppLayout = () => {
  return (
    <section className="App">
      <Outlet />
    </section>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <h2>Loading...</h2>;
  return user ? children : <Navigate to="/" replace />;
};

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
        path: "/auth-callback",
        element: <AuthCallback />
      },
      {
        path: "/PostLogin",
        element: <PostLogin />
      },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )
      },
      {
        path: "/applications",
        element: (
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        )
      }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;