/*  */import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
// Tambahkan logger untuk mencatat error
const logger = console;

// Constants
const TOKEN_CONFIG = {
  REFRESH: {
    THRESHOLD: 5 * 60 * 1000,     // Refresh 5 menit sebelum expired
    BUFFER: 30 * 1000,            // Buffer 30 detik untuk network delay
    MAX_RETRIES: 3,               // Maksimal percobaan refresh
    RETRY_DELAY: 5000,            // Delay 5 detik antar percobaan
    MIN_VALIDITY: 60 * 1000       // Minimal sisa waktu valid (1 menit)
  }
};

// Tambahkan konstanta untuk storage type
const STORAGE_TYPES = {
  SESSION: 'session',
  LOCAL: 'local'
};

// State management
const tokenChannel = new BroadcastChannel('token-sync');
let lastBroadcastTime = 0;
const BROADCAST_THROTTLE = 1000;
let accessToken = null;
let isRefreshing = false;
let refreshRetryCount = 0;
const failedQueue = [];
let refreshTimeout = null;
let refreshPromise = null;

// Tambahkan variabel untuk melacak storage type yang aktif
let activeStorageType = STORAGE_TYPES.SESSION;

// PERBAIKAN: Inisialisasi api terlebih dahulu
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app',
  withCredentials: true
});

// Queue processor
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue.length = 0;
};

// Fungsi untuk mendapatkan storage type yang aktif
export const getActiveStorageType = () => {
  return activeStorageType;
};

// Fungsi untuk mengatur storage type
export const setStorageType = (type) => {
  if (type === STORAGE_TYPES.LOCAL || type === STORAGE_TYPES.SESSION) {
    activeStorageType = type;
    // Simpan preferensi di localStorage agar bertahan antar sesi
    localStorage.setItem('tokenStorageType', type);
    return true;
  }
  return false;
};

// Inisialisasi storage type dari localStorage jika ada
const initStorageType = () => {
  const savedType = localStorage.getItem('tokenStorageType');
  if (savedType === STORAGE_TYPES.LOCAL || savedType === STORAGE_TYPES.SESSION) {
    activeStorageType = savedType;
  }
};

// Panggil inisialisasi
initStorageType();

// Token management
export const setAccessToken = (token) => {
  if (!token) {
    clearTokenState();
    broadcastTokenUpdate(null);
    return;
  }

  try {
    const decoded = jwtDecode(token);
    const expiryTime = decoded.exp * 1000;

    accessToken = token;
    if (api && api.defaults) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Simpan token di storage yang aktif
    const storage = activeStorageType === STORAGE_TYPES.LOCAL ? localStorage : sessionStorage;
    storage.setItem('accessToken', JSON.stringify({
      token,
      expires_at: new Date(expiryTime).toISOString()
    }));

    // Hapus dari storage lainnya untuk menghindari duplikasi
    const alternativeStorage = activeStorageType === STORAGE_TYPES.LOCAL ? sessionStorage : localStorage;
    alternativeStorage.removeItem('accessToken');

    // Broadcast ke tab lain
    broadcastTokenUpdate(token);

    // Schedule refresh
    scheduleSilentRefresh(expiryTime);

    // Log untuk debugging
    console.log(`Token disimpan di ${activeStorageType === STORAGE_TYPES.LOCAL ? 'localStorage' : 'sessionStorage'}`);

    return true;
  } catch (error) {
    console.error('Error setting token:', error);
    clearTokenState();
    return false;
  }
};

// Perbaikan fungsi getAccessToken untuk mendukung dual storage
export const getAccessToken = () => {
  if (!accessToken) {
    // Coba ambil dari storage yang aktif
    const storage = activeStorageType === STORAGE_TYPES.LOCAL ? localStorage : sessionStorage;
    const storedToken = storage.getItem('accessToken');

    if (storedToken) {
      try {
        const { token, expires_at } = JSON.parse(storedToken);
        if (new Date(expires_at) > new Date()) {
          accessToken = token;
          if (api && api.defaults) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          return accessToken;
        } else {
          // Token sudah expired, hapus
          storage.removeItem('accessToken');
        }
      } catch (error) {
        console.error('Error parsing stored token:', error);
        storage.removeItem('accessToken');
      }
    }

    // Jika tidak ditemukan di storage aktif, coba storage lainnya
    // Ini membantu jika user mengubah preferensi "Ingat Saya"
    const alternativeStorage = activeStorageType === STORAGE_TYPES.LOCAL ? sessionStorage : localStorage;
    const alternativeToken = alternativeStorage.getItem('accessToken');

    if (alternativeToken) {
      try {
        const { token, expires_at } = JSON.parse(alternativeToken);
        if (new Date(expires_at) > new Date()) {
          accessToken = token;
          if (api && api.defaults) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          // Pindahkan ke storage aktif
          storage.setItem('accessToken', JSON.stringify({ token, expires_at }));
          alternativeStorage.removeItem('accessToken');
          return accessToken;
        } else {
          // Token sudah expired, hapus
          alternativeStorage.removeItem('accessToken');
        }
      } catch (error) {
        console.error('Error parsing alternative token:', error);
        alternativeStorage.removeItem('accessToken');
      }
    }
  }

  return accessToken;
};

