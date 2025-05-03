import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../contexts/client';
import Sidebar from '../Sidebar/Sidebar';
import * as pdfjsLib from 'pdfjs-dist';
import './Applications.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const Applications = () => {
  const { userRole } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedApp, setExpandedApp] = useState(null);
  const [pdfData, setPdfData] = useState({});

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

  const toggleExpand = async (appId, cvUrl, letterUrl) => {
    if (expandedApp === appId) {
      setExpandedApp(null);
      return;
    }

    setExpandedApp(appId);
    
    try {
      // Load PDF data only when expanding
      if (cvUrl && !pdfData[`cv-${appId}`]) {
        const cvPdf = await pdfjsLib.getDocument(cvUrl).promise;
        setPdfData(prev => ({
          ...prev,
          [`cv-${appId}`]: cvPdf
        }));
      }

      if (letterUrl && !pdfData[`letter-${appId}`]) {
        const letterPdf = await pdfjsLib.getDocument(letterUrl).promise;
        setPdfData(prev => ({
          ...prev,
          [`letter-${appId}`]: letterPdf
        }));
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const renderPdfPreview = (pdfDoc, appId, type) => {
    if (!pdfDoc) return <p>Loading {type}...</p>;

    return (
      <article className="pdf-preview">
        <p>PDF loaded ({pdfDoc.numPages} pages)</p>
        <a 
          href={type === 'cv' 
            ? applications.find(a => a.id === appId)?.cv_url 
            : applications.find(a => a.id === appId)?.motivational_letter_url
          }
          target="_blank"
          rel="noopener noreferrer"
          className="pdf-download"
        >
          View {type}
        </a>
      </article>
    );
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
          aria-label="Open sidebar"
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
                    <h2>{app.email || 'Unknown user'}</h2>
                    <button 
                      onClick={() => toggleExpand(app.id, app.cv_url, app.motivational_letter_url)}
                      className="toggle-expand"
                      aria-expanded={expandedApp === app.id}
                    >
                      {expandedApp === app.id ? 'Hide Documents' : 'View Documents'}
                    </button>
                  </header>
                  <p><strong>Applied on:</strong> {new Date(app.applied_at).toLocaleDateString()}</p>
                  
                  {expandedApp === app.id && (
                    <section className="documents-container">
                      <article className="document-viewer">
                        <h3>CV</h3>
                        {app.cv_url ? (
                          renderPdfPreview(pdfData[`cv-${app.id}`], app.id, 'cv')
                        ) : (
                          <p>No CV uploaded</p>
                        )}
                      </article>
                      
                      <article className="document-viewer">
                        <h3>Motivational Letter</h3>
                        {app.motivational_letter_url ? (
                          renderPdfPreview(pdfData[`letter-${app.id}`], app.id, 'letter')
                        ) : (
                          <p>No motivational letter uploaded</p>
                        )}
                      </article>
                    </section>
                  )}
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