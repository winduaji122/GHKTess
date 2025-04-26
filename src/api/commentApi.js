import { api } from './axios';

/**
 * Mendapatkan semua komentar untuk post tertentu
 * @param {string} postId - ID post
 * @param {number} page - Nomor halaman
 * @param {number} limit - Jumlah komentar per halaman
 * @returns {Promise} - Promise yang mengembalikan data komentar
 */
export const getCommentsByPostId = async (postId, page = 1, limit = 50) => {
  try {
    const response = await api.get(`/api/comments/post/${postId}`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

/**
 * Menambahkan komentar baru
 * @param {string} postId - ID post
 * @param {string} content - Isi komentar
 * @returns {Promise} - Promise yang mengembalikan data komentar baru
 */
export const addComment = async (postId, content) => {
  try {
    const response = await api.post('/api/comments', {
      post_id: postId,
      content
    });
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Mengedit komentar
 * @param {string} commentId - ID komentar
 * @param {string} content - Isi komentar baru
 * @returns {Promise} - Promise yang mengembalikan data komentar yang diperbarui
 */
export const updateComment = async (commentId, content) => {
  try {
    const response = await api.put(`/api/comments/${commentId}`, {
      content
    });
    return response.data;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

/**
 * Menghapus komentar
 * @param {string} commentId - ID komentar
 * @returns {Promise} - Promise yang mengembalikan status penghapusan
 */
export const deleteComment = async (commentId) => {
  try {
    const response = await api.delete(`/api/comments/${commentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};
