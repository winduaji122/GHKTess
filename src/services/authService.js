import { api } from '../api/axios';
import { 
  setAccessToken, 
  clearTokenState, 
  getAccessToken,
  isTokenValid,
  decodeToken 
} from '../utils/tokenManager';

class AuthService {
  constructor() {
    this.user = null;
    this.initializeAuth();
    // Listen untuk session expired
    window.addEventListener('auth:sessionExpired', () => {
      // Tampilkan dialog re-login atau redirect ke login
      // tapi jangan langsung logout
      this.handleSessionExpired();
    });
  }

  async initializeAuth() {
    const token = getAccessToken();
    if (token && isTokenValid(token)) {
      this.user = decodeToken(token);
    }
  }

  // Basic Auth
  async login(credentials) {
    try {
      const response = await api.post('/api/auth/login', credentials);
      if (response.data.accessToken) {
        setAccessToken(response.data.accessToken);
        this.user = decodeToken(response.data.accessToken);
      }
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login gagal' 
      };
    }
  }

  async logout() {
    try {
      await api.post('/api/auth/logout', {}, { withCredentials: true });
      this.user = null;
      clearTokenState();
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Logout gagal' 
      };
    }
  }

  // Google Auth
  async handleGoogleCallback(code) {
    try {
      const response = await api.post('/api/auth/google-callback', { code });
      if (response.data.accessToken) {
        setAccessToken(response.data.accessToken);
        this.user = decodeToken(response.data.accessToken);
      }
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Google auth failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Google auth gagal' 
      };
    }
  }

  // Session Management
  async checkSession() {
    try {
      const response = await api.get('/api/auth/check-session');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: 'Sesi tidak valid' };
    }
  }

  async validateSession() {
    try {
      const response = await api.get('/api/auth/validate-session');
      return { 
        valid: response.data.valid,
        user: response.data.user 
      };
    } catch (error) {
      return { valid: false };
    }
  }

  // User Management
  async updateProfile(data) {
    try {
      const response = await api.put('/api/auth/profile', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Update profil gagal' 
      };
    }
  }

  async changePassword(data) {
    try {
      const response = await api.put('/api/auth/change-password', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Ganti password gagal' 
      };
    }
  }

  // Password Reset
  async requestPasswordReset(email) {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Request reset password gagal' 
      };
    }
  }

  async resetPassword(token, password) {
    try {
      const response = await api.post('/api/auth/reset-password', { 
        token, 
        password 
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Reset password gagal' 
      };
    }
  }

  // Utility Methods
  isAuthenticated() {
    const token = getAccessToken();
    return token && isTokenValid(token);
  }

  getCurrentUser() {
    return this.user;
  }

  hasRole(role) {
    return this.user?.role === role;
  }

  isAdmin() {
    return this.hasRole('admin');
  }

  isWriter() {
    return this.hasRole('writer');
  }

  // Event Handlers
  onAuthStateChange(callback) {
    window.addEventListener('auth:stateChange', callback);
    return () => window.removeEventListener('auth:stateChange', callback);
  }

  onAuthError(callback) {
    window.addEventListener('auth:error', callback);
    return () => window.removeEventListener('auth:error', callback);
  }

  async handleSessionExpired() {
    // Tampilkan modal login
    const shouldReauth = await this.showReauthModal();
    if (shouldReauth) {
      // Redirect ke login dengan return URL
      const currentPath = window.location.pathname;
      window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
    }
  }
}

export const authService = new AuthService();

// Tambahkan named exports
export const isAuthenticated = () => authService.isAuthenticated();
export const getCurrentUser = () => authService.getCurrentUser();
export const hasRole = (role) => authService.hasRole(role);
export const isAdmin = () => authService.isAdmin();
export const isWriter = () => authService.isWriter();