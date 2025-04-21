import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../contexts/client';
import Sidebar from '../Sidebar/Sidebar';
import './Applications.css';

const Applications = () => {
  const { userRole } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (userRole === 'moderator') {
      fetchPendingApplications();
    }
  }, [userRole]);

  const fetchPendingApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'pending');
  
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationDecision = async (userId, decision) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: decision === 'accept' ? 'admin' : 'user',
          admin_application_reason: decision === 'accept' ? 'accepted' : 'rejected',
          applied_at: decision === 'accept' ? new Date().toISOString() : null
        })
        .eq('id', userId);

      if (error) throw error;

      await fetchPendingApplications();
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  if (userRole !== 'moderator') {
    return <section className="unauthorized">You are not authorized to view this page.</section>;
  }

  if (loading) {
    return <section className="loading">Loading applications...</section>;
  }

  return (
    <section className='applications-layout'>
    <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
    <main className="applications-container">
    <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          style={{ display: isSidebarOpen ? 'none' : 'block' }}
        >
          ☰
        </button>
      <header>
        <h1>Pending Applications</h1>
      </header>
      {applications.length === 0 ? (
        <p>No pending applications</p>
      ) : (
        <ul className="applications-list">
          {applications.map((app) => (
            <li key={app.id} className="application-card">
              <article className="application-info">
                <header>
                  <h3>{app.email || 'Unknown user'}</h3>
                </header>
                <p><strong>Reason:</strong> {app.admin_application_reason}</p>
                <p><strong>Applied on:</strong> {new Date(app.applied_at).toLocaleDateString()}</p>
              </article>
              <nav className="application-actions">
                <button 
                  onClick={() => handleApplicationDecision(app.id, 'accept')}
                  className="accept-button"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleApplicationDecision(app.id, 'reject')}
                  className="reject-button"
                >
                  Reject
                </button>
              </nav>
            </li>
          ))}
        </ul>
      )}
    </main>
    </section>
  );
};

export default Applications;
