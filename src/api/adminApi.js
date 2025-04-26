import { api } from './axios';

/**
 * Mendapatkan daftar post untuk admin dengan statistik
 * @param {Object} params - Parameter untuk filter dan pagination
 * @returns {Promise<Object>} - Data post dengan statistik
 */
export const getAdminPosts = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        message: 'Anda harus login untuk melihat daftar post'
      };
    }

    const response = await api.get('/api/posts/admin', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
