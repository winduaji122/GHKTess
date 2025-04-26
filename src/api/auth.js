import axios from 'axios';
import { apiUrl, endpoints } from './Config';
import { api } from './axios';
import { jwtDecode } from 'jwt-decode';
import {
  clearTokenState,
  setAccessToken,
  getAccessToken
} from '../utils/tokenManager';
import {
  ACCESS_TOKEN_KEY,
  USER_KEY,
  REFRESH_TOKEN_KEY
} from '../utils/constants';

let csrfToken = null;
let csrfCancelToken = null;
let csrfRetryCount = 0;
let csrfLastRetryTime = 0;
const MAX_RETRY = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Fungsi untuk menyimpan CSRF token
export const setCsrfToken = (token) => {
  csrfToken = token;
  if (token) {
    api.defaults.headers.common['X-CSRF-Token'] = token;
  } else {
    delete api.defaults.headers.common['X-CSRF-Token'];
  }
};

export const logout = async () => {
  // Tambahkan flag untuk mencegah multiple logout
  if (window._isLoggingOut) return;
  window._isLoggingOut = true;

  try {
    await api.post('/api/auth/logout');
    removeUser();
    removeAccessToken();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    window._isLoggingOut = false;
  }
};

export const login = async (email, password, rememberMe = true) => {
  try {
    // Validasi input
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new Error('Email tidak valid');
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      throw new Error('Password tidak valid');
    }

    // Log untuk debugging
    console.log(`Login attempt for email: ${email}, remember me: ${rememberMe}`);

    // Pastikan kita memiliki CSRF token yang valid
    let token;
    try {
      token = await getCsrfToken();
    } catch (tokenError) {
      console.warn('Error getting CSRF token for login, using fallback:', tokenError.message);
      // Jika gagal mendapatkan token, gunakan fallback
      token = 'fallback-login-csrf-' + Date.now();
      setCsrfToken(token);
    }

    // Tambahkan retry logic untuk login
    let retryCount = 0;
    const MAX_LOGIN_RETRY = 2;

    const attemptLogin = async () => {
      try {
        // Log untuk debugging
        console.log(`Sending login request to /api/auth/login with email: ${email}`);

        return await api.post('/api/auth/login',
          {
            email,
            password,
            remember_me: rememberMe
          },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': token
            }
          }
        );
      } catch (error) {
        // Log error untuk debugging
        console.error('Login request error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          data: error.response?.data
        });

        // Jika error CSRF atau rate limit dan masih bisa retry
        if ((error.response?.status === 403 || error.response?.status === 429) && retryCount < MAX_LOGIN_RETRY) {
          retryCount++;
          console.log(`Login attempt failed (${error.response?.status}), retrying... (${retryCount}/${MAX_LOGIN_RETRY})`);

          // Refresh CSRF token dan tunggu sebentar
          await refreshCsrfToken(true);
          token = csrfTokenCache.token;

          // Tunggu dengan exponential backoff
          const delay = 1000 * Math.pow(2, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Retry login
          return attemptLogin();
        }

        // Jika error 401 (Unauthorized), kemungkinan password salah
        if (error.response?.status === 401) {
          console.log('Login failed with 401 Unauthorized - likely invalid password');
          // Tambahkan informasi tambahan ke error untuk penanganan di UI
          error.invalidPassword = true;
          error.message = 'Password yang Anda masukkan salah. Silakan coba lagi.';
        }

        throw error;
      }
    };

    const response = await attemptLogin();

    if (response.data?.success) {
      const { accessToken, user } = response.data;

      // Decode token untuk mendapatkan informasi user
      const decoded = jwtDecode(accessToken);

      // Pastikan properti is_admin dan role tersimpan dengan benar
      if (user) {
        user.is_admin = decoded.is_admin === 1 || decoded.is_admin === true;
        user.role = decoded.role || 'user';
      }

      // Simpan token dan user data
      setAccessToken(accessToken);
      setUser(user);

      // Simpan kredensial jika browser mendukung dan user memilih remember me
      if (window.PasswordCredential && rememberMe) {
        try {
          const cred = new PasswordCredential({
            id: email,
            password: password,
            name: email
          });
          navigator.credentials.store(cred);
        } catch (credError) {
          console.warn('Error storing credentials:', credError);
        }
      }

      return { success: true, accessToken, user };
    }

    throw new Error('Invalid login response');
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

