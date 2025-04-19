import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, signIn, signOut } = useAuth();
  const sidebarRef = useRef(null);

  const handleAuthAction = async () => {
    try {
      if (user) {
        await signOut(); // Sign out if user is logged in
      } else {
        await signIn(); // Sign in with Google if user is not logged in
      }
    } catch (error) {
      console.error('Auth Action Error:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <aside ref={sidebarRef} className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <img src="/images/logo.png" alt="Logo" className="logo-image" />
        <h1 className="sidebar-title">Constitutional Compass</h1>
      </div>
      <nav className="sidebar-nav">
        <button className="auth-button google-signin" onClick={handleAuthAction}>
          {user ? 'Sign Out' : 'Sign In with Google'}
        </button>
        <Link to="/about" className="nav-link">
          About
        </Link>
        <Link to="/features" className="nav-link">
          Features
        </Link>
        {user && (
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;