// Token refresh logic
const scheduleSilentRefresh = (expiryTime) => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;

  // Calculate refresh time with buffer
  const refreshTime = timeUntilExpiry - TOKEN_CONFIG.REFRESH.THRESHOLD;

  if (refreshTime <= TOKEN_CONFIG.REFRESH.BUFFER) {
    // Token too close to expiry, refresh immediately
    console.debug('Token near expiry, refreshing now');
    refreshToken(true).catch(console.error);
    return;
  }

  console.debug(`Scheduling refresh in ${Math.floor(refreshTime/1000)}s`);

  refreshTimeout = setTimeout(() => {
    refreshToken()
      .catch(error => {
        console.error('Scheduled refresh failed:', error);
        // Don't clear state here, let retry mechanism handle it
      });
  }, refreshTime);
};

// Tambahkan fungsi untuk mendapatkan identitas user dari token
const getUserIdentityFromToken = (token) => {
  try {
    if (!token) return 'Unknown User';

    const decoded = jwtDecode(token);
    // Ambil informasi yang tersedia dari token
    const userId = decoded.id || decoded.sub || 'Unknown ID';
    const email = decoded.email || 'Unknown Email';
    const name = decoded.name || 'Unknown Name';
    const role = decoded.role || 'Unknown Role';

    return {
      userId,
      email,
      name,
      role,
      // Format untuk logging
      displayString: `${name} (${email}, ${role}, ID: ${userId})`
    };
  } catch (error) {
    console.error('Error decoding token for user identity:', error);
    return {
      displayString: 'Invalid Token',
      userId: 'Unknown',
      email: 'Unknown',
      name: 'Unknown',
      role: 'Unknown'
    };
  }
};

