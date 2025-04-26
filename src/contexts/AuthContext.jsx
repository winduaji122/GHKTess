import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import {
  setAccessToken,
  clearTokenState,
  getAccessToken,
  decodeToken,
  refreshToken
} from '../utils/tokenManager';
import { api } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const AuthContext = createContext();
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 menit

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef(null);
  const isRefreshing = useRef(false);
  const refreshPromise = useRef(null);

  // Fungsi clearAuthState telah digabungkan ke dalam fungsi logout

  const setupTokenRefresh = useCallback(async (token) => {
    try {
      if (!token) return;

      // Decode token untuk mendapatkan waktu kadaluarsa
      const decoded = jwtDecode(token);
      const expiresIn = decoded.exp * 1000 - Date.now();

      // Refresh token 1 menit sebelum kadaluarsa
      const refreshTime = expiresIn - 60000;

      // Clear timeout yang ada jika ada
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Set timeout baru
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await api.get('/api/auth/refresh-token');
          if (response.data.success) {
            setAccessToken(response.data.token);
            const userData = response.data.user;
            setUser(userData);
            setIsLoggedIn(true);
            // Simpan data user di localStorage
            localStorage.setItem('auth_user', JSON.stringify(userData));
            console.log('User data saved to localStorage during refresh:', userData);
            // Setup refresh token baru
            setupTokenRefresh(response.data.token);
          } else {
            // Jika refresh gagal, reset state dan logout user
            setUser(null);
            setIsLoggedIn(false);
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_persistent');
            clearTokenState();
            window.dispatchEvent(new Event('user:logout'));
            toast.error('Sesi Anda telah berakhir, silakan masuk kembali');
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
          // Reset state dan logout user
          setUser(null);
          setIsLoggedIn(false);
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_persistent');
          clearTokenState();
          window.dispatchEvent(new Event('user:logout'));
          toast.error('Sesi Anda telah berakhir, silakan masuk kembali');
        }
      }, refreshTime);
    } catch (error) {
      console.error('Error setting up token refresh:', error);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    const handleSessionExpired = () => {
      // Reset state dan logout user
      setUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_persistent');
      clearTokenState();
      window.dispatchEvent(new Event('user:logout'));
      navigate('/login');
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);

    const checkAuth = async () => {
      try {
        // Cek apakah user memilih "Ingat Saya" sebelumnya
        const isPersistent = localStorage.getItem('auth_persistent') === 'true';
        console.log(`Auth check with persistent login: ${isPersistent}`);

        // Jika persistent login aktif, coba refresh token terlebih dahulu
        // Tambahkan pengecekan apakah user benar-benar ingin persistent login
        // dengan memeriksa apakah ada flag logout yang baru saja dilakukan
        const recentlyLoggedOut = sessionStorage.getItem('recently_logged_out');

        // Cek apakah ini adalah halaman publik yang tidak memerlukan login
        const isPublicRoute = window.location.pathname === '/' ||
                             window.location.pathname.startsWith('/post/') ||
                             window.location.pathname.startsWith('/label/') ||
                             window.location.pathname.startsWith('/carousel-post/') ||
                             window.location.pathname === '/spotlight' ||
                             window.location.pathname === '/search';

        // Jika ini adalah halaman publik, jangan paksa refresh token
        if (isPublicRoute) {
          console.log('Public route detected, skipping forced token refresh');
          setLoading(false);
          // Tetap coba refresh token di background jika persistent login aktif
          if (isPersistent && !recentlyLoggedOut) {
            try {
              console.log('Attempting background refresh token for public route');
              refreshToken().catch(err => console.log('Background token refresh failed, ignoring for public route'));
            } catch (e) {
              // Ignore errors for public routes
            }
          }
          return; // Keluar dari checkAuth untuk halaman publik
        }

        if (isPersistent && !recentlyLoggedOut) {
          try {
            console.log('Attempting to refresh token for persistent login');
            const refreshResult = await refreshToken();
            if (refreshResult && refreshResult.success) {
              console.log('Token refreshed successfully for persistent login');
            }
          } catch (refreshError) {
            console.error('Error refreshing token during auth check:', refreshError);
            // Hapus flag persistent login jika refresh gagal
            localStorage.removeItem('auth_persistent');
          }
        } else if (recentlyLoggedOut) {
          // Hapus flag recently_logged_out setelah digunakan
          console.log('User recently logged out, skipping token refresh');
          sessionStorage.removeItem('recently_logged_out');
          localStorage.removeItem('auth_persistent');
        }

        const token = getAccessToken();
        if (token) {
          const decoded = decodeToken(token);
          if (decoded) {
            // Ambil data dasar dari token
            const basicUserData = {
              id: decoded.id,
              email: decoded.email,
              role: decoded.role,
              is_admin: decoded.is_admin
            };

            // Set data dasar terlebih dahulu
            setUser(basicUserData);
            setIsLoggedIn(true);
            setupTokenRefresh(token);

            // Coba ambil data lengkap dari API
            try {
              console.log('Fetching complete user profile during init');

              // Cek apakah ada data user di localStorage yang bisa digunakan
              const storedUserData = localStorage.getItem('auth_user');
              let storedUser = null;

              if (storedUserData) {
                try {
                  storedUser = JSON.parse(storedUserData);
                  console.log('Found stored user data in localStorage:', storedUser);

                  // Jika ada profile_picture di localStorage, gunakan data ini
                  if (storedUser.profile_picture) {
                    console.log('Using profile_picture from localStorage:', storedUser.profile_picture);
                    // Gabungkan data dasar dengan data dari localStorage
                    const mergedUserData = { ...basicUserData, ...storedUser };
                    setUser(mergedUserData);
                    localStorage.setItem('auth_user', JSON.stringify(mergedUserData));
                    console.log('Merged user data saved to localStorage during init');

                    // Dispatch event untuk memberitahu komponen lain
                    window.dispatchEvent(new Event('user:dataUpdated'));
                    return; // Keluar dari fungsi karena sudah mendapatkan data yang diperlukan
                  }
                } catch (parseError) {
                  console.error('Error parsing stored user data:', parseError);
                }
              }

              // Jika tidak ada data di localStorage atau tidak ada profile_picture, coba ambil dari API
              const profileResponse = await api.get('/api/auth/user-profile');

              if (profileResponse.data && profileResponse.data.success) {
                const completeUserData = profileResponse.data.user;
                console.log('Complete user data received during init:', completeUserData);
                console.log('Profile picture in init data:', completeUserData.profile_picture);

                // Update state dengan data lengkap
                setUser(completeUserData);

                // Simpan data lengkap di localStorage
                localStorage.setItem('auth_user', JSON.stringify(completeUserData));
                console.log('Complete user data saved to localStorage during init');

                // Dispatch event untuk memberitahu komponen lain
                window.dispatchEvent(new Event('user:dataUpdated'));
              } else {
                // Jika gagal, gunakan data dasar
                console.warn('Failed to get complete profile during init, using basic data');
                localStorage.setItem('auth_user', JSON.stringify(basicUserData));
                console.log('Basic user data saved to localStorage during init:', basicUserData);
              }
            } catch (profileError) {
              console.error('Error fetching complete profile during init:', profileError);

              // Cek apakah error adalah 403 (Forbidden) - endpoint hanya untuk admin
              if (profileError.response && profileError.response.status === 403) {
                console.log('User profile endpoint is admin-only, using stored data if available');

                // Cek apakah ada data user di localStorage yang bisa digunakan
                const storedUserData = localStorage.getItem('auth_user');
                if (storedUserData) {
                  try {
                    const storedUser = JSON.parse(storedUserData);
                    console.log('Using stored user data after 403 error:', storedUser);

                    // Gabungkan data dasar dengan data dari localStorage
                    const mergedUserData = { ...basicUserData, ...storedUser };
                    setUser(mergedUserData);
                    localStorage.setItem('auth_user', JSON.stringify(mergedUserData));

                    // Dispatch event untuk memberitahu komponen lain
                    window.dispatchEvent(new Event('user:dataUpdated'));
                    return; // Keluar dari fungsi karena sudah mendapatkan data yang diperlukan
                  } catch (parseError) {
                    console.error('Error parsing stored user data:', parseError);
                  }
                }
              }

              // Fallback ke data dasar jika tidak ada data di localStorage
              localStorage.setItem('auth_user', JSON.stringify(basicUserData));
              console.log('Basic user data saved to localStorage during init (after error):', basicUserData);
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Hapus state auth jika terjadi error
        setUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_persistent');
        clearTokenState();
        window.dispatchEvent(new Event('user:logout'));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [navigate, setupTokenRefresh]);

  const login = useCallback(async (email, password, rememberMe = false) => {
    try {
      // Validasi input
      if (!email || typeof email !== 'string' || !email.trim()) {
        throw new Error('Email tidak valid');
      }

      if (!password || typeof password !== 'string' || !password.trim()) {
        throw new Error('Password tidak valid');
      }

      // Log untuk debugging
      console.log(`Login attempt with email: ${email}, remember me: ${rememberMe}`);

      const response = await api.post('/api/auth/login', { email, password, remember_me: rememberMe }, {
        withCredentials: true
      });

      // Set storage type berdasarkan preferensi "Ingat Saya"
      if (rememberMe) {
        localStorage.setItem('auth_persistent', 'true');
      }

      if (response.data?.accessToken && response.data?.user) {
        const { accessToken, user } = response.data;
        setAccessToken(accessToken);

        // Setelah login berhasil, ambil data profil lengkap termasuk profile_picture
        try {
          console.log('Fetching complete user profile after login');
          const profileResponse = await api.get('/api/auth/user-profile');
          if (profileResponse.data && profileResponse.data.success) {
            const completeUserData = profileResponse.data.user;
            console.log('Complete user data received:', completeUserData);
            setUser(completeUserData);

            // Simpan data user lengkap di localStorage
            localStorage.setItem('auth_user', JSON.stringify(completeUserData));
            console.log('Complete user data saved to localStorage:', completeUserData);
          } else {
            // Jika gagal mendapatkan profil lengkap, gunakan data dari login
            console.warn('Failed to get complete profile, using login data');
            setUser(user);
            localStorage.setItem('auth_user', JSON.stringify(user));
            console.log('Basic user data saved to localStorage:', user);
          }
        } catch (profileError) {
          console.error('Error fetching complete profile:', profileError);
          // Fallback ke data login jika gagal mendapatkan profil lengkap
          setUser(user);
          localStorage.setItem('auth_user', JSON.stringify(user));
          console.log('Basic user data saved to localStorage (after error):', user);
        }

        setIsLoggedIn(true);

        // Dispatch event untuk memberitahu komponen lain bahwa user telah login
        window.dispatchEvent(new Event('user-login-success'));

        // Redirect berdasarkan role
        if (user.role === 'admin') {
          navigate('/admin/posts');
        } else if (user.role === 'writer') {
          navigate('/writer/posts');
        } else {
          // Untuk user biasa, arahkan ke halaman utama
          navigate('/');
        }

        return { success: true, user };
      }

      console.error('Invalid login response format:', response.data);
      throw new Error('Invalid login response format');
    } catch (error) {
      console.error('Login failed:', error);

      // Cek apakah error adalah 401 (Unauthorized) - kemungkinan password salah
      if (error.response?.status === 401) {
        console.log('Login failed with 401 Unauthorized - likely invalid password');
        // Tambahkan informasi tambahan ke error untuk penanganan di UI
        error.invalidPassword = true;
        error.message = 'Password yang Anda masukkan salah. Silakan coba lagi.';
      }

      throw error;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      console.log('Logging out user in AuthContext...');

      // Panggil API logout terlebih dahulu untuk menghapus cookie refresh token di server
      // Ini penting dilakukan sebelum menghapus state lokal
      await api.post('/api/auth/logout', {}, {
        withCredentials: true
      });

      // Hapus semua data auth
      setUser(null);
      setIsLoggedIn(false);

      // Hapus semua data dari localStorage dan sessionStorage
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_persistent');
      localStorage.removeItem('token');
      localStorage.removeItem('tokenStorageType');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('token');

      // Tambahkan flag untuk menandai bahwa user baru saja logout
      // Flag ini akan digunakan untuk mencegah auto-login saat halaman di-refresh
      sessionStorage.setItem('recently_logged_out', 'true');

      // Hapus token dari memory dan headers
      clearTokenState();

      // Trigger event untuk memberitahu komponen lain bahwa user telah logout
      window.dispatchEvent(new Event('user:logout'));

      // Hapus cookie dengan mengatur expired date ke masa lalu
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      console.log('User logged out, all state and cookies cleared');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Tetap hapus state meskipun API call gagal
      setUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_persistent');
      localStorage.removeItem('token');
      localStorage.removeItem('tokenStorageType');
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('token');

      // Tambahkan flag untuk menandai bahwa user baru saja logout
      sessionStorage.setItem('recently_logged_out', 'true');

      clearTokenState();

      // Hapus cookie dengan mengatur expired date ke masa lalu
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      window.dispatchEvent(new Event('user:logout'));
      return false;
    }
  }, [clearTokenState]);

  const register = useCallback(async (userData) => {
    try {
      console.log('Registering user with data:', { ...userData, password: '****' });

      // Pastikan userData memiliki semua field yang diperlukan
      if (!userData.name || !userData.email || !userData.password || !userData.role) {
        throw new Error('Data registrasi tidak lengkap');
      }

      // Panggil API register
      const response = await api.post('/api/auth/register', userData, {
        withCredentials: true
      });

      console.log('Register response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }, []);

  // Fungsi untuk me-refresh data pengguna dari API
  const refreshUserData = useCallback(async () => {
    try {
      console.log('Refreshing user data from API');

      // Ambil data user saat ini dari state atau localStorage
      const currentUser = user || JSON.parse(localStorage.getItem('auth_user') || '{}');
      console.log('Current user data before refresh:', currentUser);

      try {
        // Coba ambil data dari API user-profile
        const response = await api.get('/api/auth/user-profile');

        if (response.data && response.data.success) {
          const userData = response.data.user;
          console.log('User data refreshed from API:', userData);
          console.log('Profile picture in refreshed data:', userData.profile_picture);

          // Update state user
          setUser(userData);

          // Update localStorage
          localStorage.setItem('auth_user', JSON.stringify(userData));
          console.log('Updated user data in localStorage');

          // Trigger event untuk memberitahu komponen lain bahwa data user telah diperbarui
          window.dispatchEvent(new Event('user:dataUpdated'));
          console.log('Dispatched user:dataUpdated event');

          return userData;
        } else {
          console.error('Failed to refresh user data:', response.data);
          return currentUser; // Kembalikan data user saat ini sebagai fallback
        }
      } catch (apiError) {
        console.error('Error refreshing user data from API:', apiError);

        // Coba endpoint /api/auth/me sebagai fallback
        try {
          console.log('Trying /api/auth/me as fallback');
          const meResponse = await api.get('/api/auth/me');
          if (meResponse.data) {
            const userData = meResponse.data;
            console.log('User data from /me endpoint:', userData);

            // Gabungkan dengan data yang ada
            const mergedData = { ...currentUser, ...userData };

            // Update state user
            setUser(mergedData);

            // Update localStorage
            localStorage.setItem('auth_user', JSON.stringify(mergedData));

            // Trigger event
            window.dispatchEvent(new Event('user:dataUpdated'));

            return mergedData;
          }
        } catch (meError) {
          console.error('Error fetching from /me endpoint:', meError);
        }

        // Jika semua gagal, gunakan data yang ada
        return currentUser;
      }
    } catch (error) {
      console.error('Error in refreshUserData:', error);
      // Kembalikan data user dari localStorage sebagai fallback terakhir
      try {
        const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
        return storedUser;
      } catch (parseError) {
        console.error('Error parsing stored user data:', parseError);
        return null;
      }
    }
  }, [user]);

  // Fungsi untuk login dengan Google
  const googleLogin = useCallback(async (credential, role = 'user') => {
    try {
      console.log('Google login with role:', role);
      const response = await api.post('/api/auth/google-login', {
        token: credential,
        role
      });

      if (response.data.accessToken) {
        setAccessToken(response.data.accessToken);

        // Pastikan data user lengkap, terutama profile_picture
        const userData = response.data.user;
        console.log('Google login user data:', userData);
        console.log('Google profile picture:', userData.profile_picture);

        // Jika tidak ada profile_picture tapi ada picture dari Google, gunakan itu
        if (!userData.profile_picture && userData.picture) {
          console.log('Using Google picture as profile_picture:', userData.picture);
          userData.profile_picture = userData.picture;
        }

        setUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem('auth_user', JSON.stringify(userData));

        // Simpan token di localStorage untuk persistensi
        localStorage.setItem('google_login_success', 'true');
        localStorage.setItem('google_login_timestamp', Date.now().toString());

        // Trigger event untuk memberitahu komponen lain bahwa data user telah diperbarui
        window.dispatchEvent(new Event('user:dataUpdated'));

        // Dispatch event untuk memberitahu komponen lain bahwa user telah login
        window.dispatchEvent(new Event('user-login-success'));

        // Coba ambil data profil lengkap, tapi jangan gagalkan login jika error
        try {
          const profileResponse = await api.get('/api/auth/user-profile');
          if (profileResponse.data && profileResponse.data.success) {
            const completeUserData = profileResponse.data.user;
            console.log('Complete user data received after Google login:', completeUserData);
            setUser(completeUserData);
            localStorage.setItem('auth_user', JSON.stringify(completeUserData));
          }
        } catch (profileError) {
          // Jika error 403, ini normal karena endpoint mungkin hanya untuk admin
          if (profileError.response && profileError.response.status === 403) {
            console.log('User profile endpoint is admin-only, using Google data');
          } else {
            console.error('Error fetching complete profile after Google login:', profileError);
          }
          // Tetap gunakan data dari Google login
        }

        return { ...response.data, user: userData, success: true };
      }

      // Jika tidak ada accessToken, mungkin akun memerlukan approval
      if (response.data.requiresApproval) {
        return { ...response.data, success: false, requiresApproval: true };
      }

      return { ...response.data, success: false };
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }, []);

  // Fungsi untuk refresh auth state
  const refreshAuthState = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return false;

      try {
        // Coba ambil data dari API user-profile
        const response = await api.get('/api/auth/user-profile');
        if (response.data && response.data.success) {
          setUser(response.data.user);
          setIsLoggedIn(true);
          localStorage.setItem('auth_user', JSON.stringify(response.data.user));
          return true;
        }
      } catch (profileError) {
        // Jika endpoint user-profile mengembalikan 403, gunakan data dari localStorage
        if (profileError.response && profileError.response.status === 403) {
          console.log('User profile endpoint is admin-only, using stored user data');

          // Ambil data user dari localStorage
          const storedUserData = localStorage.getItem('auth_user');
          if (storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              setUser(userData);
              setIsLoggedIn(true);
              return true;
            } catch (parseError) {
              console.error('Error parsing stored user data:', parseError);
            }
          }

          // Jika tidak ada data di localStorage, coba endpoint me
          try {
            const meResponse = await api.get('/api/auth/me');
            if (meResponse.data && meResponse.data.user) {
              setUser(meResponse.data.user);
              setIsLoggedIn(true);
              localStorage.setItem('auth_user', JSON.stringify(meResponse.data.user));
              return true;
            }
          } catch (meError) {
            console.error('Error fetching user data from /api/auth/me:', meError);
          }
        } else {
          // Jika error bukan 403, log error
          console.error('Error fetching user profile:', profileError);
        }
      }

      return false;
    } catch (error) {
      console.error('Error refreshing auth state:', error);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn,
      loading,
      login,
      register,
      logout,
      refreshUserData,
      googleLogin,
      refreshAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};