export const getProtectedData = async () => {
  try {
    const response = await api.get(endpoints.me);
    return response.data;
  } catch (error) {
    console.error('Protected data error:', error);
    throw error.response ? error.response.data : error;
  }
};

export const getCurrentUser = () => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    console.log('Decoded token:', decoded); // Log untuk debugging

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      is_admin: decoded.is_admin === 1 || decoded.is_admin === true,
      is_verified: decoded.is_verified,
      is_approved: decoded.is_approved
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Mock CSRF token untuk development
const MOCK_CSRF_TOKEN = 'mock-csrf-token-for-development-only';

// Tambahkan cache untuk CSRF token dengan timestamp
let csrfTokenCache = {
  token: null,
  expires: null
};

export const getCsrfToken = async () => {
  try {
    // Cek apakah token di cache masih valid
    const now = Date.now();
    if (csrfTokenCache.token && csrfTokenCache.expires && now < csrfTokenCache.expires) {
      console.log('Using cached CSRF token, valid for', Math.round((csrfTokenCache.expires - now) / 1000), 'seconds');
      setCsrfToken(csrfTokenCache.token);
      return csrfTokenCache.token;
    }

    // Cek apakah sudah ada token yang valid di header
    const existingToken = api.defaults.headers.common['X-CSRF-Token'];
    if (existingToken && !csrfTokenCache.expires) {
      // Jika ada token di header tapi tidak ada expiry, set expiry default 30 menit
      csrfTokenCache = {
        token: existingToken,
        expires: now + 30 * 60 * 1000 // 30 menit
      };
      return existingToken;
    }

    // Cancel request sebelumnya jika ada
    if (csrfCancelToken) {
      csrfCancelToken.cancel('Duplicate request cancelled');
    }

    // Buat cancel token baru
    csrfCancelToken = axios.CancelToken.source();

    // Cek apakah kita perlu menggunakan mock token
    const useMockToken = localStorage.getItem('use_mock_csrf') === 'true' || csrfRetryCount >= MAX_RETRY;

    if (useMockToken) {
      console.log('Using mock CSRF token');
      const mockToken = MOCK_CSRF_TOKEN + '-' + Date.now();
      setCsrfToken(mockToken);

      // Cache token dengan expiry 60 menit
      csrfTokenCache = {
        token: mockToken,
        expires: now + 60 * 60 * 1000 // 60 menit
      };

      return mockToken;
    }

    // Implementasi exponential backoff
    if (csrfRetryCount > 0) {
      const backoffTime = RETRY_DELAY_BASE * Math.pow(2, csrfRetryCount - 1);
      console.log(`Backoff delay: ${backoffTime}ms (retry ${csrfRetryCount}/${MAX_RETRY})`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }

    csrfLastRetryTime = now;

    // Fetch token dari server dengan cache busting
    const response = await api.get('/api/auth/csrf-token', {
      withCredentials: true,
      cancelToken: csrfCancelToken.token,
      params: { _t: now }
    });

    if (response.data?.csrfToken) {
      const token = response.data.csrfToken;
      const cacheDuration = response.data.cacheDuration || 3600; // Default 1 jam jika tidak ada
      const expiryTime = now + (cacheDuration * 1000);

      // Update cache
      csrfTokenCache = {
        token: token,
        expires: expiryTime
      };

      setCsrfToken(token);
      console.log(`CSRF token cached until ${new Date(expiryTime).toLocaleTimeString()}`);
      return token;
    }

    throw new Error('CSRF token tidak ditemukan dalam respons');
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('Request cancelled:', error.message);
      return null;
    }

    // Handle rate limiting (429 Too Many Requests)
    if (error.response && error.response.status === 429) {
      console.warn('Rate limit exceeded (429). Retrying with backoff...');
      csrfRetryCount++;

      if (csrfRetryCount <= MAX_RETRY) {
        return getCsrfToken(); // Retry dengan backoff yang sudah diimplementasi
      } else {
        // Jika sudah mencapai batas retry, gunakan mock token
        console.warn('Max retries reached for CSRF token, using fallback');
        localStorage.setItem('use_mock_csrf', 'true');

        const fallbackToken = 'fallback-csrf-token-' + Date.now();
        setCsrfToken(fallbackToken);

        // Cache fallback token
        csrfTokenCache = {
          token: fallbackToken,
          expires: Date.now() + 60 * 60 * 1000 // 60 menit
        };

        return fallbackToken;
      }
    }

    console.error('Error getting CSRF token:', error);
    throw error;
  } finally {
    csrfCancelToken = null;
  }
};

