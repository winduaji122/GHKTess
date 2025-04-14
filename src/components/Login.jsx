import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCsrfToken } from '../api/auth';
import axios from 'axios';
import _ from 'lodash';
import { toast } from 'react-toastify';
import './Login.css';
import { Link } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { STORAGE_TYPES, setStorageType } from '../utils/tokenManager';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [csrfToken, setCsrfToken] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Ekstrak parameter redirect dari URL jika ada
  const queryParams = new URLSearchParams(location.search);
  const redirectParam = queryParams.get('redirect');

  // Juga periksa state dari location (digunakan oleh PrivateRoute)
  const fromLocation = location.state?.from;

  // Prioritaskan redirect dari parameter URL, kemudian dari state
  const redirectPath = redirectParam || (fromLocation ? fromLocation.pathname + fromLocation.search : null);

  // Fungsi untuk mendapatkan CSRF token dengan penanganan error yang lebih baik
  const fetchCsrfToken = useCallback(async () => {
    try {
      console.log('Fetching CSRF token for login...');
      const token = await getCsrfToken();
      if (token) {
        console.log('CSRF token received successfully');
        setCsrfToken(token);
        setError('');
        return token;
      }
      throw new Error('CSRF token tidak ditemukan');
    } catch (error) {
      console.error('Error fetching CSRF token:', error);

      // Jika error rate limiting, tampilkan pesan yang lebih user-friendly
      if (error.response && error.response.status === 429) {
        setError('Server sedang sibuk. Silakan coba lagi dalam beberapa saat.');
      } else {
        setError('Gagal memuat token keamanan. Silakan refresh halaman.');
      }

      // Tampilkan tombol untuk mencoba lagi
      toast.error(
        <div>
          Gagal memuat token keamanan.
          <button
            onClick={() => {
              localStorage.removeItem('use_mock_csrf');
              window.location.reload();
            }}
            style={{
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              marginLeft: '10px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>,
        { autoClose: 10000 }
      );

      return null;
    }
  }, []);

  // Debounce fetch CSRF token untuk menghindari terlalu banyak request
  const debouncedFetchCsrfToken = useCallback(
    _.debounce(() => {
      fetchCsrfToken();
    }, 500),
    [fetchCsrfToken]
  );

  useEffect(() => {
    debouncedFetchCsrfToken();

    return () => {
      debouncedFetchCsrfToken.cancel();
    };
  }, [debouncedFetchCsrfToken]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Jika tidak ada CSRF token, coba dapatkan dulu
    if (!csrfToken) {
      setError('Mohon tunggu, sedang memuat token keamanan...');
      const token = await fetchCsrfToken();
      if (!token) {
        return; // Gagal mendapatkan token
      }
    }

    setIsLoading(true);
    setError('');

    try {
      // Set storage type berdasarkan preferensi "Ingat Saya"
      setStorageType(rememberMe ? STORAGE_TYPES.LOCAL : STORAGE_TYPES.SESSION);

      // Kirim login request dengan CSRF token dan preferensi "Ingat Saya"
      const result = await login(email, password, rememberMe);

      if (result.success) {
        console.log('Login berhasil:', result.user);

        // Hapus flag mock token jika login berhasil
        localStorage.removeItem('use_mock_csrf');

        // Redirect berdasarkan parameter URL atau role
        if (redirectPath) {
          // Jika ada parameter redirect, gunakan itu
          navigate(redirectPath);
        } else if (result.user.role === 'writer') {
          // Jika user adalah writer, arahkan ke dashboard writer
          navigate('/writer/posts');
        } else {
          // Untuk role lain, arahkan ke dashboard admin
          navigate('/admin/posts');
        }

        toast.success('Login berhasil!');
      } else {
        setError('Login gagal. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Login error:', error);

      // Cek apakah error terkait CSRF token atau rate limiting
      if (error.message === 'CSRF token invalid' ||
          (error.response && error.response.status === 429)) {

        console.log('CSRF token invalid or rate limiting during login');

        // Coba refresh token dan login ulang
        try {
          // Refresh token
          await fetchCsrfToken();

          // Tampilkan pesan untuk mencoba lagi
          toast.info(
            <div>
              Silakan coba login lagi.
              <button
                onClick={() => handleSubmit({
                  preventDefault: () => {}
                })}
                style={{
                  background: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  marginLeft: '10px',
                  cursor: 'pointer'
                }}
              >
                Coba Lagi
              </button>
            </div>,
            { autoClose: 10000 }
          );
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          setError('Gagal memperbarui token keamanan. Silakan refresh halaman.');
        }
      } else {
        let errorMessage = 'Terjadi kesalahan saat login';

        // Cek apakah error adalah 401 (Unauthorized) - password salah
        if (error.response && error.response.status === 401) {
          errorMessage = 'Email atau password salah. Silakan coba lagi.';
          // Tampilkan pesan error di form
          setError(errorMessage);
        } else if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }

        // Tampilkan toast error
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, csrfToken, login, debouncedFetchCsrfToken, navigate, redirectPath, rememberMe]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    // Tambahkan meta tag untuk autofill
    const meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login ke GHK
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Alamat Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Alamat Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Ingat Saya
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Lupa password?
              </Link>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading ? 'Memproses...' : 'Login'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
