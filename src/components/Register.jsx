import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import { getCsrfToken } from '../api/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('initial'); // 'initial', 'pending', 'verified'
  const navigate = useNavigate();
  const { register, googleLogin, refreshAuthState } = useAuth();

  useEffect(() => {
    console.log('Auth context in Register:', { 
      hasRegister: !!register, 
      registerType: typeof register,
      hasGoogleLogin: !!googleLogin
    });
  }, [register, googleLogin]);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        await getCsrfToken();
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };
    fetchCsrfToken();
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
      
      setRegistrationStatus('pending');
      setMessage(response.message || 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => err.msg).join(', ');
        setError(errorMessages);
      } else {
        setError(error.response?.data?.message || 'Terjadi kesalahan saat registrasi. Silakan coba lagi.');
      }
      
      setRegistrationStatus('initial');
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, register]);

  const handleGoogleRegister = useCallback(async (credentialResponse) => {
    try {
      console.log('Attempting Google registration');
      setIsLoading(true);
      
      const response = await googleLogin(credentialResponse.credential, 'writer');
      console.log('Google registration response:', response);

      if (response.requiresApproval) {
        setRegistrationStatus('pending');
        setMessage(response.message || 'Registrasi dengan Google berhasil! Akun Anda sedang menunggu persetujuan admin.');
        
      } else {
        await refreshAuthState();
        setMessage('Registrasi dengan Google berhasil! Anda akan diarahkan ke dashboard writer.');
        setTimeout(() => {
          navigate('/writer/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Google registration error:', error);
      setError(error.response?.data?.message || 'Terjadi kesalahan saat registrasi dengan Google. Silakan coba lagi.');
      setRegistrationStatus('initial');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, googleLogin, refreshAuthState]);

  if (registrationStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Pendaftaran Sedang Diproses</h2>
            <p className="mt-1 text-sm text-gray-500">
              Terima kasih telah mendaftar sebagai writer di GHK. Akun Anda sedang menunggu persetujuan admin.
            </p>
          </div>
          
          <div className="mt-5">
            <h3 className="text-sm font-medium text-gray-900">Langkah selanjutnya:</h3>
            <ul className="mt-2 text-sm text-gray-500 list-disc pl-5 space-y-1">
              <li>Cek email Anda untuk tautan verifikasi</li>
              <li>Klik tautan verifikasi untuk mengonfirmasi email Anda</li>
              <li>Admin akan meninjau pendaftaran Anda</li>
              <li>Anda akan menerima email notifikasi saat akun Anda disetujui</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Daftar sebagai Writer</h2>
        
        {message && <p className="text-green-500 text-sm mb-4">{message}</p>}
        
        <GoogleLogin
          onSuccess={handleGoogleRegister}
          onError={(error) => {
            console.error('Google Registration Error:', error);
            setError('Registrasi dengan Google gagal. Silakan coba lagi.');
          }}
          useOneTap
          cookiePolicy={'single_host_origin'}
          scope="email profile"
          render={renderProps => (
            <button 
              onClick={renderProps.onClick} 
              disabled={renderProps.disabled || isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FcGoogle className="w-5 h-5 mr-2" />
              Daftar dengan Google
            </button>
          )}
        />

        <div className="my-4 flex items-center justify-between">
          <hr className="w-full border-t border-gray-300" />
          <span className="px-2 text-gray-500">atau</span>
          <hr className="w-full border-t border-gray-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">Nama</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="mt-2 text-sm text-gray-600">
            <p>Dengan mendaftar sebagai writer, akun Anda akan:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Memerlukan verifikasi email</li>
              <li>Menunggu persetujuan dari admin</li>
              <li>Mendapatkan akses untuk membuat dan mengelola konten</li>
            </ul>
          </div>

          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Sudah punya akun? <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Login di sini</a>
        </p>
        <div className="mt-6">
          <p className="text-center text-xs text-gray-500">
            Dengan mendaftar di GHK, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.
          </p>
        </div>
      </div>
    </div>
  );
}
