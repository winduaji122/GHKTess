import { api } from './axios';

/**
 * Mendapatkan status like untuk post tertentu
 * @param {string} postId - ID post
 * @returns {Promise} - Promise yang mengembalikan data status like
 */
export const getLikeStatus = async (postId) => {
  try {
    // Ambil token dari localStorage
    const token = localStorage.getItem('accessToken');
    const userData = JSON.parse(localStorage.getItem('auth_user'));

    console.log('User data from localStorage:', userData);
    console.log('User ID:', userData?.id);

    // Kirim token dalam header Authorization
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        headers['Authorization'] = `Bearer ${parsedToken.token}`;
        console.log('Authorization header set:', `Bearer ${parsedToken.token.substring(0, 20)}...`);
      } catch (e) {
        console.error('Error parsing token:', e);
        // Coba gunakan token langsung jika parsing gagal
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      console.warn('No token found in localStorage');
    }

    // Gunakan URL yang benar sesuai dengan backend
    const url = `/api/likes/post/${postId}`;

    console.log('Fetching like status with URL:', url);
    console.log('Headers:', headers);

    const response = await api.get(url, {
      headers
    });

    console.log('Like status response:', response.data);

    // Pastikan data yang dikembalikan sesuai dengan yang diharapkan
    if (response.data) {
      console.log('Raw response data:', JSON.stringify(response.data));

      // Cek apakah data ada di root atau di dalam property data
      const likeData = response.data.data || response.data;
      console.log('Like data structure:', likeData);

      // Log data recentLikes untuk debugging
      if (likeData.recentLikes && Array.isArray(likeData.recentLikes)) {
        console.log('Recent likes count:', likeData.recentLikes.length);
        likeData.recentLikes.forEach((like, index) => {
          console.log(`Recent like ${index + 1}:`, {
            id: like.id,
            user_id: like.user_id,
            user_name: like.user_name,
            profile_picture: like.profile_picture
          });
        });
      }

      // Cek apakah user saat ini ada di daftar recentLikes
      let userLikedFromList = false;
      if (userData && userData.id && likeData.recentLikes && Array.isArray(likeData.recentLikes)) {
        userLikedFromList = likeData.recentLikes.some(like => like.user_id === userData.id);
        console.log('User liked from recentLikes check:', userLikedFromList);
      }

      // Pastikan userLiked ada dan merupakan boolean
      if (typeof likeData.userLiked !== 'boolean') {
        console.warn('userLiked is not a boolean, using value from recentLikes check');
        likeData.userLiked = userLikedFromList;
      } else {
        console.log('userLiked from server:', likeData.userLiked);

        // Jika ada perbedaan antara userLiked dari server dan pengecekan recentLikes
        if (userLikedFromList !== likeData.userLiked) {
          console.warn('Inconsistency detected: userLiked from server is', likeData.userLiked,
                       'but recentLikes check shows', userLikedFromList);
          // Prioritaskan hasil pengecekan recentLikes jika userLikedFromList adalah true
          if (userLikedFromList) {
            console.log('Using userLiked from recentLikes check instead of server value');
            likeData.userLiked = true;
          }
        }
      }

      // Pastikan totalLikes ada dan merupakan number
      if (typeof likeData.totalLikes !== 'number') {
        console.warn('totalLikes is not a number, setting default value');
        likeData.totalLikes = likeData.recentLikes ? likeData.recentLikes.length : 0;
      }

      // Pastikan response.data.data memiliki nilai yang benar
      if (response.data.data) {
        response.data.data = likeData;
      } else {
        response.data = { success: true, data: likeData };
      }
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching like status:', error);
    throw error;
  }
};

/**
 * Menambahkan like ke post
 * @param {string} postId - ID post
 * @returns {Promise} - Promise yang mengembalikan data like baru
 */
export const addLike = async (postId) => {
  try {
    // Ambil token dari localStorage
    const token = localStorage.getItem('accessToken');
    const userData = JSON.parse(localStorage.getItem('auth_user'));

    console.log('Adding like for post:', postId);
    console.log('User data for like:', userData);

    // Kirim token dalam header Authorization
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        headers['Authorization'] = `Bearer ${parsedToken.token}`;
        console.log('Authorization header set for add like:', `Bearer ${parsedToken.token.substring(0, 20)}...`);
      } catch (e) {
        console.error('Error parsing token for add like:', e);
        // Coba gunakan token langsung jika parsing gagal
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      console.warn('No token found in localStorage for add like');
    }

    // Kirim data dengan format yang benar sesuai dengan backend
    // Backend mengharapkan post_id dalam body request
    console.log('Sending like request with post_id:', postId);

    const response = await api.post('/api/likes', {
      post_id: postId
    }, {
      headers
    });

    console.log('Add like response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding like:', error);
    throw error;
  }
};

/**
 * Menghapus like dari post
 * @param {string} postId - ID post
 * @returns {Promise} - Promise yang mengembalikan status penghapusan
 */
export const removeLike = async (postId) => {
  try {
    // Ambil token dari localStorage
    const token = localStorage.getItem('accessToken');
    const userData = JSON.parse(localStorage.getItem('auth_user'));

    console.log('Removing like for post:', postId);
    console.log('User data for unlike:', userData);

    // Kirim token dalam header Authorization
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        headers['Authorization'] = `Bearer ${parsedToken.token}`;
        console.log('Authorization header set for remove like:', `Bearer ${parsedToken.token.substring(0, 20)}...`);
      } catch (e) {
        console.error('Error parsing token for remove like:', e);
        // Coba gunakan token langsung jika parsing gagal
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      console.warn('No token found in localStorage for remove like');
    }

    // Kirim request dengan format yang benar sesuai dengan backend
    // Backend mengharapkan postId dalam parameter URL
    const url = `/api/likes/${postId}`;
    console.log('Removing like with URL:', url);

    const response = await api.delete(url, {
      headers
    });

    console.log('Remove like response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error removing like:', error);
    throw error;
  }
};