// Fungsi refresh token yang disederhanakan dan diperbaiki
export const refreshToken = async (silent = false) => {
  try {
    // Dapatkan token saat ini untuk logging
    const currentToken = getAccessToken();
    const userIdentity = getUserIdentityFromToken(currentToken);

    // Gunakan flag untuk mencegah multiple refresh bersamaan
    if (isRefreshing) {
      console.log(`[${userIdentity.displayString}] Refresh token sedang berjalan, menunggu hasil...`);
      return await refreshPromise;
    }

    isRefreshing = true;
    console.log(`[${userIdentity.displayString}] Memulai proses refresh token...`);

    refreshPromise = (async () => {
      try {
        // Panggil endpoint refresh token
        // Gunakan GET request karena backend mengharapkan refresh token dari cookie
        const response = await axios.get('/api/auth/refresh-token', {
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Client-ID': generateClientId(), // Tambahkan ID unik untuk setiap client
            'X-User-Identity': userIdentity.displayString // Tambahkan identitas user untuk logging di server
          }
        });

        if (!response.data || !response.data.success) {
          throw new Error(`[${userIdentity.displayString}] Refresh token gagal: Respons tidak valid`);
        }

        const { accessToken, user } = response.data;

        if (!accessToken) {
          throw new Error(`[${userIdentity.displayString}] Refresh token gagal: Token tidak ditemukan dalam respons`);
        }

        // Dapatkan identitas user dari token baru
        const newUserIdentity = getUserIdentityFromToken(accessToken);

        // Simpan access token baru
        setAccessToken(accessToken);

        // Simpan data user
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        console.log(`[${newUserIdentity.displayString}] Refresh token berhasil, token baru diterima`);

        return {
          success: true,
          accessToken,
          user
        };
      } catch (error) {
        console.error(`[${userIdentity.displayString}] Error dalam refresh token:`, error);
        console.error(`[${userIdentity.displayString}] Detail error:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });

        // Hapus token dan user data jika refresh gagal
        clearTokenState();

        // Trigger event untuk notifikasi ke komponen lain
        window.dispatchEvent(new Event('auth:sessionExpired'));

        return {
          success: false,
          error,
          message: error.response?.data?.message || error.message
        };
      }
    })();

    return await refreshPromise;
  } catch (error) {
    isRefreshing = false;
    if (!silent) {
      console.error('Error dalam fungsi refreshToken:', error);
    }
    return {
      success: false,
      error,
      message: error.message
    };
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
};

// Helper untuk generate client ID unik
const generateClientId = () => {
  // Gunakan ID yang disimpan atau buat baru
  let clientId = localStorage.getItem('clientId');
  if (!clientId) {
    clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('clientId', clientId);
  }
  return clientId;
};

// Token validation
export const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const decodeToken = (token) => {
  try {
    return token ? jwtDecode(token) : null;
  } catch (error) {
    console.error('Decode failed:', error);
    return null;
  }
};

// Perbaikan fungsi clearTokenState untuk membersihkan semua storage
export const clearTokenState = () => {
  accessToken = null;

  // Hapus dari kedua storage
  localStorage.removeItem('accessToken');
  sessionStorage.removeItem('accessToken');

  // Hapus header Authorization
  if (api && api.defaults && api.defaults.headers) {
    delete api.defaults.headers.common['Authorization'];
  }

  // Clear refresh timeout
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  // Reset refresh state
  isRefreshing = false;
  refreshRetryCount = 0;

  // Kembalikan ke default (session)
  activeStorageType = STORAGE_TYPES.SESSION;

  return true;
};

// Helper untuk cek validitas token
export const checkTokenValidity = (token) => {
  try {
    const decoded = jwtDecode(token);
    const now = Date.now();
    const expiryTime = decoded.exp * 1000;

    if (expiryTime < now) {
      return 'EXPIRED';
    }

    const timeLeft = expiryTime - now;
    if (timeLeft < TOKEN_CONFIG.REFRESH.MIN_VALIDITY) {
      return 'CRITICAL';
    }
    if (timeLeft < TOKEN_CONFIG.REFRESH.THRESHOLD) {
      return 'NEEDS_REFRESH';
    }
    return 'VALID';
  } catch {
    return 'INVALID';
  }
};

// PERBAIKAN 5: Perbaiki fungsi handleTokenRefresh
const handleTokenRefresh = async () => {
  try {
    const token = await refreshToken();
    if (!token) {
      throw new Error('Failed to refresh token');
    }
    return token;
  } catch (error) {
    logger.error('Error in handleTokenRefresh:', error);
    clearTokenState();
    window.location.href = '/login';
    throw error;
  }
};

// PERBAIKAN 6: Perbaiki konfigurasi axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika error bukan 401 atau request sudah retry
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await handleTokenRefresh();
      originalRequest.headers['Authorization'] = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Jika refresh gagal, redirect ke login
      clearTokenState();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

// Export api instance
export { api };

// Di bagian bawah file, sebelum initialize
tokenChannel.onmessage = (event) => {
  if (event.data.type === 'TOKEN_UPDATED') {
    const { token, timestamp } = event.data;

    // Cek apakah update ini lebih baru
    if (timestamp > lastBroadcastTime) {
      if (token) {
        // Update token tanpa broadcast untuk mencegah loop
        const decoded = jwtDecode(token);
        const expiryTime = decoded.exp * 1000;

        accessToken = token;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        sessionStorage.setItem('accessToken', JSON.stringify({
          token,
          expires_at: new Date(expiryTime).toISOString()
        }));

        scheduleSilentRefresh(expiryTime);
      } else {
        clearTokenState();
      }
      lastBroadcastTime = timestamp;
    }
  }
};

// Initialize
api.defaults.withCredentials = true;

// Tambahkan fungsi broadcast
const broadcastTokenUpdate = (token) => {
  const now = Date.now();
  if (now - lastBroadcastTime > BROADCAST_THROTTLE) {
    tokenChannel.postMessage({
      type: 'TOKEN_UPDATED',
      token,
      timestamp: now
    });
    lastBroadcastTime = now;
  }
};

// Export konstanta untuk digunakan di komponen lain
export { STORAGE_TYPES };