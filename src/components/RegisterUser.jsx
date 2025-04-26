import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCsrfToken } from '../api/auth';
import { FaUser, FaEnvelope, FaLock, FaCheckCircle, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';
import './AuthPages.css';
import { toast } from 'react-toastify';

// Google One Tap dinonaktifkan karena masalah kompatibilitas

export default function RegisterUser() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('initial'); // 'initial', 'success'
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Fetch CSRF token on component mount and check for URL params
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        await getCsrfToken();
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };
    fetchCsrfToken();

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
  }, [location.search]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (!register || typeof register !== 'function') {
        console.error('register is not a function:', register);
        const errorMsg = 'Terjadi kesalahan konfigurasi. Silakan hubungi administrator.';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (!name || !email || !password) {
        const errorMsg = 'Semua field harus diisi';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (name.length < 3) {
        const errorMsg = 'Nama harus minimal 3 karakter';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (password.length < 8) {
        const errorMsg = 'Password harus minimal 8 karakter';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      console.log('Attempting to register user with:', { name, email, role: 'user' });

      // Cek apakah email sudah terdaftar sebelum mencoba mendaftar
      try {
        const checkResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/check-email?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const checkResult = await checkResponse.json();

        if (checkResponse.ok && checkResult.exists) {
          const errorMsg = `Email ${email} sudah terdaftar. Silakan login atau gunakan email lain.`;
          setError(errorMsg);
          toast.error(errorMsg, {
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
          setIsLoading(false);
          return;
        }
      } catch (checkError) {
        console.error('Error checking email:', checkError);
        // Jika endpoint check-email tidak tersedia, lanjutkan dengan pendaftaran
        // dan tangani error 'email sudah terdaftar' dari endpoint register
        console.log('Continuing with registration despite email check failure');
      }

      const response = await register({
        username: name,
        name,
        email,
        password,
        role: 'user'
      });

      console.log('Registration response:', response);

      // User biasa langsung sukses
      setRegistrationStatus('success');
      setMessage(response.message || 'Registrasi berhasil! Anda dapat login sekarang.');

      // Tampilkan toast sukses
      toast.success('Pendaftaran berhasil! Akun Anda telah dibuat.', {
        icon: '🎉',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });

      // Redirect ke halaman login setelah 3 detik
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = '';
      console.error('Registration error details:', error.response?.data || error.message || error);

      // Cek apakah error terkait email sudah terdaftar
      if (error.response?.data?.message?.includes('already exists') ||
          error.response?.data?.message?.includes('sudah terdaftar') ||
          error.response?.data?.message?.includes('already registered') ||
          error.response?.data?.code === 'EMAIL_ALREADY_EXISTS') {

        errorMessage = `Email ${email} sudah terdaftar. Silakan login atau gunakan email lain.`;
        // Redirect ke halaman login setelah 3 detik
        setTimeout(() => {
          navigate(`/login?email=${encodeURIComponent(email)}`);
        }, 3000);
      } else if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map(err => err.msg).join(', ');
      } else {
        errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat registrasi. Silakan coba lagi.';
      }

      setError(errorMessage);

      // Tampilkan toast error
      toast.error(errorMessage, {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });

      setRegistrationStatus('initial');
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, register, navigate]);

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
            <FaUser />
          </div>
          <h1 className="auth-title">Daftar Akun Pengguna</h1>
          <p className="auth-subtitle">Buat akun untuk mengakses fitur komentar dan like</p>
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
            <p>Dengan mendaftar sebagai pengguna biasa, Anda akan:</p>
            <ul>
              <li>Mendapatkan akses langsung tanpa persetujuan admin</li>
              <li>Dapat memberikan komentar pada artikel</li>
              <li>Dapat menyukai artikel yang Anda baca</li>
            </ul>
          </div>

          {/* Google One Tap dinonaktifkan karena masalah kompatibilitas */}

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <div className="auth-footer">
          <div className="flex justify-between mb-3">
            <Link to="/login" className="auth-link">
              Sudah punya akun? Login
            </Link>
            <Link to="/register" className="auth-link">
              Daftar sebagai Writer
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
