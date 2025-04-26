import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const GoogleLoginSuccess = () => {
  const navigate = useNavigate();
  const { refreshAuthState } = useAuth();

  useEffect(() => {
    const processLogin = async () => {
      try {
        // Cek apakah ada data auth di localStorage
        const authUser = localStorage.getItem('auth_user');
        const authToken = localStorage.getItem('auth_token');

        if (authUser && authToken) {
          console.log('Found auth data in localStorage');

          // Refresh auth state untuk memastikan token valid
          await refreshAuthState();

          // Tampilkan toast sukses
          toast.success('Login berhasil!');

          // Parse user data
          const user = JSON.parse(authUser);

          // Cek apakah ada URL redirect yang disimpan
          const redirectUrl = sessionStorage.getItem('login_redirect_url');
          if (redirectUrl) {
            // Hapus URL redirect dari sessionStorage
            sessionStorage.removeItem('login_redirect_url');
            console.log('Redirecting back to:', redirectUrl);
            window.location.href = redirectUrl;
            return;
          }

          // Jika tidak ada URL redirect, redirect berdasarkan role
          if (user.role === 'admin') {
            navigate('/admin/posts');
          } else if (user.role === 'writer') {
            navigate('/writer/posts');
          } else {
            navigate('/');
          }
        } else {
          console.error('No auth data found in localStorage');
          toast.error('Login gagal. Silakan coba lagi.');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error processing Google login:', error);
        toast.error('Terjadi kesalahan saat login. Silakan coba lagi.');
        navigate('/login');
      }
    };

    processLogin();
  }, [navigate, refreshAuthState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Login Berhasil</h2>
          <p className="mt-2 text-sm text-gray-600">
            Anda akan dialihkan dalam beberapa saat...
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-12 h-12 border-t-2 border-b-2 border-green-500 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default GoogleLoginSuccess;
