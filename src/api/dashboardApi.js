import { api } from './axios';

/**
 * Mendapatkan data statistik untuk dashboard
 * @returns {Promise<Object>} - Data statistik dashboard
 */
export const getDashboardStats = async () => {
  try {
    // api dari axios.js sudah menangani token otomatis
    const response = await api.get('/api/dashboard/stats');

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Mendapatkan post terbaru untuk dashboard
 * @param {number} limit - Jumlah post yang ingin diambil
 * @returns {Promise<Object>} - Data post terbaru
 */
export const getRecentPosts = async (limit = 5) => {
  try {
    // api dari axios.js sudah menangani token otomatis
    const response = await api.get('/api/dashboard/recent-posts', {
      params: { limit }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Mendapatkan aktivitas terbaru untuk dashboard
 * @param {number} limit - Jumlah aktivitas yang ingin diambil
 * @returns {Promise<Object>} - Data aktivitas terbaru
 */
export const getRecentActivities = async (limit = 5) => {
  try {
    // api dari axios.js sudah menangani token otomatis
    const response = await api.get('/api/dashboard/recent-activities', {
      params: { limit }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
