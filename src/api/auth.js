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

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login',
      {
        email,
        password,
        remember: true
      },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.success) {
      const { accessToken, user } = response.data;

      // Log untuk debugging
      console.log('Login response:', response.data);

      // Decode token untuk mendapatkan informasi user
      const decoded = jwtDecode(accessToken);
      console.log('Decoded token:', decoded);

      // Pastikan properti is_admin dan role tersimpan dengan benar
      if (user) {
        user.is_admin = decoded.is_admin === 1 || decoded.is_admin === true;
        user.role = decoded.role || 'user';
      }

      // Simpan token dan user data
      setAccessToken(accessToken);
      setUser(user);

      // Simpan kredensial jika browser mendukung
      if (window.PasswordCredential) {
        const cred = new PasswordCredential({
          id: email,
          password: password,
          name: email
        });
        navigator.credentials.store(cred);
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

export const getCsrfToken = async () => {
  try {
    // Cancel request sebelumnya jika ada
    if (csrfCancelToken) {
      csrfCancelToken.cancel('Duplicate request cancelled');
    }

    // Buat cancel token baru
    csrfCancelToken = axios.CancelToken.source();

    // Cek apakah sudah ada token yang valid
    const existingToken = api.defaults.headers.common['X-CSRF-Token'];
    if (existingToken) {
      return existingToken;
    }

    // Cek apakah kita berada di mode development
    const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV === true;
    console.log('Current environment mode:', import.meta.env.MODE, 'isDev:', isDev);

    // Jika dalam mode development dan MOCK_CSRF_TOKEN diaktifkan, gunakan mock token
    // Atau jika kita sudah mencapai batas retry sebelumnya
    if (isDev && (localStorage.getItem('use_mock_csrf') === 'true' || csrfRetryCount >= MAX_RETRY)) {
      console.log('Using mock CSRF token for development');
      localStorage.setItem('use_mock_csrf', 'true'); // Pastikan flag diset
      api.defaults.headers.common['X-CSRF-Token'] = MOCK_CSRF_TOKEN;
      return MOCK_CSRF_TOKEN;
    }

    // Cek jika kita perlu menunggu karena rate limiting
    const now = Date.now();
    if (csrfRetryCount > 0 && now - csrfLastRetryTime < RETRY_DELAY_BASE * Math.pow(2, csrfRetryCount - 1)) {
      console.log('Waiting before retry due to rate limiting...');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_BASE * Math.pow(2, csrfRetryCount - 1)));
    }

    csrfLastRetryTime = Date.now();

    const response = await api.get('/api/auth/csrf-token', {
      withCredentials: true,
      cancelToken: csrfCancelToken.token,
      params: {
        _t: Date.now() // Cache busting
      }
    });

    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
      return response.data.csrfToken;
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
        const delay = RETRY_DELAY_BASE * Math.pow(2, csrfRetryCount - 1);
        console.log(`Waiting ${delay}ms before retry ${csrfRetryCount}/${MAX_RETRY}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return getCsrfToken(); // Recursive retry
      } else {
        // Jika sudah mencapai batas retry
        console.warn('Max retries reached for CSRF token.');
        localStorage.setItem('use_mock_csrf', 'true');

        // Cek apakah kita berada di mode development
        const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV === true;
        console.log('Current environment mode (in catch):', import.meta.env.MODE, 'isDev:', isDev);

        // Gunakan mock token untuk development
        if (isDev) {
          console.warn('Using mock token for development.');
          api.defaults.headers.common['X-CSRF-Token'] = MOCK_CSRF_TOKEN;
          return MOCK_CSRF_TOKEN;
        } else {
          // Untuk production, tampilkan pesan error yang lebih jelas
          console.error('Server may be experiencing high traffic.');
          throw new Error('Server sedang sibuk. Silakan coba lagi nanti.');
        }
      }
    }

    console.error('Error getting CSRF token:', error);
    throw error;
  } finally {
    // Reset csrfCancelToken
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

// Tambahkan fungsi refreshCsrfToken
export const refreshCsrfToken = async () => {
  try {
    const response = await api.get('/api/auth/csrf-token', {
      withCredentials: true
    });

    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
      return response.data.csrfToken;
    }
    throw new Error('CSRF token tidak ditemukan dalam respons');
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
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

