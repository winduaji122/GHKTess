import axios from 'axios';
import {
  getAccessToken,
  clearTokenState,
  refreshToken,
  setAccessToken,
  decodeToken as decodeJwtToken
} from '../utils/tokenManager';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

// Tambahkan logging yang lebih detail untuk membantu debugging
console.log('%c API Base URL being used: ' + BASE_URL, 'background: #222; color: #bada55; font-size: 14px; padding: 5px;');
console.log('Environment variables:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  NODE_ENV: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD
});

// Cek apakah server dapat diakses
fetch(BASE_URL + '/api/health')
  .then(response => {
    if (response.ok) {
      console.log('%c Backend server is reachable! ✅', 'background: green; color: white; font-size: 14px; padding: 5px;');
      return response.json();
    } else {
      throw new Error(`Server responded with status: ${response.status}`);
    }
  })
  .then(data => console.log('Server health check:', data))
  .catch(error => {
    console.error('%c Backend server is NOT reachable! ❌', 'background: red; color: white; font-size: 14px; padding: 5px;');
    console.error('Error connecting to backend:', error);
  });
const DEFAULT_TIMEOUT = 15000;

// Base config
const axiosConfig = {
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

// Instances
export const publicApi = axios.create(axiosConfig);
export const api = axios.create(axiosConfig);

// Request cache dengan timeout
const cache = new Map();
const CACHE_DURATION = 5000; // 5 detik

const getCacheKey = (config) => {
  const { method, url, params } = config;
  return `${method}:${url}:${JSON.stringify(params || {})}`;
};

const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Request interceptor untuk public API
publicApi.interceptors.request.use(
  async (config) => {
    // Skip cache untuk non-GET requests
    if (config.method?.toLowerCase() !== 'get' || config.skipCache) {
      return config;
    }

    const cacheKey = getCacheKey(config);
    const cachedData = cache.get(cacheKey);

    if (cachedData && isCacheValid(cachedData.timestamp)) {
      return Promise.resolve({
        ...cachedData.response,
        fromCache: true
      });
    }

    // Hapus cache yang expired
    cache.delete(cacheKey);

    // Pastikan URL dan baseURL ada
    if (!config.url) {
      throw new Error('URL is required');
    }

    // Pastikan baseURL selalu ada
    config.baseURL = BASE_URL;

    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor untuk private API
api.interceptors.request.use(
  async (config) => {
    // Handle auth token
    // Jangan tambahkan token untuk endpoint login, register, dan refresh-token
    if (!config.url?.includes('/api/auth/login') &&
        !config.url?.includes('/api/auth/register') &&
        !config.url?.includes('/api/auth/refresh-token')) {
      const token = getAccessToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Pastikan URL dan baseURL ada
    if (!config.url) {
      throw new Error('URL is required');
    }

    // Pastikan baseURL selalu ada
    config.baseURL = BASE_URL;

    // Tetap pertahankan cache busting
    if (!config.params) config.params = {};
    config.params._t = Date.now();

    return config;
  },
  (error) => Promise.reject(error)
);

// Tambahkan fungsi untuk mendapatkan identitas user dari token
const getUserIdentityFromToken = (token) => {
  try {
    if (!token) return 'Unknown User';

    // Gunakan decodeJwtToken dari tokenManager
    const decoded = decodeJwtToken(token);

    // Ambil informasi yang tersedia dari token
    const userId = decoded.id || decoded.sub || 'Unknown ID';
    const email = decoded.email || 'Unknown Email';
    const name = decoded.name || 'Unknown Name';
    const role = decoded.role || 'Unknown Role';

    return `${name} (${email}, ${role}, ID: ${userId})`;
  } catch (error) {
    console.error('Error decoding token for user identity:', error);
    return 'Invalid Token';
  }
};

// Response interceptor
const createResponseInterceptor = (instance, name) => {
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  // Gunakan fungsi refreshToken dari tokenManager
  const refreshTokenFn = async () => {
    try {
      // Dapatkan token saat ini untuk logging
      const currentToken = getAccessToken();

      // Jika tidak ada token, jangan coba refresh
      if (!currentToken) {
        console.log(`${name}: Tidak ada token yang tersedia, skip refresh token`);
        throw new Error('No token available');
      }

      const userIdentity = getUserIdentityFromToken(currentToken);

      console.log(`${name}: [${userIdentity}] Memanggil refreshToken dari tokenManager...`);

      // Gunakan fungsi refreshToken yang sudah diimpor
      const result = await refreshToken();

      if (!result.success) {
        throw new Error(`[${userIdentity}] Gagal refresh token: ${result.message}`);
      }

      // Dapatkan identitas user dari token baru
      const newUserIdentity = getUserIdentityFromToken(result.accessToken);
      console.log(`${name}: [${newUserIdentity}] Token berhasil direfresh`);

      return result.accessToken;
    } catch (refreshError) {
      console.error(`${name}: Gagal refresh token`, refreshError);
      throw refreshError;
    }
  };

  instance.interceptors.response.use(
    (response) => {
      // Log response untuk debugging
      console.debug(`${name} Response:`, response);

      // Handle success response untuk featured posts
      if (response.config.url?.includes('/posts/') && response.config.method === 'put') {
        console.debug('Featured post update success:', {
          postId: extractPostIdFromUrl(response.config.url),
          newStatus: response.data.is_featured
        });
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Dapatkan token dari request original untuk logging
      const token = originalRequest?.headers?.Authorization?.split(' ')[1];
      const userIdentity = getUserIdentityFromToken(token);

      // Log error untuk debugging
      console.log(`${name} Error [${userIdentity}]:`, {
        status: error.response?.status,
        url: originalRequest?.url,
        isRetry: originalRequest?._retry
      });

      // Jika bukan error 401 atau request sudah di-retry, langsung reject
      if (error.response?.status !== 401 ||
          originalRequest?._retry ||
          originalRequest?.url?.includes('/api/auth/refresh-token') ||
          originalRequest?.url?.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }

      // Jika ini adalah publicApi, jangan coba refresh token untuk endpoint publik
      if (name === 'Public API' && (
          originalRequest?.url?.includes('/api/posts/public') ||
          originalRequest?.url?.includes('/api/posts/label') ||
          originalRequest?.url?.includes('/api/search/labels') ||
          originalRequest?.headers?.['X-Public-Request'] === 'true'
      )) {
        console.log(`${name}: [${userIdentity}] Tidak mencoba refresh token untuk endpoint publik: ${originalRequest?.url}`);
        return Promise.reject(error);
      }

      // Jika ini adalah endpoint label yang memerlukan autentikasi admin, pastikan refresh token berjalan
      if (originalRequest?.url?.includes('/api/labels') && !originalRequest?.url?.includes('/api/labels/with-sublabels')) {
        console.log(`${name}: [${userIdentity}] Mencoba refresh token untuk endpoint label admin: ${originalRequest?.url}`);
      }

      // Tandai request sebagai sudah di-retry
      originalRequest._retry = true;

      // Jika sedang refresh, tambahkan ke queue
      if (isRefreshing) {
        console.log(`${name}: [${userIdentity}] Menambahkan request ke queue karena refresh sedang berjalan`);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            console.log(`${name}: [${userIdentity}] Menggunakan token baru dari queue`);
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return instance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      // Mulai proses refresh
      isRefreshing = true;
      console.log(`${name}: [${userIdentity}] Memulai proses refresh token`);

      try {
        // Refresh token
        const newToken = await refreshTokenFn();

        // Update header untuk request yang gagal
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        // Proses queue request yang tertunda
        processQueue(null, newToken);

        // Retry request yang gagal
        console.log(`${name}: [${userIdentity}] Mencoba kembali request original dengan token baru`);
        return instance(originalRequest);
      } catch (refreshError) {
        // Proses queue dengan error
        processQueue(refreshError, null);

        // Clear token state menggunakan fungsi yang sudah diimpor
        clearTokenState();

        // Trigger event untuk notifikasi ke komponen lain
        window.dispatchEvent(new Event('auth:sessionExpired'));

        console.error(`${name}: [${userIdentity}] Gagal refresh token, session expired`);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};

createResponseInterceptor(api, 'Private API');
createResponseInterceptor(publicApi, 'Public API');

// Helper functions
export const postFormData = async (url, formData) => {
  try {
    const response = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipCache: true
    });
    return response.data;
  } catch (error) {
    console.error('Error posting form data:', error);
    throw error;
  }
};

export const putFormData = async (url, formData) => {
  try {
    const response = await api.put(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipCache: true
    });
    return response.data;
  } catch (error) {
    console.error('Error putting form data:', error);
    throw error;
  }
};

// Helper untuk extract post ID
const extractPostIdFromUrl = (url) => {
  const matches = url.match(/\/posts\/([a-f0-9-]+)\/featured/);
  return matches ? matches[1] : null;
};

// Tambahkan method khusus untuk featured posts
export const featuredPostAPI = {
  toggle: async (postId, isFeatured) => {
    return api.put(`/posts/${postId}/featured`, {
      is_featured: isFeatured
    });
  },

  reset: async () => {
    return api.put('/posts/reset-featured');
  }
};

// Export default
export default {
  api,
  publicApi,
  postFormData,
  putFormData,
  featuredPostAPI
};

