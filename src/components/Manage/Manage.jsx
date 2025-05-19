import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../contexts/client';
import './Manage.css';
import Sidebar from '../Sidebar/Sidebar';

const Manage = () => {
  useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'admin');
        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []); 

  const handleDismissAdmin = async (userId) => {
    setUpdatingUserId(userId);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'user' }) // Set role to 'user' when dismissed
        .eq('id', userId);

      if (error) throw error;

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: 'user' } : user
        )
      );
    } catch (error) {
      console.error('Error dismissing admin:', error);
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <section className="applications-layout">
      <main className="applications-container">
        <header>
          <h1>Manage Users</h1>
          {loading && <p>Loading users...</p>}
        </header>

        <ul className="applications-list">
          {users.map(user => (
            <li key={user.id} className="application-card">
              <article className="application-info">
                <header>
                  <h2>{user.email}</h2>
                </header>
                <p><strong>Role:</strong> {user.role}</p>

                {user.role === 'admin' && (
                  <button
                    onClick={() => handleDismissAdmin(user.id)}
                    disabled={updatingUserId === user.id}
                    className="dismiss-button"
                  >
                    {updatingUserId === user.id ? 'Processing...' : 'Dismiss as admin'}
                  </button>
                )}
              </article>
            </li>
          ))}
        </ul>
      </main>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <button
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(true)}
        style={{ display: isSidebarOpen ? 'none' : 'block' }}
      >
        ☰
      </button>
    </section>
  );
};

export default Manage;