// src/components/AdminManagerUsers.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { FaUserCheck, FaUserTimes, FaUserClock, FaSearch, FaFilter } from 'react-icons/fa';
import './AdminManagerUsers.css';

function AdminManagerUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [processingUser, setProcessingUser] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const itemsPerPage = 10;

  // Menghitung statistik pengguna
  const userStats = useMemo(() => {
    const approved = users.filter(u => u.is_approved).length;
    const pending = users.filter(u => !u.is_approved).length;
    const writers = users.filter(u => u.role === 'writer').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const regularUsers = users.filter(u => u.role === 'user').length;

    return { approved, pending, writers, admins, regularUsers, total: users.length };
  }, [users]);

  // Filter pengguna berdasarkan pencarian dan filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filter berdasarkan pencarian
      const matchesSearch = searchTerm === '' ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter berdasarkan status
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && user.is_approved) ||
        (statusFilter === 'pending' && !user.is_approved);

      // Filter berdasarkan peran
      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Total halaman untuk pagination
  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / itemsPerPage);
  }, [filteredUsers, itemsPerPage]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
    } else {
      setError('Anda tidak memiliki izin untuk mengakses halaman ini');
      navigate('/');
    }
  }, [user, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/auth/users');
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        throw new Error('Data pengguna tidak valid');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response && error.response.status === 403) {
        setError('Anda tidak memiliki izin untuk mengakses data pengguna');
      } else {
        setError('Gagal mengambil data pengguna');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle pencarian
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset ke halaman pertama saat pencarian berubah
  };

  // Handle filter status
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset ke halaman pertama saat filter berubah
  };

  // Handle filter peran
  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1); // Reset ke halaman pertama saat filter berubah
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setProcessingUser(userId);
      await api.put(`/api/auth/update-user-role/${userId}`, { role: newRole });
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));
      // Gunakan toast notification daripada alert
      // alert('Peran pengguna berhasil diperbarui');
    } catch (error) {
      console.error('Error updating user role:', error);
      // alert('Terjadi kesalahan saat memperbarui peran pengguna');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      setProcessingUser(userId);
      await api.put(`/api/auth/approve-user/${userId}`);
      // Update state langsung daripada fetch ulang seluruh daftar
      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_approved: true } : user
      ));
    } catch (error) {
      console.error('Error approving user:', error);
      // Tampilkan pesan error ke user
      // alert('Gagal menyetujui user. Silakan coba lagi.');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      setProcessingUser(userId);
      await api.put(`/api/auth/reject-user/${userId}`);
      // Update state langsung
      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_approved: false, status: 'rejected' } : user
      ));
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setProcessingUser(null);
    }
  };

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-loading-spinner"></div>
      <p>Memuat data pengguna...</p>
    </div>
  );

  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-manager-users">
      <div className="admin-manager-header">
        <h2 className="admin-manager-title">Kelola Pengguna</h2>
      </div>

      <div className="admin-manager-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Pengguna</div>
          <div className="admin-stat-number">{userStats.total}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Writer</div>
          <div className="admin-stat-number">{userStats.writers}</div>
        </div>
        <div className="admin-stat-card pending">
          <div className="admin-stat-label">Menunggu Persetujuan</div>
          <div className="admin-stat-number">{userStats.pending}</div>
        </div>
      </div>

      <div className="admin-search-filter">
        <div className="admin-search-input-wrapper">
          <FaSearch className="admin-search-icon" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchTerm}
            onChange={handleSearch}
            className="admin-search-input"
          />
        </div>

        <div className="admin-filter-wrapper">
          <FaFilter className="admin-filter-icon" />
          <select
            value={statusFilter}
            onChange={handleStatusFilter}
            className="admin-filter-select"
          >
            <option value="all">Semua Status</option>
            <option value="approved">Disetujui</option>
            <option value="pending">Menunggu</option>
          </select>
        </div>

        <div className="admin-filter-wrapper">
          <FaUserClock className="admin-filter-icon" />
          <select
            value={roleFilter}
            onChange={handleRoleFilter}
            className="admin-filter-select"
          >
            <option value="all">Semua Peran</option>
            <option value="user">User</option>
            <option value="writer">Writer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="admin-filter-select"
                        disabled={processingUser === user.id}
                      >
                        <option value="user">User</option>
                        <option value="writer">Writer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`user-status ${user.is_approved ? 'status-active' : 'status-pending'}`}>
                        {user.is_approved ? 'Disetujui' : 'Menunggu'}
                      </span>
                    </td>
                    <td>
                      <div className="user-action-buttons">
                        {!user.is_approved && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => handleApproveUser(user.id)}
                              disabled={processingUser === user.id}
                            >
                              <FaUserCheck className="btn-icon" /> <span>Setujui</span>
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleRejectUser(user.id)}
                              disabled={processingUser === user.id}
                            >
                              <FaUserTimes className="btn-icon" /> <span>Tolak</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                &laquo;
              </button>

              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lsaquo;
              </button>

              {[...Array(totalPages).keys()].map(page => (
                <button
                  key={page + 1}
                  onClick={() => handlePageChange(page + 1)}
                  className={currentPage === page + 1 ? 'active' : ''}
                >
                  {page + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                &rsaquo;
              </button>

              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="admin-error">
          <p>Tidak ada pengguna yang ditemukan dengan filter yang dipilih.</p>
        </div>
      )}
    </div>
  );
}

export default AdminManagerUsers;
