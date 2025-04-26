import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ adminOnly = false, writerOnly = false }) => {
  const { user, isLoggedIn, loading, refreshUserData } = useAuth();
  const location = useLocation();

  // Debugging informasi autentikasi
  useEffect(() => {
    console.group('PrivateRoute Auth Check');
    console.log('Path:', location.pathname);
    console.log('User:', user);
    console.log('IsLoggedIn:', isLoggedIn);
    console.log('Loading:', loading);
    console.log('Requirements:', { adminOnly, writerOnly });
    console.groupEnd();
  }, [location, user, isLoggedIn, loading]);

  // Handle token expiration secara real-time
  useEffect(() => {
    const checkTokenValidity = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn('Token expired detected');
          refreshUserData();
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    };

    // Check setiap 30 detik
    const interval = setInterval(checkTokenValidity, 30000);
    return () => clearInterval(interval);
  }, [refreshUserData]);

  if (loading) {
    return <div className="loading-screen">Memverifikasi sesi...</div>;
  }

  if (!isLoggedIn) {
    // Hanya tampilkan toast jika bukan akses langsung ke halaman private
    // Ini mencegah toast error saat redirect otomatis
    if (location.state?.from) {
      toast.error('Silakan login untuk mengakses halaman ini');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Validasi role admin
  if (adminOnly && user?.role !== 'admin') {
    toast.error('Akses terbatas untuk administrator');
    return <Navigate to="/" replace />;
  }

  // Validasi role writer + approval
  if (writerOnly) {
    if (user?.role !== 'writer') {
      toast.error('Akses khusus penulis');
      return <Navigate to="/" replace />;
    }

    if (!user?.is_approved) {
      toast('Akun Anda sedang menunggu persetujuan admin', {
        icon: '⏳',
        duration: 4000
      });
      return <Navigate to="/writer-pending" replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
