import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav" style={{ marginTop: '30px' }}>
        <Link
          to="/admin/posts"
          className={`admin-nav-button ${location.pathname === '/admin/posts' ? 'active' : ''}`}
        >
          Postingan
        </Link>
        {user.role === 'admin' && (
          <Link
            to="/admin/manager-users"
            className={`admin-nav-button ${location.pathname === '/admin/manager-users' ? 'active' : ''}`}
          >
            Kelola Pengguna
          </Link>
        )}
      </nav>
      <Outlet />
    </div>
  );
}

export default AdminLayout;