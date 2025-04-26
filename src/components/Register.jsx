import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FaPen, FaUser, FaEnvelope, FaLock, FaExclamationTriangle, FaCheckCircle, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { getCsrfToken } from '../api/auth';
import { toast } from 'react-toastify';
import './AuthPages.css';

// Google One Tap dinonaktifkan karena masalah kompatibilitas

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('initial'); // 'initial', 'pending', 'verified', 'success'
  const [welcomeMessage, setWelcomeMessage] = useState('');
  // Selalu mendaftar sebagai writer
  const navigate = useNavigate();
  const location = useLocation();
  const { register, googleLogin, refreshAuthState } = useAuth();

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    console.log('Auth context in Register:', {
      hasRegister: !!register,
      registerType: typeof register,
      hasGoogleLogin: !!googleLogin
    });

    // Cek apakah ada parameter dari halaman login
    const params = new URLSearchParams(location.search);
    const fromLogin = params.get('from_login');
    const emailParam = params.get('email');

    if (fromLogin === 'true' && emailParam) {
      setEmail(emailParam);
      setWelcomeMessage(`Silakan daftar dengan email ${emailParam} untuk melanjutkan`);
      toast.info(`Email ${emailParam} belum terdaftar. Silakan daftar terlebih dahulu.`, {
        icon: <FaInfoCircle />,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  }, [register, googleLogin, location.search]);

  useEffect(() => {
    // Meta tag untuk Google Client ID tidak diperlukan lagi dengan @react-oauth/google
    // Kita hanya perlu memberikan clientId langsung ke komponen GoogleLogin

    // Log untuk debugging
    console.log('Register component - Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('Register component - Current origin:', window.location.origin);

    const fetchCsrfToken = async () => {
      try {
        await getCsrfToken();
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };
    fetchCsrfToken();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (!register || typeof register !== 'function') {
        console.error('register is not a function:', register);
        setError('Terjadi kesalahan konfigurasi. Silakan hubungi administrator.');
        setIsLoading(false);
        return;
      }

      if (!name || !email || !password) {
        setError('Semua field harus diisi');
        setIsLoading(false);
        return;
      }

      if (name.length < 3) {
        setError('Nama harus minimal 3 karakter');
        setIsLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password harus minimal 8 karakter');
        setIsLoading(false);
        return;
      }

      console.log('Attempting to register with:', { name, email, role: 'writer' });

      const response = await register({
        username: name,
        name,
        email,
        password,
        role: 'writer'
      });

      console.log('Registration response:', response);

      // Writer perlu approval dan verifikasi
      setRegistrationStatus('pending');
      toast.success('Registrasi berhasil!');
      setMessage(response.message || 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi. Akun Anda sedang menunggu persetujuan admin.');

    } catch (error) {
      console.error('Registration error:', error);

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => err.msg).join(', ');
        setError(errorMessages);
      } else {
        const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat registrasi. Silakan coba lagi.';
        setError(errorMsg);
        toast.error(errorMsg);
      }

      setRegistrationStatus('initial');
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, register, navigate]);

  const handleGoogleRegister = useCallback(async (credentialResponse) => {
    try {
      console.log('Attempting Google registration as writer');
      setIsLoading(true);

      const response = await googleLogin(credentialResponse.credential, 'writer');
      console.log('Google registration response:', response);

      if (response.requiresApproval) {
        setRegistrationStatus('pending');
        toast.success('Registrasi dengan Google berhasil!');
        setMessage(response.message || 'Registrasi dengan Google berhasil! Akun Anda sedang menunggu persetujuan admin.');
      } else {
        await refreshAuthState();
        toast.success('Registrasi dengan Google berhasil!');
        setMessage('Registrasi dengan Google berhasil! Anda akan diarahkan ke dashboard writer.');
        setTimeout(() => {
          navigate('/writer/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Google registration error:', error);
      const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat registrasi dengan Google. Silakan coba lagi.';
      setError(errorMsg);
      toast.error(errorMsg);
      setRegistrationStatus('initial');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, googleLogin, refreshAuthState]);

  if (registrationStatus === 'pending') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-status">
            <div className="auth-status-icon pending">
              <FaExclamationTriangle />
            </div>
            <h2 className="auth-status-title">Pendaftaran Sedang Diproses</h2>
            <p className="auth-status-message">
              Terima kasih telah mendaftar sebagai writer di GHK. Akun Anda sedang menunggu persetujuan admin.
            </p>

            <div className="auth-status-steps">
              <h4>Langkah selanjutnya:</h4>
              <ul>
                <li>Cek email Anda untuk tautan verifikasi</li>
                <li>Klik tautan verifikasi untuk mengonfirmasi email Anda</li>
                <li>Admin akan meninjau pendaftaran Anda</li>
                <li>Anda akan menerima email notifikasi saat akun Anda disetujui</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="auth-button"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (registrationStatus === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-status">
            <div className="auth-status-icon success">
              <FaCheckCircle />
            </div>
            <h2 className="auth-status-title">Pendaftaran Berhasil!</h2>
            <p className="auth-status-message">
              Terima kasih telah mendaftar di GHK. Akun Anda telah berhasil dibuat.
            </p>

            <div className="auth-status-steps">
              <h4>Langkah selanjutnya:</h4>
              <ul>
                <li>Anda dapat langsung login dengan akun yang telah dibuat</li>
                <li>Nikmati fitur-fitur yang tersedia untuk pengguna</li>
                <li>Jelajahi konten dan berikan komentar pada artikel</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="auth-button"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <FaPen />
          </div>
          <h1 className="auth-title">Daftar sebagai Writer</h1>
          <p className="auth-subtitle">Buat akun untuk menulis dan mengelola konten</p>
        </div>

        {message && <div className="auth-success">{message}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label htmlFor="name">Nama Lengkap</label>
            <div className="auth-input-wrapper">
              <input
                id="name"
                name="name"
                type="text"
                required
                className="auth-input"
                placeholder="Masukkan nama lengkap Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
              <FaUser className="auth-input-icon" />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="email">Alamat Email</label>
            <div className="auth-input-wrapper">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="auth-input"
                placeholder="Masukkan alamat email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <FaEnvelope className="auth-input-icon" />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="auth-input"
                placeholder="Masukkan password (min. 8 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
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

          {error && <div className="auth-error">{error}</div>}

          {welcomeMessage && (
            <div className="auth-success">
              <FaInfoCircle style={{ marginRight: '8px' }} />
              {welcomeMessage}
            </div>
          )}

          <div className="auth-info">
            <p>Dengan mendaftar sebagai writer, akun Anda akan:</p>
            <ul>
              <li>Memerlukan verifikasi email</li>
              <li>Menunggu persetujuan dari admin</li>
              <li>Mendapatkan akses untuk membuat dan mengelola konten</li>
            </ul>
          </div>

          {/* Google One Tap dinonaktifkan karena masalah kompatibilitas */}

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Mendaftar...' : 'Daftar sebagai Writer'}
          </button>
        </form>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <div className="auth-social-buttons">
          <div className="text-center mb-2">
            <p className="auth-subtitle" style={{ margin: '0 0 5px' }}>Daftar dengan Google</p>
          </div>
          <div className="auth-google-button">
            <GoogleLogin
              onSuccess={handleGoogleRegister}
              onError={(error) => {
                console.error('Google Registration Error:', error);
                toast.error('Registrasi dengan Google gagal. Silakan coba lagi.');
              }}
              useOneTap={false}
              theme="outline"
              text="signup_with"
              width={300}
              clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
            />
          </div>
        </div>

        <div className="auth-footer">
          <div className="flex justify-between mb-3">
            <Link to="/login" className="auth-link">
              Sudah punya akun? Login
            </Link>
            <Link to="/register-user" className="auth-link">
              Daftar sebagai Pengguna
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            Dengan mendaftar di GHK, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.
          </p>
        </div>
      </div>
    </div>
  );
}