// Tambahkan fungsi untuk validasi token
export const validateSession = async () => {
  try {
    const token = getAccessToken();
    if (!token || isTokenExpired(token)) {
      return false;
    }

    // Cek validitas token di server
    const response = await api.get('/api/auth/validate-session', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data?.valid === true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
};

// Fungsi untuk refresh CSRF token dengan cache
export const refreshCsrfToken = async (force = false) => {
  try {
    // Jika tidak dipaksa refresh dan token masih valid di cache, gunakan cache
    const now = Date.now();
    if (!force && csrfTokenCache.token && csrfTokenCache.expires && now < csrfTokenCache.expires) {
      console.log('Using cached CSRF token for refresh');
      setCsrfToken(csrfTokenCache.token);
      return csrfTokenCache.token;
    }

    // Reset retry count untuk mendapatkan token baru
    csrfRetryCount = 0;

    // Dapatkan token baru
    return await getCsrfToken();
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);

    // Jika gagal refresh tapi masih ada token di cache, gunakan itu
    if (csrfTokenCache.token) {
      console.warn('Using cached token despite refresh failure');
      return csrfTokenCache.token;
    }

    throw error;
  }
};

// User management functions
export const setUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user data:', error);
  }
};

export const getUser = () => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => !!getUser();

export const getUserRole = () => {
  const user = getUser();
  return user ? user.role : null;
};

export const isAdmin = () => {
  const user = getCurrentUser();
  console.log('Checking admin status:', user); // Log untuk debugging

  if (!user) return false;

  // Periksa baik dari role maupun is_admin
  return (user.role === 'admin' || user.is_admin === true || user.is_admin === 1);
};

export const isWriter = () => {
  const role = getUserRole();
  return role === 'admin' || role === 'writer';
};

export const setGoogleAuth = (user) => {
  setUser(user);
};

export const googleLogin = async (credential) => {
  try {
    const response = await api.post('/api/auth/google-login', { credential });
    console.log('Google login API response:', response.data);
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    console.error('Error in googleLogin:', error);
    throw error;
  }
};

// Interceptors
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  async error => {
    // Biarkan interceptor di AuthContext yang menangani
    return Promise.reject(error);
  }
);

export { api as api };
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

export const decodeToken = (token) => {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const tryAutoLogin = async () => {
  try {
    if (window.PasswordCredential) {
      const cred = await navigator.credentials.get({
        password: true,
        mediation: 'optional'
      });

      if (cred && cred instanceof PasswordCredential) {
        // Auto login dengan kredensial yang tersimpan
        return await login(cred.id, cred.password);
      }
    }
    return null;
  } catch (error) {
    console.error('Auto login error:', error);
    return null;
  }
};

// Pastikan fungsi register didefinisikan
export const register = async (userData) => {
  try {
    // Pastikan CSRF token tersedia
    await getCsrfToken();

    const response = await api.post('/api/auth/register', userData, {
      withCredentials: true
    });

    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan profil user
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/auth/user-profile');
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Fungsi untuk update profil user
export const updateProfile = async (profileData) => {
  try {
    // Pastikan CSRF token tersedia
    await refreshCsrfToken();

    const formData = new FormData();

    // Tambahkan data profil ke FormData
    Object.keys(profileData).forEach(key => {
      if (key === 'profile_picture' && profileData[key] instanceof File) {
        formData.append(key, profileData[key]);
      } else if (profileData[key] !== null && profileData[key] !== undefined) {
        formData.append(key, profileData[key]);
      }
    });

    const response = await api.post('/api/auth/update-profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Fungsi untuk mengubah password
export const changePassword = async (passwordData) => {
  try {
    // Pastikan CSRF token tersedia
    await refreshCsrfToken();

    const response = await api.post('/api/auth/change-password', passwordData);
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

