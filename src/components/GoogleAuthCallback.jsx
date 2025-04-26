import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

function GoogleAuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        setLoading(true);

        // Ambil kode dan parameter state dari URL
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const isPopupFromState = state === 'popup';

        if (!code) {
          setError('Kode otorisasi tidak ditemukan');

          // Cek apakah ini adalah popup
          const isPopup = window.opener && window.opener !== window;

          if (isPopup) {
            // Tampilkan pesan error di popup
            document.body.innerHTML =
              '<div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">' +
                '<h2 style="color: #e53e3e;">Login Gagal</h2>' +
                '<p>Kode otorisasi tidak ditemukan. Silakan coba lagi.</p>' +
                '<button ' +
                  'onclick="window.close()" ' +
                  'style="background-color: #4a5568; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 15px;"' +
                '>' +
                  'Tutup' +
                '</button>' +
              '</div>';
          } else {
            // Tampilkan toast error jika bukan popup
            toast.error('Kode otorisasi tidak ditemukan');
            navigate('/login');
          }
          return;
        }

        console.log('Google auth code received:', code);

        // Metode 1: Gunakan authService
        try {
          const result = await authService.handleGoogleCallback(code);
          if (result.success) {
            console.log('Google login successful via authService:', result.data);

            // Redirect berdasarkan role
            const user = result.data.user;
            if (user.role === 'writer') {
              // Tampilkan toast sukses dengan styling yang lebih menarik
              toast.success(`Selamat datang kembali, ${user.name}! 👋`, {
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                  padding: '16px',
                  fontWeight: 'bold'
                },
                duration: 5000,
                icon: '✍️'
              });
              navigate('/writer/posts');
            } else if (user.role === 'admin') {
              toast.success(`Selamat datang kembali, Admin ${user.name}! 👋`, {
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                  padding: '16px',
                  fontWeight: 'bold'
                },
                duration: 5000,
                icon: '👑'
              });
              navigate('/admin/posts');
            } else {
              toast.success(`Selamat datang kembali, ${user.name}! 👋`, {
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                  padding: '16px',
                  fontWeight: 'bold'
                },
                duration: 5000,
                icon: '👋'
              });
              navigate('/');
            }
            return;
          }
        } catch (serviceError) {
          console.error('Error using authService:', serviceError);
          // Lanjutkan ke metode 2 jika metode 1 gagal
        }

        // Metode 2: Gunakan axios langsung
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/google-callback`,
          { code },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data.success) {
          // Login berhasil
          const { accessToken, user } = response.data;

          // Pastikan data user lengkap, terutama profile_picture
          console.log('Google login user data:', user);
          console.log('Google profile picture:', user.profile_picture);

          // Jika tidak ada profile_picture tapi ada picture dari Google, gunakan itu
          if (!user.profile_picture && user.picture) {
            console.log('Using Google picture as profile_picture:', user.picture);
            user.profile_picture = user.picture;
          }

          // Simpan token dan data user
          if (login) {
            login(accessToken, user);
          }

          console.log('Google login successful via direct axios:', user);

          // Tandai login berhasil di localStorage untuk deteksi oleh halaman utama
          localStorage.setItem('google_login_success', 'true');
          localStorage.setItem('google_login_timestamp', Date.now().toString());

          // Simpan data user di localStorage
          localStorage.setItem('auth_user', JSON.stringify(user));

          // Trigger event untuk memberitahu komponen lain bahwa data user telah diperbarui
          window.dispatchEvent(new Event('user:dataUpdated'));

          // Cek parameter state untuk menentukan alur redirect
          const isRedirect = state === 'redirect';

          // Jika login dari redirect, cek apakah ada URL redirect yang disimpan
          if (isRedirect) {
            const redirectUrl = sessionStorage.getItem('login_redirect_url');
            if (redirectUrl) {
              sessionStorage.removeItem('login_redirect_url');
              console.log('Redirecting back to:', redirectUrl);
              window.location.href = redirectUrl;
              return;
            }
          }

          // Fallback untuk kasus lain (termasuk popup lama)
          if (window.opener) {
            // Ini adalah popup lama, kirim data dan tutup
            console.log('Login successful, handling legacy popup case...');

            // Kirim token/data auth ke window utama dan tutup popup SEGERA
            try {
              console.log('Sending auth data to parent window and closing popup immediately');

              // Simpan data user di localStorage sebagai fallback
              localStorage.setItem('auth_user', JSON.stringify(user));
              localStorage.setItem('google_login_success', 'true');
              localStorage.setItem('google_login_timestamp', Date.now().toString());

              // Kirim pesan ke window utama dengan postMessage
              if (window.opener) {
                // Kirim data auth ke window utama
                window.opener.postMessage({
                  type: 'GOOGLE_LOGIN_SUCCESS',
                  user: user,
                  token: accessToken
                }, '*'); // Gunakan '*' untuk menghindari masalah cross-origin

                console.log('Auth data sent to parent window');
              } else {
                console.error('window.opener is null, cannot send message');
              }

              // Simpan data auth di localStorage
              try {
                localStorage.setItem('auth_user', JSON.stringify(user));
                localStorage.setItem('auth_token', accessToken);
                localStorage.setItem('google_login_success', 'true');
                localStorage.setItem('google_login_timestamp', Date.now().toString());
                console.log('Auth data saved to localStorage');
              } catch (e) {
                console.error('Error saving auth data to localStorage:', e);
              }

              // Redirect ke halaman sukses khusus
              window.location.href = `${window.location.origin}/google-login-success`;
            } catch (err) {
              console.error('Failed to communicate with parent window:', err);

              // Jika gagal, redirect ke halaman login
              window.location.href = window.location.origin + '/login?popup_closed=false';
            }
          } else {
            // Jika bukan popup dan bukan redirect, redirect berdasarkan role
            if (!isRedirect) {
              if (user.role === 'writer') {
                // Tampilkan toast sukses dengan styling yang lebih menarik
                toast.success(`Selamat datang kembali, ${user.name}! 👋`, {
                  style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                    padding: '16px',
                    fontWeight: 'bold'
                  },
                  duration: 5000,
                  icon: '✍️'
                });
                navigate('/writer/posts');
              } else if (user.role === 'admin') {
                toast.success(`Selamat datang kembali, Admin ${user.name}! 👋`, {
                  style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                    padding: '16px',
                    fontWeight: 'bold'
                  },
                  duration: 5000,
                  icon: '👑'
                });
                navigate('/admin/posts');
              } else {
                toast.success(`Selamat datang kembali, ${user.name}! 👋`, {
                  style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                    padding: '16px',
                    fontWeight: 'bold'
                  },
                  duration: 5000,
                  icon: '👋'
                });
                navigate('/');
              }
            }
          }
        } else if (response.data.requiresApproval) {
          toast.info('Akun Anda sedang menunggu persetujuan admin.');
          navigate('/login');
        } else {
          setError('Login dengan Google gagal. Silakan coba lagi.');
          toast.error('Login dengan Google gagal');
          navigate('/login');
        }
      } catch (error) {
        console.error('Google callback error:', error);
        const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat login dengan Google';
        setError(errorMessage);

        // Cek apakah ini adalah popup
        const isPopup = window.opener && window.opener !== window;

        if (isPopup) {
          // Tampilkan pesan error di popup
          document.body.innerHTML =
            '<div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">' +
              '<h2 style="color: #e53e3e;">Login Gagal</h2>' +
              '<p>' + errorMessage + '</p>' +
              '<button ' +
                'onclick="window.close()" ' +
                'style="background-color: #4a5568; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 15px;"' +
              '>' +
                'Tutup' +
              '</button>' +
            '</div>';
        } else {
          // Tampilkan toast error jika bukan popup
          toast.error(errorMessage);
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [location, navigate, login]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {loading ? 'Memproses Login Google...' : (error ? 'Login Gagal' : 'Login Berhasil')}
          </h2>

          {loading && (
            <div className="mt-4">
              <p className="text-gray-600">Mohon tunggu sebentar...</p>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Kembali ke Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoogleAuthCallback;