import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../contexts/client';
import './Manage.css';
import Sidebar from '../Sidebar/Sidebar';

const Manage = () => {
  const { userRole } = useAuth();
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

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserId(userId);
    
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } 

  return (
    <section className="applications-layout">
        
      <main className="applications-container">
        <header>
          <h1>Manage Users</h1>
        </header>

        <ul className="applications-list">
          {users.map(user => (
            <li key={user.id} className="application-card">
              <article className="application-info">
                <header>
                  <h2>{user.email}</h2>
                  
                </header>
                <p><strong>Role:</strong> {user.role}</p>

                <label htmlFor={`role-${user.id}`} style={{ marginTop: '0.5rem' }}>
                  <strong>Change Role:</strong>
                </label>
                <select
                  id={`role-${user.id}`}
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={updatingUserId === user.id}
                  className="role-dropdown"
                >
                  <option value="user">User</option>
  
                  <option value="admin">Admin</option>
                </select>
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
