import { api } from '../api/axios';

const userService = {
  // Fungsi untuk mendapatkan token CSRF
  getCsrfToken: async () => {
    try {
      const response = await api.get('/api/auth/csrf-token');
      return response.data.csrfToken;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.post('/api/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Error message:', error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.post('/api/auth/register', userData);
      return {
        success: true,
        message: response.data.message,
        needsVerification: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Error registering:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Terjadi kesalahan saat registrasi',
        needsVerification: false
      };
    }
  },

  verifyEmail: async (token) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      console.log('Attempting to verify email with token:', token);
      const response = await api.get(`/api/auth/verify/${token}`);
      console.log('Verification response:', response.data);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error verifying email:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Terjadi kesalahan saat verifikasi email'
      };
    }
  },

  forgotPassword: async (email) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.post('/api/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  updateProfile: async (userData) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.put('/api/auth/profile', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  googleLogin: async (tokenId) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.post('/api/auth/google-login', { token: tokenId });
      return response.data;
    } catch (error) {
      console.error('Error with Google login:', error);
      throw error;
    }
  },

  getPendingWriters: async () => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.get('/api/auth/pending-writers');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending writers:', error);
      throw error;
    }
  },

  approveWriter: async (userId) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.put(`/api/auth/approve-user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error approving writer:', error);
      throw error;
    }
  },

  getAllUsers: async () => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.get('/api/auth/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  },

  updateUserRole: async (userId, newRole) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.put(`/api/auth/update-user-role/${userId}`, { role: newRole });
      return response.data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.delete(`/api/auth/delete-user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  getUserStats: async () => {
    try {
      const csrfToken = await userService.getCsrfToken();
      userService.setCSRFToken(csrfToken);
      const response = await api.get('/api/auth/user-stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
};

export default userService;