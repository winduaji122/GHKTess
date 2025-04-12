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

  const clearAuthState = useCallback(async () => {
    setUser(null);
    setIsLoggedIn(false);
    await clearTokenState();
    // Hapus data user dari localStorage
    localStorage.removeItem('auth_user');
    console.log('User data removed from localStorage');
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Trigger event untuk memberitahu komponen lain bahwa data user telah diperbarui
    window.dispatchEvent(new Event('user:dataUpdated'));
    console.log('Dispatched user:dataUpdated event after logout');
  }, []);

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
          const response = await api.post('/api/auth/refresh-token');
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
            // Jika refresh gagal, logout user
            clearAuthState();
            toast.error('Sesi Anda telah berakhir, silakan masuk kembali');
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
          clearAuthState();
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
      clearAuthState();
      navigate('/login');
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);

    const checkAuth = async () => {
      try {
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
              } else {
                // Jika gagal, gunakan data dasar
                console.warn('Failed to get complete profile during init, using basic data');
                localStorage.setItem('auth_user', JSON.stringify(basicUserData));
                console.log('Basic user data saved to localStorage during init:', basicUserData);
              }
            } catch (profileError) {
              console.error('Error fetching complete profile during init:', profileError);
              // Fallback ke data dasar
              localStorage.setItem('auth_user', JSON.stringify(basicUserData));
              console.log('Basic user data saved to localStorage during init (after error):', basicUserData);
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await clearAuthState();
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
  }, [clearAuthState, navigate, setupTokenRefresh]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password }, {
        withCredentials: true
      });

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

        if (user.is_admin) {
          navigate('/admin/posts');
        } else {
          navigate('/dashboard');
        }

        return { success: true, user };
      }

      console.error('Invalid login response format:', response.data);
      throw new Error('Invalid login response format');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthState();
    }
  }, [clearAuthState]);

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
      const response = await api.get('/api/auth/user-profile');

      if (response.data && response.data.success) {
        const userData = response.data.user;
        console.log('User data refreshed:', userData);
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
        return null;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
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
      refreshUserData
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