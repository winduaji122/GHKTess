import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCsrfToken } from '../api/auth';
import axios from 'axios';
import _ from 'lodash';
import { toast } from 'react-toastify';
import './AuthPages.css';
import { FaEye, FaEyeSlash, FaUser, FaLock, FaSignInAlt, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { STORAGE_TYPES, setStorageType } from '../utils/tokenManager';
import NotRegisteredAlert from './common/NotRegisteredAlert';

// Google Auth Instructions untuk mengatasi masalah dengan Google Login
const GoogleAuthInstructions = React.lazy(() => import('./auth/GoogleAuthInstructions'));

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNotRegistered, setShowNotRegistered] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showGoogleAuthInstructions, setShowGoogleAuthInstructions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();
  const [csrfToken, setCsrfToken] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Ekstrak parameter redirect dari URL jika ada
  const queryParams = new URLSearchParams(location.search);
  const redirectParam = queryParams.get('redirect');

  // Juga periksa state dari location (digunakan oleh PrivateRoute)
  const fromLocation = location.state?.from;

  // Prioritaskan redirect dari parameter URL, kemudian dari state
  const redirectPath = redirectParam || (fromLocation ? (typeof fromLocation === 'string' ? fromLocation : fromLocation.pathname + fromLocation.search) : null);

  // Fungsi untuk mendapatkan CSRF token dengan penanganan error yang lebih baik
  const fetchCsrfToken = useCallback(async () => {
    try {
      const token = await getCsrfToken();
      if (token) {
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

  // Fungsi untuk memeriksa apakah email terdaftar
  const checkEmailExists = useCallback(async (email) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/check-email?email=${encodeURIComponent(email)}`);
      return response.data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return null; // Null berarti tidak bisa menentukan
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validasi input
    if (!email || !email.trim()) {
      setError('Email tidak boleh kosong');
      return;
    }

    if (!password || !password.trim()) {
      setError('Password tidak boleh kosong');
      return;
    }

    // Cek apakah email terdaftar sebelum mencoba login
    const emailExists = await checkEmailExists(email);
    if (emailExists === false) {
      setError('Akun dengan email ini belum terdaftar.');
      setShowNotRegistered(true);
      return;
    }

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
    // Attempting login

    try {
      // Set storage type berdasarkan preferensi "Ingat Saya"
      setStorageType(rememberMe ? STORAGE_TYPES.LOCAL : STORAGE_TYPES.SESSION);

      // Log untuk debugging
      console.log(`Attempting login with email: ${email}`);

      // Kirim login request dengan CSRF token dan preferensi "Ingat Saya"
      const result = await login(email, password, rememberMe);

      if (result.success) {
        // Hapus flag mock token jika login berhasil
        localStorage.removeItem('use_mock_csrf');

        // Redirect berdasarkan parameter URL atau role
        if (redirectPath) {
          // Jika ada parameter redirect, gunakan itu
          navigate(redirectPath);
        } else if (result.user.role === 'writer') {
          // Jika user adalah writer, arahkan ke dashboard writer
          navigate('/writer/posts');
        } else if (result.user.role === 'admin') {
          // Jika user adalah admin, arahkan ke dashboard admin
          navigate('/admin/posts');
        } else {
          // Untuk user biasa, arahkan ke halaman utama
          navigate('/');
        }

        toast.success('Login berhasil!');

        // Dispatch event untuk memberitahu komponen lain bahwa user telah login
        window.dispatchEvent(new Event('app:login'));
      } else {
        setError('Login gagal. Silakan coba lagi.');
      }
    } catch (error) {
      // Handle login error
      console.log('Login error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data
      });

      // Cek status 401 (Unauthorized) - kemungkinan besar password salah
      if (error.response?.status === 401) {
        // Selalu anggap 401 sebagai password salah jika email sudah diverifikasi ada
        const passwordErrorMsg = 'Password yang Anda masukkan salah. Silakan coba lagi.';
        setError(passwordErrorMsg);
        toast.error(passwordErrorMsg, {
          icon: <FaLock style={{ color: '#f87171' }} />,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
        return; // Keluar dari handler error
      }

      // Cek apakah error terkait dengan invalid credentials
      if (error.message?.includes('Invalid credentials') ||
          error.message?.includes('invalid credentials') ||
          error.message?.includes('password') ||
          error.message?.includes('Password')) {
        const passwordErrorMsg = 'Password yang Anda masukkan salah. Silakan coba lagi.';
        setError(passwordErrorMsg);
        toast.error(passwordErrorMsg, {
          icon: <FaLock style={{ color: '#f87171' }} />,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
        return; // Keluar dari handler error
      }

      // Cek apakah error terkait CSRF token atau rate limiting
      else if (error.message === 'CSRF token invalid' ||
          (error.response && error.response.status === 429)) {

        // CSRF token invalid or rate limiting

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
        // Penanganan error umum
        let errorMessage;

        // Cek apakah error terkait refresh token
        if (error.message?.includes('refresh token') ||
            error.message?.includes('Refresh token') ||
            error.response?.data?.message?.includes('refresh token') ||
            error.response?.data?.message?.includes('Refresh token')) {
          // Ini adalah error refresh token, kemungkinan besar password salah
          errorMessage = 'Password yang Anda masukkan salah. Silakan coba lagi.';
          setError(errorMessage);
          toast.error(errorMessage, {
            icon: <FaLock style={{ color: '#f87171' }} />,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
          return; // Keluar dari handler error
        }

        // Fallback untuk error umum lainnya
        errorMessage = 'Terjadi kesalahan saat login';

        // Cek apakah error menunjukkan akun tidak terdaftar
        if (error.response?.data &&
            (error.response.data.code === 'USER_NOT_FOUND' ||
             error.response.data.message?.includes('tidak ditemukan') ||
             error.response.data.message?.includes('not found') ||
             error.response.data.message?.includes('User not found'))) {

          errorMessage = 'Akun dengan email ini belum terdaftar.';
          setShowNotRegistered(true);
          setError(errorMessage);

          // Tampilkan toast dengan ikon yang sesuai
          toast.error(errorMessage, {
            icon: <FaUser style={{ color: '#f87171' }} />,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
          return; // Keluar dari handler error
        }
        // Tambahkan pengecekan tambahan untuk akun tidak terdaftar
        else if (error.response?.status === 404 ||
            (error.response?.data && error.response?.data.statusCode === 404)) {
          errorMessage = 'Akun dengan email ini belum terdaftar.';
          setShowNotRegistered(true);
          setError(errorMessage);

          // Tampilkan toast dengan ikon yang sesuai
          toast.error(errorMessage, {
            icon: <FaUser style={{ color: '#f87171' }} />,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
          return; // Keluar dari handler error
        }
        // Gunakan pesan error dari server jika ada
        else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
          setError(errorMessage);
        }
        // Fallback untuk error umum
        else {
          setError(errorMessage);
        }

        // Cek apakah ini adalah error umum yang tidak perlu ditampilkan
        const isCommonError =
          errorMessage.includes('refresh token') ||
          errorMessage.includes('Refresh token') ||
          errorMessage.includes('session expired') ||
          errorMessage.includes('Session expired');

        if (!isCommonError) {
          // Tampilkan toast error dengan styling yang menarik
          toast.error(errorMessage, {
            icon: <FaExclamationTriangle style={{ color: '#f87171' }} />,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        } else {
          // Untuk error umum, tampilkan pesan password salah
          const passwordErrorMsg = 'Password yang Anda masukkan salah. Silakan coba lagi.';
          setError(passwordErrorMsg);
          toast.error(passwordErrorMsg, {
            icon: <FaLock style={{ color: '#f87171' }} />,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, csrfToken, login, debouncedFetchCsrfToken, navigate, redirectPath, rememberMe, checkEmailExists, fetchCsrfToken, setShowNotRegistered]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Google One Tap Login dinonaktifkan karena masalah kompatibilitas

  useEffect(() => {
    // Tambahkan meta tag untuk autofill
    const meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);

    // Meta tag untuk Google Client ID tidak diperlukan lagi dengan @react-oauth/google
    // Kita hanya perlu memberikan clientId langsung ke komponen GoogleLogin

    // Google Client ID dan origin sudah dikonfigurasi

    // Cek apakah ada parameter email dari halaman register
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setWelcomeMessage(`Silakan login dengan email ${emailParam}`);
    }

    // Tampilkan pesan selamat datang jika baru saja login
    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    if (justLoggedIn) {
      const userData = JSON.parse(localStorage.getItem('auth_user') || '{}');
      if (userData.name) {
        setWelcomeMessage(`Selamat datang, ${userData.name}!`);
        toast.success(`Selamat datang, ${userData.name}!`, {
          icon: '👋',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
      }
      sessionStorage.removeItem('just_logged_in');
    }

    return () => {
      document.head.removeChild(meta);
    };
  }, [location.search]);

  // Deteksi login berhasil dari popup Google
  useEffect(() => {
    // Cek apakah ini adalah halaman yang di-redirect dari popup yang tidak bisa ditutup
    const searchParams = new URLSearchParams(location.search);
    const popupClosed = searchParams.get('popup_closed');
    const state = searchParams.get('state');

    // Jika ada parameter state=popup, ini adalah halaman yang di-redirect dari popup
    // Ini bisa terjadi jika popup tidak bisa ditutup dengan window.close()
    if (state === 'popup') {
      // Tampilkan pesan bahwa login berhasil
      toast.success('Login berhasil! Halaman popup telah dialihkan.');

      // Hapus parameter dari URL tanpa refresh halaman
      const newUrl = `${window.location.pathname}${window.location.search.replace('?state=popup', '').replace('&state=popup', '')}`;
      window.history.replaceState({}, document.title, newUrl);

      // Refresh halaman setelah 1 detik untuk memastikan state login terupdate
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    if (popupClosed === 'false') {
      // Tampilkan pesan bahwa login berhasil
      toast.success('Login berhasil! Halaman popup telah dialihkan.');

      // Hapus parameter dari URL tanpa refresh halaman
      const newUrl = `${window.location.pathname}${window.location.search.replace('?popup_closed=false', '').replace('&popup_closed=false', '')}`;
      window.history.replaceState({}, document.title, newUrl);

      // Redirect ke halaman sukses login Google
      navigate('/google-login-success');
    }

    // Fungsi untuk menangani pesan dari popup
    const handleAuthMessage = (event) => {
      console.log('Received message:', event.data);

      // Periksa apakah pesan berisi data auth
      if (event.data && event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
        console.log('Received auth data from popup');

        // Simpan data user ke localStorage
        if (event.data.user) {
          localStorage.setItem('auth_user', JSON.stringify(event.data.user));
          console.log('User data saved to localStorage');

          // Tampilkan toast sukses
          toast.success('Login berhasil!');

          // Redirect berdasarkan role
          const user = event.data.user;
          if (user.role === 'writer') {
            navigate('/writer/posts');
          } else if (user.role === 'admin') {
            navigate('/admin/posts');
          } else {
            navigate('/');
          }
        }
      }
    };

    // Tambahkan event listener untuk menangkap pesan dari popup
    window.addEventListener('message', handleAuthMessage);

    // Cek apakah user sudah login
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      const user = JSON.parse(authUser);
      if (user.role === 'writer') {
        navigate('/writer/posts');
      } else if (user.role === 'admin') {
        navigate('/admin/posts');
      } else {
        navigate('/');
      }
    }

    // Cleanup event listener dan interval saat komponen unmount
    return () => {
      window.removeEventListener('message', handleAuthMessage);
      if (window.googleLoginCheckInterval) {
        clearInterval(window.googleLoginCheckInterval);
        delete window.googleLoginCheckInterval;
      }
    };
  }, [navigate, location]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <FaSignInAlt />
          </div>
          <h1 className="auth-title">Login ke GHK</h1>
          <p className="auth-subtitle">Masuk untuk mengakses akun Anda</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label htmlFor="email-address">Alamat Email</label>
            <div className="auth-input-wrapper">
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="auth-input"
                placeholder="Masukkan alamat email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FaUser className="auth-input-icon" />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="auth-input"
                placeholder="Masukkan password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FaLock className="auth-input-icon" />
              <div
                className="auth-input-icon right"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
          </div>

          <div className="auth-checkbox-group">
            <label className="auth-checkbox-label">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="auth-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Ingat Saya
            </label>

            <Link to="/forgot-password" className="auth-forgot-link">
              Lupa password?
            </Link>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {showNotRegistered && (
            <NotRegisteredAlert
              email={email}
              onClose={() => setShowNotRegistered(false)}
              onRegisterUser={() => navigate(`/register-user?from_login=true&email=${encodeURIComponent(email)}`)}
              onRegisterWriter={() => navigate(`/register?from_login=true&email=${encodeURIComponent(email)}`)}
            />
          )}

          {welcomeMessage && (
            <div className="auth-success">
              <FaInfoCircle style={{ marginRight: '8px' }} />
              {welcomeMessage}
            </div>
          )}

          {/* Google One Tap dinonaktifkan karena masalah kompatibilitas */}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-button"
          >
            {isLoading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <div className="auth-social-buttons">
          <div className="text-center mb-2">
            <p className="auth-subtitle" style={{ margin: '0 0 5px' }}>Login atau Daftar dengan Google</p>
            <p className="text-xs text-gray-500">Pengguna baru akan otomatis terdaftar sebagai user</p>
          </div>
          <div className="auth-google-button">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setIsLoading(true);
                try {
                  // Simpan URL saat ini di sessionStorage untuk redirect kembali setelah login
                  sessionStorage.setItem('login_redirect_url', window.location.href);

                  // Panggil API untuk login dengan Google
                  const result = await googleLogin(credentialResponse.credential);

                  if (result.success) {
                    // Simpan refreshToken jika ada (untuk deployment Vercel)
                    if (result.refreshToken) {
                      console.log('Storing refresh token from Google login response');
                      localStorage.setItem('refreshToken', result.refreshToken);
                      localStorage.setItem('auth_persistent', 'true'); // Enable persistent login
                    }

                    // Tampilkan toast sukses dengan styling yang lebih menarik
                    toast.success('Login berhasil! Selamat datang kembali.', {
                      icon: '👋',
                      style: {
                        borderRadius: '10px',
                        background: '#333',
                        color: '#fff',
                      },
                    });

                    // Redirect berdasarkan role
                    if (result.user.role === 'writer') {
                      window.location.href = '/writer/posts';
                    } else if (result.user.role === 'admin') {
                      window.location.href = '/admin/posts';
                    } else {
                      window.location.href = '/';
                    }
                  } else if (result.requiresApproval) {
                    toast.info('Akun Anda sedang menunggu persetujuan admin.');
                  } else {
                    setError('Login dengan Google gagal. Silakan coba lagi.');
                    toast.error('Login dengan Google gagal');
                  }
                } catch (error) {
                  console.error('Google login error:', error);

                  // Log informasi tambahan untuk debugging
                  if (error.response) {
                    console.error(`Status: ${error.response.status}`);
                    console.error(`Headers:`, error.response.headers);
                    console.error(`Data:`, error.response.data);
                  }

                  // Pesan error yang lebih informatif
                  let errorMessage = 'Login dengan Google gagal. ';

                  if (error.message === 'Network Error') {
                    errorMessage += 'Terjadi masalah koneksi. Periksa koneksi internet Anda.';
                  } else if (error.response && error.response.status === 405) {
                    errorMessage += 'Metode tidak diizinkan. Coba refresh halaman.';
                  } else if (error.response && error.response.status === 401) {
                    errorMessage += 'Autentikasi gagal. Coba login kembali.';
                  } else if (error.message.includes('timeout')) {
                    errorMessage += 'Waktu permintaan habis. Server mungkin sedang sibuk.';
                  } else {
                    errorMessage += 'Silakan coba lagi.';
                  }

                  toast.error(errorMessage);

                  // Jika error timeout, sarankan untuk mencoba lagi
                  if (error.message.includes('timeout')) {
                    setTimeout(() => {
                      toast.info('Coba login kembali dalam beberapa saat', {
                        autoClose: 10000
                      });
                    }, 2000);
                  }
                } finally {
                  setIsLoading(false);
                }
              }}
              onError={(error) => {
                // Cek apakah error terkait origin tidak diizinkan
                if (error.error === 'idpiframe_initialization_failed' ||
                    (error.details && error.details.includes('origin'))) {

                  // Tampilkan instruksi untuk mengatasi masalah
                  setShowGoogleAuthInstructions(true);

                  // Tampilkan pesan error hanya di development
                  if (import.meta.env.DEV) {
                    toast.error(
                      <div>
                        <p><strong>Google Login Error:</strong> Origin not allowed</p>
                        <p>Add {window.location.origin} to allowed origins in Google Cloud Console</p>
                      </div>,
                      { autoClose: false }
                    );
                  } else {
                    toast.error('Login dengan Google gagal. Silakan coba lagi.');
                  }
                }
                // Cek apakah error terkait FedCM dinonaktifkan
                else if (error.error === 'fedcm_disabled' ||
                         (error.details && error.details.includes('FedCM was disabled'))) {
                  // Tampilkan instruksi untuk mengatasi masalah
                  setShowGoogleAuthInstructions(true);

                  // Tampilkan pesan error hanya di development
                  if (import.meta.env.DEV) {
                    toast.error(
                      <div>
                        <p><strong>Google Login Error:</strong> FedCM is disabled in browser settings</p>
                        <p>Enable FedCM in chrome://flags or try with FedCM disabled</p>
                      </div>,
                      { autoClose: false }
                    );
                  } else {
                    toast.error('Login dengan Google gagal. Silakan coba lagi.');
                  }

                  // Coba lagi dengan FedCM dinonaktifkan
                } else if (error.error === 'popup_closed_by_user') {
                  // Jangan tampilkan error jika user sengaja menutup popup
                } else if (error.error === 'popup_blocked_by_browser') {
                  toast.error(
                    <div>
                      <p><strong>Popup diblokir oleh browser</strong></p>
                      <p>Izinkan popup untuk login dengan Google</p>
                    </div>,
                    { autoClose: 5000 }
                  );
                } else if (error.error === 'access_denied') {
                  toast.info('Login dengan Google dibatalkan oleh pengguna');
                } else if (error.error === 'immediate_failed') {
                  // Coba lagi dengan mode popup
                  toast.info('Mencoba login dengan Google dalam mode popup...');
                  // Tidak perlu melakukan apa-apa karena kita sudah menggunakan mode popup
                } else if (error.error === 'network_error' || (error.details && error.details.includes('network'))) {
                  toast.error(
                    <div>
                      <p><strong>Error Jaringan</strong></p>
                      <p>Periksa koneksi internet Anda dan coba lagi</p>
                    </div>,
                    { autoClose: 5000 }
                  );
                } else if (error.error === 'invalid_client') {
                  setShowGoogleAuthInstructions(true);
                  toast.error(
                    <div>
                      <p><strong>Client ID Google Tidak Valid</strong></p>
                      <p>Periksa konfigurasi Client ID Google Anda</p>
                    </div>,
                    { autoClose: false }
                  );
                } else {
                  toast.error('Login dengan Google gagal. Silakan coba lagi.');
                }
              }}
              useOneTap={false}
              theme="outline"
              text="signin_with"
              width={300}
              logo_alignment="center"
              shape="rectangular"
              clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
              onScriptLoadError={() => {
                setShowGoogleAuthInstructions(true);
              }}
              // Konfigurasi yang lebih sederhana seperti di Register.jsx
              // Ini akan menggunakan URL OAuth yang benar (oauthchooseaccount)
            />
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Belum punya akun?{' '}
            <Link to="/register-user" className="auth-link mr-2">
              Daftar GHK
            </Link>
            atau{' '}
            <Link to="/register" className="auth-link">
              Daftar Writer
            </Link>
          </p>
        </div>
      </div>

      {/* Instruksi Google Auth */}
      {showGoogleAuthInstructions && (
        <Suspense fallback={null}>
          <GoogleAuthInstructions onClose={() => setShowGoogleAuthInstructions(false)} />
        </Suspense>
      )}
    </div>
  );
}
