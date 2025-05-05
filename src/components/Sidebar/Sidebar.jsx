import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../contexts/client';
import './Sidebar.css';
import logo from '../images/logo.png';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, signIn, signOut, userRole } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const fetchApplicationStatus = async () => {
      if (user && (userRole === 'pending' || userRole === 'admin' || userRole === 'user')) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('admin_application_reason, role')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (data?.admin_application_reason?.toLowerCase().includes('accepted')) {
            setApplicationStatus('Accepted');
          } else if (data?.admin_application_reason?.toLowerCase().includes('rejected')) {
            setApplicationStatus('Rejected');
          } else if (data?.admin_application_reason?.toLowerCase().includes('pending')) {
            setApplicationStatus('Pending');
          }
        } catch (error) {
          console.error('Error fetching application status:', error);
        }
      }
    };

    fetchApplicationStatus();
  }, [user, userRole]);

  const handleAuthAction = async () => {
    try {
      if (user) {
        await signOut(); 
      } else {
        await signIn();
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
      <section className="sidebar-header">
        <img src={logo} alt="Logo" className="logo-image" />
        <h1 className="sidebar-title">Constitutional Compass</h1>
      </section>
      <nav className="sidebar-nav">
        <button className="auth-button google-signin" onClick={handleAuthAction}>
          {user ? 'Sign Out' : 'Sign In with Google'}
        </button>
        <Link to="/" className="nav-link" onClick={() => setIsOpen(false)}>
          Home
        </Link>
        <Link to="/about" className="nav-link">
          About
        </Link>
        <Link to="/features" className="nav-link">
          Features
        </Link>
        {(userRole === 'admin' || userRole === 'moderator') && (
          <Link to="/dashboard" className="nav-link" onClick={() => setIsOpen(false)}>
            Dashboard
          </Link>
        )}
        {userRole === 'moderator' && (
          <Link to="/applications" className="nav-link" onClick={() => setIsOpen(false)}>
            Applications
          </Link>
        )}
      </nav>
      {applicationStatus && (
        <footer className="application-status">
          <h3>Application Status</h3>
          <p className={`status ${applicationStatus.toLowerCase()}`}>
            {applicationStatus}
          </p>
        </footer>
      )}
    </aside>
  );
};

export default Sidebar;