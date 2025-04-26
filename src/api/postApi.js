import axios from 'axios';
import { api, publicApi } from './axios';
import { endpoints } from './Config';
import { getLabelsForPost as getLabelsForPostFromLabelApi } from './labelApi';
import { refreshCsrfToken, getCurrentUser } from './auth';
import { getAccessToken } from '../utils/tokenManager';
import { getImageUrl, validateImage } from '../utils/imageHelper';

// Tambahkan konstanta untuk status yang valid
const VALID_POST_STATUSES = ['draft', 'published', 'archived'];

export const getAllPosts = async (page = 1, limit = 20) => {
  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const response = await publicApi.get('/api/posts', {
      baseURL: import.meta.env.VITE_API_BASE_URL,
      params: {
        page: pageNum,
        limit: limitNum,
        include_labels: true,
        sort: 'created_at:desc',
        status: 'published',
        deleted: false
      },
      skipCache: true
    });

    if (!response.data?.success) {
      throw new Error('Gagal mengambil data posts');
    }

    const formattedPosts = response.data.data
      .filter(post => !post.deleted_at)
      .map(post => ({
        ...post,
        labels: formatLabels(post.labels)
      }));

    return {
      posts: formattedPosts,
      pagination: {
        totalItems: parseInt(response.data.pagination?.totalItems) || 0,
        currentPage: pageNum,
        totalPages: parseInt(response.data.pagination?.totalPages) || 1,
        limit: limitNum
      }
    };

  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

export const getPostById = async (id) => {
  try {
    // Validasi ID
    if (!id) {
      throw new Error('ID post diperlukan');
    }

    // Validasi token
    const token = getAccessToken();
    if (!token) {
      throw new Error('Token autentikasi tidak tersedia');
    }

    console.log('Mencoba mengambil post dengan ID:', id);

    // Gunakan interceptor yang sudah dikonfigurasi di api instance
    const response = await api.get(`/api/posts/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Validasi response
    if (!response.data) {
      throw new Error('Response kosong dari server');
    }

    if (!response.data.success) {
      throw new Error(response.data.message || 'Format response tidak valid');
    }

    if (!response.data.data) {
      throw new Error('Post tidak ditemukan');
    }

    console.log('Post berhasil diambil:', response.data.data);

    if (response.data?.data) {
      // Format labels jika ada
      const formattedPost = {
        ...response.data.data,
        labels: response.data.data.labels?.map(label => ({
          id: parseInt(label.id), // Pastikan id adalah number
          name: label.name || label.label || ''
        })) || []
      };

      console.log('Formatted post data:', formattedPost);
      return formattedPost;
    }

    return response.data.data;

  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      // Server merespons dengan status error
      if (error.response.status === 404) {
        throw new Error('Post tidak ditemukan');
      } else if (error.response.status === 401) {
        throw new Error('Sesi telah berakhir, silakan login kembali');
      } else if (error.response.status === 403) {
        throw new Error('Anda tidak memiliki akses ke post ini');
      }
      throw new Error(error.response.data?.message || 'Gagal mengambil data post');
    } else if (error.request) {
      // Request dibuat tapi tidak ada respons
      throw new Error('Tidak dapat terhubung ke server');
    }

    // Log error untuk debugging
    console.error('Error dalam getPostById:', error);
    throw error;
  }
};

export const getFeaturedPosts = async () => {
  try {
    const response = await publicApi.get(endpoints.featuredPosts, {
      params: {
        _t: Date.now() // Cache busting
      },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // Langsung return response data
    return response.data;

  } catch (error) {
    console.error('Error fetching featured posts:', error);
    throw error;
  }
};

export const getSpotlightPosts = async (limit = 6) => {
  try {
    const response = await publicApi.get('/api/posts/spotlight', {
      baseURL: import.meta.env.VITE_API_BASE_URL,
      params: {
        page: 1,
        limit
      },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.data?.success) {
      throw new Error('Gagal mengambil spotlight posts');
    }

    const spotlightPosts = response.data.data.map(post => ({
      ...post,
      is_spotlight: true,
      labels: Array.isArray(post.labels) ? formatLabels(post.labels) : []
    }));

    return {
      success: true,
      data: spotlightPosts,
      pagination: response.data.pagination
    };

  } catch (error) {
    console.error('Error fetching spotlight posts:', error);
    throw error;
  }
};

export const getRelatedPosts = async (postId, limit = 5) => {
  try {
    const response = await publicApi.get(`/api/posts/${postId}/related`, {
      params: {
        limit,
        status: 'published',
        deleted: false
      }
    });

    if (!response.data?.success) {
      throw new Error('Gagal mengambil related posts');
    }

    // Filter posts yang published dan tidak dihapus
    const filteredPosts = response.data.data.filter(post =>
      post.status === 'published' && !post.deleted_at
    );

    // Pastikan tanggal pada related posts diformat dengan benar
    const formattedPosts = filteredPosts.map(post => ({
      ...post,
      // Pastikan tanggal publish_date dan created_at ada dan valid
      publish_date: post.publish_date || null,
      created_at: post.created_at || null
    }));

    // Log untuk debugging
    console.log('Related posts after formatting:', formattedPosts);

    return {
      success: true,
      data: formattedPosts
    };
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return {
      success: false,
      data: []
    };
  }
};

/**
 * Increment views untuk post (untuk semua pengguna, terautentikasi atau tidak)
 * @param {string} id - ID post
 * @returns {Promise<Object>} - Data hasil increment views
 */
export const incrementViews = async (id) => {
  try {
    if (!id) {
      console.error('Invalid post ID provided to incrementViews');
      return { success: false, error: 'Invalid post ID' };
    }

    console.log(`Attempting to increment views for post ${id}`);

    // Coba gunakan endpoint public jika user tidak login
    const token = localStorage.getItem('token');
    let response;

    try {
      if (!token) {
        // Gunakan endpoint public untuk user yang tidak login
        console.log(`Using public endpoint for post ${id}`);
        response = await publicApi.post(`/api/posts/public/increment-views/${id}`);
      } else {
        // Gunakan endpoint dengan autentikasi jika user login
        console.log(`Using authenticated endpoint for post ${id}`);
        response = await api.post(endpoints.incrementViews(id), {});
      }

      // Log response untuk debugging
      console.log(`View increment response for post ${id}:`, response?.data || 'No response data');
    } catch (requestError) {
      console.error(`Error making request to increment views for post ${id}:`, requestError);

      // Coba endpoint alternatif jika yang pertama gagal
      try {
        console.log(`Trying alternative endpoint for post ${id}`);
        response = await publicApi.post(`/api/posts/${id}/increment-views`);
        console.log(`Alternative endpoint response for post ${id}:`, response?.data || 'No response data');
      } catch (alternativeError) {
        console.error(`Error with alternative endpoint for post ${id}:`, alternativeError);
        throw alternativeError;
      }
    }

    // Response sudah di-log di atas, tidak perlu di-log lagi
    return response.data;
  } catch (error) {
    console.error(`Error incrementing view count for post ${id}:`, error);
    // Jangan gagalkan proses jika increment views gagal
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Mendapatkan statistik post (views, comments, likes) - hanya untuk pengguna terautentikasi
 * @param {string} id - ID post
 * @returns {Promise<Object>} - Data statistik post
 */
export const getPostStats = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        message: 'Anda harus login untuk melihat statistik post'
      };
    }

    const response = await api.get(endpoints.postStats(id), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching post stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const validatePostData = (data) => {
  const errors = [];
  let title, content, status, publish_date, labels;

  // Cek tipe data dan ekstrak nilai
  if (data instanceof FormData) {
    console.log('Validating FormData');
    title = data.get('title');
    content = data.get('content');
    status = data.get('status');
    publish_date = data.get('publish_date');
    labels = data.get('labels');

    console.log('FormData values:', {
      title, content, status, publish_date, labels,
      allEntries: Array.from(data.entries())
    });
  } else {
    console.log('Validating object data:', data);
    title = data.title;
    content = data.content;
    status = data.status;
    publish_date = data.publish_date;
    labels = data.labels;
  }

  // Validasi field wajib
  if (!title?.trim()) {
    errors.push('Judul wajib diisi');
  }

  if (!content?.trim()) {
    errors.push('Konten wajib diisi');
  }

  // Validasi status
  if (status && !VALID_POST_STATUSES.includes(status)) {
    errors.push('Status post tidak valid');
  }

  // Validasi tanggal
  if (publish_date) {
    const date = new Date(publish_date);
    if (isNaN(date.getTime())) {
      errors.push('Format tanggal tidak valid');
    }
  }

  // Validasi labels jika ada
  if (labels) {
    try {
      const parsedLabels = typeof labels === 'string' ? JSON.parse(labels) : labels;
      if (!Array.isArray(parsedLabels)) {
        errors.push('Format label tidak valid');
      }
    } catch (e) {
      errors.push('Format label tidak valid');
    }
  }

  console.log('Validation result:', { isValid: errors.length === 0, errors });
  return { isValid: errors.length === 0, errors };
};

export const createPost = async (postData) => {
  try {
    // Validasi data dasar
    if (!postData) {
      throw new Error('Data post tidak boleh kosong');
    }

    // Jika postData adalah FormData
    if (postData instanceof FormData) {
      // Validasi title dan content dari FormData
      const title = postData.get('title');
      const content = postData.get('content');

      if (!title || typeof title !== 'string' || !title.trim()) {
        throw new Error('Judul post tidak boleh kosong');
      }

      if (!content || typeof content !== 'string' || !content.trim()) {
        throw new Error('Konten post tidak boleh kosong');
      }

      // Pastikan format data sesuai dengan yang diharapkan backend
      // Jika belum ada status, tambahkan default 'draft'
      if (!postData.has('status')) {
        postData.append('status', 'draft');
      }

      // Pastikan format tanggal benar
      if (postData.has('publish_date')) {
        const publishDate = postData.get('publish_date');
        // Jika perlu, format ulang tanggal
        // postData.set('publish_date', formattedDate);
      }
    }
    // Jika postData adalah object biasa
    else if (typeof postData === 'object') {
      if (!postData.title || (typeof postData.title === 'string' && !postData.title.trim())) {
        throw new Error('Judul post tidak boleh kosong');
      }

      if (!postData.content || (typeof postData.content === 'string' && !postData.content.trim())) {
        throw new Error('Konten post tidak boleh kosong');
      }

      // Konversi object ke FormData
      const formData = new FormData();
      formData.append('title', postData.title.trim());
      formData.append('content', postData.content.trim());
      formData.append('status', postData.status || 'draft');

      if (postData.publish_date) {
        formData.append('publish_date', postData.publish_date);
      }

      if (postData.excerpt) {
        formData.append('excerpt', postData.excerpt);
      }

      if (postData.image instanceof File) {
        formData.append('image', postData.image);
      }

      if (Array.isArray(postData.labels)) {
        formData.append('labels', JSON.stringify(postData.labels));
      }

      formData.append('is_featured', postData.is_featured ? '1' : '0');
      formData.append('is_spotlight', postData.is_spotlight ? '1' : '0');

      // Gunakan formData sebagai postData
      postData = formData;
    }

    // Dapatkan token autentikasi
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    // Debug log untuk melihat data yang dikirim
    console.log('Creating post with FormData keys:',
      [...postData.keys()].join(', '));

    // Gunakan endpoint yang benar sesuai dengan server.js
    const response = await api.post('/api/posts', postData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error creating post:', error);

    // Tangani error dengan lebih baik
    if (error.response) {
      // Error dari server
      console.error('Server response error:', {
        status: error.response.status,
        data: error.response.data
      });

      return {
        success: false,
        message: error.response.data.message || 'Gagal membuat post',
        error: error.response.data
      };
    } else if (error.request) {
      // Request dibuat tapi tidak ada response
      console.error('No response received:', error.request);
      return {
        success: false,
        message: 'Tidak ada respons dari server'
      };
    } else {
      // Error lainnya
      console.error('Request error:', error.message);
      throw error;
    }
  }
};

// Fungsi untuk generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const updatePost = async (id, postData) => {
  try {
    if (!id) throw new Error('ID post diperlukan');
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    console.log('Raw post data received:', postData);

    let formData;

    if (postData instanceof FormData) {
      formData = postData;
      const title = formData.get('title')?.toString().trim();
      const content = formData.get('content')?.toString().trim();

      // Validasi
      if (!title) throw new Error('Judul wajib diisi');
      if (!content) throw new Error('Konten wajib diisi');

      // Generate dan append slug baru
      const newSlug = generateSlug(title);
      formData.append('slug', newSlug);

    } else {
      formData = new FormData();

      // Validasi data wajib
      if (!postData?.title?.trim() || !postData?.content?.trim()) {
        throw new Error('Judul dan konten wajib diisi');
      }

      const title = postData.title.trim();
      formData.append('title', title);
      formData.append('content', postData.content.trim());
      formData.append('status', postData.status || 'draft');

      // Generate dan append slug baru
      const newSlug = generateSlug(title);
      formData.append('slug', newSlug);

      // Append data lainnya
      if (postData.image instanceof File) {
        formData.append('image', postData.image);
        formData.append('image_updated_at', new Date().toISOString());
      }

      if (Array.isArray(postData.labels)) {
        formData.append('labels', JSON.stringify(postData.labels));
      }

      // Pastikan mengirim nilai is_spotlight yang benar
      formData.append('is_spotlight', postData.is_spotlight ? '1' : '0');
      formData.append('is_featured', postData.is_featured ? '1' : '0');

      if (postData.version) {
        formData.append('version', (parseInt(postData.version) + 1).toString());
      }
    }

    // Debug log final FormData
    console.log('Final FormData entries:', Array.from(formData.entries()));

    const response = await api.put(`/api/posts/${id}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Gagal mengupdate post');
    }

    return response.data;

  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

export const deletePost = async (postId) => {
  try {
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    // Gunakan soft delete sebagai default
    const response = await api.patch(`/api/posts/${postId}/soft-delete`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const resetFeaturedPosts = async () => {
  try {
    const response = await api.put('/api/posts/reset-featured', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error resetting featured posts:', error);
    throw error;
  }
};

export const toggleFeaturedPost = async (postId, isFeatured) => {
  try {
    // Ambil data user dari localStorage
    const userData = JSON.parse(localStorage.getItem('auth_user'));

    // Validasi role user
    if (userData?.role !== 'admin') {
      throw new Error('Hanya admin yang dapat mengubah status featured post');
    }

    // Validasi ID sebelum request
    if (!postId || postId === 'null') {
      throw new Error('ID post tidak valid');
    }

    // PERBAIKAN: Tambahkan prefix /api ke URL
    const response = await api.put(
      `/api/posts/${postId}/featured`,
      { is_featured: isFeatured ? 1 : 0 },
      {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error in toggleFeaturedPost:', error);
    throw error;
  }
};

export const toggleSpotlight = async (id, isSpotlight) => {
  try {
    // Ambil data user dari localStorage
    const userData = JSON.parse(localStorage.getItem('auth_user'));

    // Validasi role user
    if (userData?.role !== 'admin') {
      throw new Error('Hanya admin yang dapat mengubah status spotlight post');
    }

    const token = getAccessToken();
    if (!token) {
      throw new Error('Token tidak ditemukan');
    }

    // Pastikan nilai yang dikirim ke server adalah numerik
    const spotlightValue = isSpotlight === true || isSpotlight === 1 ? 1 : 0;

    const response = await api.patch(
      `/api/posts/${id}/toggle-spotlight`,
      { is_spotlight: spotlightValue },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Pastikan menggunakan data dari response server
    return {
      success: response.data.success,
      message: response.data.message,
      data: response.data.data // Gunakan data langsung dari server
    };

  } catch (error) {
    console.error('Error in toggleSpotlight:', error);
    throw new Error(error.response?.data?.message || 'Gagal mengubah status spotlight');
  }
};

export const getPostsByAuthor = async (authorId, page = 1, limit = 10) => {
  try {
    const response = await api.get(endpoints.postsByAuthor(authorId), { params: { page, limit } });
    return response.data;
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    throw error;
  }
};

export const getPostVersions = async (id) => {
  try {
    const response = await api.get(endpoints.postVersions(id));
    return response.data;
  } catch (error) {
    console.error('Error fetching post versions:', error);
    throw error;
  }
};

export const previewPost = async (postData) => {
  try {
    const response = await api.post(endpoints.previewPost, postData);
    return response.data;
  } catch (error) {
    console.error('Error previewing post:', error);
    throw error;
  }
};

export const getPostAnalytics = async (id) => {
  try {
    const response = await api.get(endpoints.postAnalytics(id));
    return response.data;
  } catch (error) {
    console.error('Error fetching post analytics:', error);
    throw error;
  }
};

export const searchPosts = async ({ q, label_id, page = 1, limit = 10, sort = 'relevance' }) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
      status: 'published',
      deleted: 'false'
    });

    if (q?.trim()) {
      params.append('q', q.trim());
    }

    if (label_id) {
      params.append('label_id', label_id);
    }

    const response = await publicApi.get(`/api/search?${params.toString()}`);

    const filteredData = response.data.data
      ? response.data.data.filter(post =>
          post.status === 'published' &&
          !post.deleted_at
        )
      : [];

    return {
      data: {
        data: filteredData,
        pagination: {
          totalItems: filteredData.length,
          totalPages: response.data.pagination?.totalPages || 1,
          currentPage: response.data.pagination?.currentPage || 1
        }
      }
    };
  } catch (error) {
    console.error('Error searching posts:', error);
    throw error;
  }
};

export const getSearchSuggestions = async (query) => {
  try {
    const response = await publicApi.get('/api/search/suggestions', {
      params: { query }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    throw error;
  }
};

export const advancedSearch = async ({
  q = '',
  filters = {},
  page = 1,
  limit = 10
}) => {
  try {
    const token = getAccessToken();

    const response = await api.get('/api/search/advanced', {
      params: {
        q,
        // Validasi status termasuk archived
        status: filters.status !== 'all' && VALID_POST_STATUSES.includes(filters.status)
          ? filters.status
          : undefined,
        label_id: filters.label || undefined,
        featured: filters.featured !== 'all' ? filters.featured : undefined,
        sort: filters.sort || 'created_at:desc',
        page,
        limit
      },
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error in advanced search:', error);
    throw error;
  }
};

export const getPendingWriters = async () => {
  try {
    const response = await api.get(endpoints.pendingWriters);
    return response.data;
  } catch (error) {
    console.error('Error fetching pending writers:', error);
    throw error;
  }
};

export const verifyWriter = async (writerId) => {
  try {
    const response = await api.post(endpoints.verifyWriter(writerId));
    return response.data;
  } catch (error) {
    console.error('Error verifying writer:', error);
    throw error;
  }
};

export const rejectWriter = async (writerId) => {
  try {
    const response = await api.post(endpoints.rejectWriter(writerId));
    return response.data;
  } catch (error) {
    console.error('Error rejecting writer:', error);
    throw error;
  }
};

export const getAllPostsAdmin = async ({
  page = 1,
  limit = 10,
  status = 'all',
  label = '',
  featured = null,
  user = null,
  role = null,
  sort = 'created_at:desc',
  includeDeleted = false,
  signal
}) => {
  try {
    console.log('getAllPostsAdmin called with params:', { page, limit, status, label, featured, user, role, sort });

    // Tambah validasi untuk label
    const labelId = label ? parseInt(label) : undefined;
    if (label && isNaN(labelId)) {
      throw new Error('Label ID harus berupa number');
    }

    const params = {
      page: page,
      limit: limit,
      status: status !== 'all' ? status : undefined,
      label_id: labelId,
      sort: sort,
      admin: true,
      includeDeleted: includeDeleted,
      _t: Date.now(), // Tambahkan timestamp untuk menghindari cache
      featured: featured, // Gunakan parameter featured
      user_role: role !== 'all' ? role : undefined // Filter berdasarkan role
    };

    // Hapus parameter yang undefined
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

    // Log untuk debugging
    console.log('Fetching posts with params:', params);

    // Dapatkan token autentikasi
    const token = getAccessToken();
    if (!token) {
      console.error('Token autentikasi tidak tersedia');
      return {
        success: false,
        data: [],
        message: 'Token autentikasi tidak tersedia',
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit: limit
        }
      };
    }

    // Gunakan endpoint baru khusus untuk admin
    const response = await api.get('/api/posts/admin', {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal
    });

    // Log response untuk debugging
    console.log('API Response:', response.data);

    // Periksa apakah response.data.data adalah array
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error('Invalid response data format:', response.data);
      return {
        success: false,
        data: [],
        message: 'Format data tidak valid',
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit: limit
        }
      };
    }

    const filteredData = includeDeleted
      ? response.data.data
      : response.data.data.filter(post => !post.deleted_at);

    // Log filtered data
    console.log('Filtered data:', filteredData);

    return {
      success: true,
      data: filteredData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil((response.data?.pagination?.totalItems || 0) / parseInt(limit)),
        totalItems: parseInt(response.data?.pagination?.totalItems || 0),
        limit: parseInt(limit)
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching posts:', error);
    return {
      success: false,
      data: [],
      error: error.message,
      pagination: {
        currentPage: parseInt(page),
        totalPages: 0,
        totalItems: 0,
        limit: parseInt(limit)
      }
    };
  }
};

export const getLabelsForPost = getLabelsForPostFromLabelApi;

export const getPostBySlug = async (slug) => {
  try {
    if (!slug) {
      throw new Error('Slug tidak boleh kosong');
    }
    console.log('Fetching post with slug:', slug);
    const response = await publicApi.get(endpoints.postBySlug(slug));
    console.log('Post data received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    if (error.response && error.response.status === 404) {
      throw new Error('Post tidak ditemukan');
    }
    throw error;
  }
};

export const getPosts = async ({ page, limit, status, label, featured, sort }) => {
  try {
    const response = await api.get('/api/posts', {
      params: {
        page,
        limit,
        // Izinkan status archived dalam filter
        status: VALID_POST_STATUSES.includes(status) ? status : undefined,
        label_id: label,
        featured,
        sort
      }
    });
    return response;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

export const getDeletedPosts = async (page = 1, limit = 10) => {
  try {
    const token = getAccessToken();
    const response = await api.get('/api/posts/deleted', {
      params: {
        page,
        limit,
        include_labels: true
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Pastikan response data terformat dengan benar
    const formattedData = response.data?.data?.map(post => ({
      ...post,
      image: post.image ? formatImageUrl(post.image) : null,
      labels: formatLabels(post.labels)
    })) || [];

    return {
      success: true,
      data: formattedData,
      pagination: response.data?.pagination || {
        currentPage: page,
        totalPages: Math.ceil((response.data?.total || 0) / limit),
        totalItems: response.data?.total || 0,
        limit
      }
    };
  } catch (error) {
    console.error('Error fetching deleted posts:', error);
    throw error;
  }
};

// Tambahkan fungsi untuk mengambil post publik
export const getPublicPostBySlug = async (slugOrId, params = {}) => {
  try {
    if (!slugOrId) {
      throw new Error('Identifier tidak boleh kosong');
    }

    // Gunakan endpoint yang tepat sesuai response Postman
    const endpoint = `/api/posts/public/slug/${slugOrId}`;

    // Tambahkan parameter untuk cache busting jika tidak ada
    if (!params._t) {
      params._t = Date.now();
    }

    // Tambahkan parameter untuk meminta semua label
    params.include_all_labels = true;

    // Tambahkan header untuk menghindari cache
    const headers = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, {
      params,
      headers
    });

    if (!response.data?.success) {
      throw new Error(response.data.message || 'Gagal mengambil data post');
    }

    // Jika backend tidak mengembalikan all_labels, tambahkan dari API labels publik
    if (response.data.success && response.data.data && !response.data.data.all_labels) {
      try {
        // Ambil semua label dari API publik
        const labelsResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/search/labels`, {
          params: { _t: Date.now() },
          headers: {
            ...headers,
            'X-Public-Request': 'true' // Tandai sebagai request publik
          }
        });

        let allLabels = [];
        if (Array.isArray(labelsResponse.data)) {
          allLabels = labelsResponse.data;
        } else if (labelsResponse.data?.data && Array.isArray(labelsResponse.data.data)) {
          allLabels = labelsResponse.data.data;
        } else if (labelsResponse.data?.success && Array.isArray(labelsResponse.data.data)) {
          allLabels = labelsResponse.data.data;
        }

        // Tambahkan all_labels ke response
        response.data.data.all_labels = allLabels;
      } catch (labelError) {
        console.error('Error fetching all labels:', labelError);
        // Jika gagal mengambil semua label, gunakan labels yang ada
        response.data.data.all_labels = response.data.data.labels || [];
      }
    }

    // Pastikan tanggal pada related posts diformat dengan benar
    if (response.data?.data?.related_posts && Array.isArray(response.data.data.related_posts)) {
      console.log('Related posts before formatting:', response.data.data.related_posts);

      // Pastikan setiap related post memiliki tanggal yang valid
      response.data.data.related_posts = response.data.data.related_posts.map(post => ({
        ...post,
        // Pastikan tanggal publish_date dan created_at ada dan valid
        publish_date: post.publish_date || null,
        created_at: post.created_at || null
      }));

      console.log('Related posts after formatting:', response.data.data.related_posts);
    }

    return response.data;

  } catch (error) {
    console.error('Error fetching public post:', error);
    if (error.response?.status === 404) {
      throw new Error('Post tidak ditemukan');
    }
    throw error;
  }
};

export const fetchPostToEdit = async (postId) => {
  try {
    // Gunakan cache untuk menyimpan hasil request
    const cacheKey = `post_${postId}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      // Validasi data cache
      if (parsed?.data?.image || parsed?.data?.labels) {
        return parsed;
      }
      // Hapus cache yang tidak valid
      sessionStorage.removeItem(cacheKey);
    }

    const response = await api.get(`/api/posts/${postId}`);

    // Validasi response sebelum cache
    if (response?.data?.success && response?.data?.data) {
      const formattedData = {
        ...response.data,
        data: {
          ...response.data.data,
          image: response.data.data.image ? formatImageUrl(response.data.data.image) : null,
          labels: response.data.data.labels || []
        }
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(formattedData));
      return formattedData;
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
};

// Helper function untuk format image URL
const formatImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${import.meta.env.VITE_API_BASE_URL}/uploads/${imagePath.split('/').pop()}`;
};

// Helper function untuk format labels
const formatLabels = (labels) => {
  if (!labels) return [];
  if (!Array.isArray(labels)) return [];

  return labels.map(label => {
    if (typeof label === 'object') {
      return {
        id: parseInt(label.id),
        name: label.name || label.label || ''
      };
    }
    return null;
  }).filter(Boolean);
};

// Tambahkan validasi untuk pagination params
const validatePaginationParams = (page, limit) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  return { validPage, validLimit };
};

// Tambahkan fungsi upload image
export const uploadImage = async (file, onProgress) => {
  const uploadStartTime = Date.now();

  try {
    // Pastikan yang diterima adalah File object, bukan FormData
    if (!(file instanceof File)) {
      console.error('Invalid file object:', file);
      throw new Error('File tidak valid');
    }

    // Debug log
    console.log('Attempting to upload file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validasi file
    const validation = await validateImage(file);
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      throw new Error(validation.errors.join(', '));
    }

    // Buat FormData setelah validasi berhasil
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          const timeElapsed = (Date.now() - uploadStartTime) / 1000;
          const uploadedMB = progressEvent.loaded / (1024 * 1024);
          const speed = uploadedMB / timeElapsed;

          onProgress({
            progress: Math.round(progress),
            speed: speed.toFixed(2),
            loaded: progressEvent.loaded,
            total: progressEvent.total
          });
        }
      }
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Upload gagal');
    }

    return {
      success: true,
      filename: response.data.filename,
      path: response.data.path,
      url: getImageUrl(response.data.filename)
    };

  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Tambahkan fungsi delete image
export const deleteImage = async (filename) => {
  try {
    // Pastikan ada token
    const token = getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Tidak perlu split lagi karena filename sudah diberikan dari parameter
    const response = await api.delete(`/api/upload/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Fungsi khusus untuk admin featured post
export const getAdminFeaturedPost = async () => {
  try {
    console.log('Fetching admin featured post...');

    // Dapatkan token autentikasi
    const token = getAccessToken();
    if (!token) {
      console.error('Token autentikasi tidak tersedia');
      return {
        success: false,
        data: null,
        message: 'Token autentikasi tidak tersedia'
      };
    }

    const response = await api.get('/api/posts/admin-featured', {
      params: {
        _t: Date.now() // Cache busting
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('Admin featured post raw response:', response);

    // Periksa apakah response.data.data adalah array atau objek
    if (response.data?.success) {
      console.log('Admin featured post data:', response.data.data);

      // Jika data adalah array, ambil elemen pertama
      if (Array.isArray(response.data.data)) {
        if (response.data.data.length > 0) {
          return {
            success: true,
            data: response.data.data[0]
          };
        } else {
          return {
            success: true,
            data: null
          };
        }
      } else if (response.data.data && typeof response.data.data === 'object') {
        // Jika data adalah objek, gunakan langsung
        return {
          success: true,
          data: response.data.data
        };
      } else {
        console.log('API response data format not recognized');
        return {
          success: false,
          data: null,
          message: 'Format data tidak valid'
        };
      }
    } else {
      console.log('API response not successful');
      return {
        success: false,
        data: null,
        message: response.data?.message || 'Failed to fetch featured post'
      };
    }
  } catch (error) {
    console.error('Error fetching admin featured post:', error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Fungsi untuk soft delete post
export const softDeletePost = async (postId) => {
  try {
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    const response = await api.patch(`/api/posts/${postId}/soft-delete`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error soft deleting post:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Fungsi untuk restore post
export const restorePost = async (postId) => {
  try {
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    const response = await api.patch(`/api/posts/${postId}/restore`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error restoring post:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Fungsi untuk permanent delete post
export const permanentDeletePost = async (postId) => {
  try {
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    const response = await api.delete(`/api/posts/${postId}/permanent`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error permanently deleting post:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

// Tambahkan fungsi untuk mengambil post terhapus milik writer yang sedang login
export const getMyDeletedPosts = async ({ page = 1, limit = 10, search = '' }) => {
  try {
    const token = getAccessToken();
    if (!token) throw new Error('Token autentikasi tidak tersedia');

    const response = await api.get('/api/posts/my-deleted', {
      params: {
        page,
        limit,
        search,
        include_labels: true
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Pastikan response data terformat dengan benar
    const formattedData = response.data?.data?.map(post => ({
      ...post,
      featured_image: post.featured_image ? formatImageUrl(post.featured_image) : null,
      labels: formatLabels(post.labels || [])
    })) || [];

    return {
      posts: formattedData,
      pagination: response.data?.pagination || {
        currentPage: page,
        totalPages: Math.ceil((response.data?.total || 0) / limit),
        totalItems: response.data?.total || 0,
        limit
      }
    };
  } catch (error) {
    console.error('Error fetching my deleted posts:', error);
    throw error;
  }
};

// Tambahkan fungsi untuk mengambil post milik writer yang sedang login
// Fungsi untuk mendapatkan post populer berdasarkan jumlah views
export const getPopularPosts = async (limit = 6) => {
  try {
    const response = await publicApi.get('/api/posts/popular', {
      baseURL: import.meta.env.VITE_API_BASE_URL,
      params: {
        limit,
        status: 'published',
        deleted: false
      },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Public-Request': 'true' // Menandai ini sebagai request publik
      }
    });

    if (!response.data?.success) {
      throw new Error('Gagal mengambil popular posts');
    }

    const popularPosts = response.data.data.map(post => ({
      ...post,
      labels: Array.isArray(post.labels) ? formatLabels(post.labels) : []
    }));

    return {
      success: true,
      data: popularPosts
    };

  } catch (error) {
    console.error('Error fetching popular posts:', error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

export const getMyPosts = async (params) => {
  // Ekstrak parameter atau gunakan nilai default
  const {
    page = 1,
    limit = 10,
    search = '',
    dateFrom = undefined,
    dateTo = undefined,
    labelId = undefined,
    includeLabels = true
  } = params || {};
  try {
    console.log('Fetching my posts with params:', { page, limit, includeLabels });

    // Pastikan page dan limit adalah angka valid
    const validPage = parseInt(page) || 1;
    const validLimit = parseInt(limit) || 10;

    // Cek semua kemungkinan lokasi token
    let token = localStorage.getItem('token') ||
                localStorage.getItem('accessToken') ||
                sessionStorage.getItem('token') ||
                sessionStorage.getItem('accessToken');

    // Cek juga di user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token) token = user.token;
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }

    if (!token) {
      console.error('No token found in any storage location');
      console.log('localStorage keys:', Object.keys(localStorage));
      console.log('sessionStorage keys:', Object.keys(sessionStorage));

      // Coba ambil dari api.defaults
      if (api.defaults.headers.common['Authorization']) {
        const authHeader = api.defaults.headers.common['Authorization'];
        console.log('Found Authorization header:', authHeader);
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
          console.log('Extracted token from Authorization header');
        }
      }

      if (!token) {
        return {
          success: false,
          error: 'Token tidak ditemukan. Silakan login kembali.',
          posts: []
        };
      }
    }

    // Set token di header jika belum ada
    if (!api.defaults.headers.common['Authorization']) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Gunakan format parameter yang sederhana, hindari format kompleks seperti page[page]
    const response = await api.get('/api/posts/my-posts', {
      params: {
        page: validPage,
        limit: validLimit,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        labelId: labelId || undefined,
        includeLabels: includeLabels,
        _t: Date.now()
      }
    });

    console.log('Sending params to API:', {
      page: validPage,
      limit: validLimit,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      labelId: labelId || undefined,
      includeLabels: includeLabels
    });

    console.log('Raw API response:', response);

    // Normalisasi respons dengan pengecekan lebih ketat
    let posts = [];

    if (response.data) {
      if (Array.isArray(response.data)) {
        posts = response.data;
      } else if (Array.isArray(response.data.posts)) {
        posts = response.data.posts;
      } else if (Array.isArray(response.data.data)) {
        posts = response.data.data;
      } else if (response.data.success && response.data.posts) {
        posts = Array.isArray(response.data.posts) ? response.data.posts : [];
      }
    }

    // Normalisasi posts untuk memastikan mereka memiliki properti labels
    const normalizedPosts = posts.map(post => {
      // Pastikan post memiliki properti labels
      if (!post.labels || !Array.isArray(post.labels) || post.labels.length === 0) {
        // Coba ekstrak labels dari properti lain
        if (post.tags) {
          post.labels = Array.isArray(post.tags) ? post.tags :
                        typeof post.tags === 'string' ? post.tags.split(',').map(tag => tag.trim()) : [];
        } else if (post.categories) {
          post.labels = Array.isArray(post.categories) ? post.categories :
                        typeof post.categories === 'string' ? post.categories.split(',').map(cat => cat.trim()) : [];
        } else if (post.topics) {
          post.labels = Array.isArray(post.topics) ? post.topics :
                        typeof post.topics === 'string' ? post.topics.split(',').map(topic => topic.trim()) : [];
        } else {
          post.labels = [];
        }
      }

      return post;
    });

    console.log('Normalized posts:', normalizedPosts);

    return {
      success: true,
      posts: normalizedPosts,
      pagination: {
        currentPage: response.data.currentPage || validPage,
        totalPages: response.data.totalPages || 1,
        totalCount: response.data.totalCount || normalizedPosts.length
      }
    };
  } catch (error) {
    console.error('Error fetching my posts:', error);
    // Selalu kembalikan array kosong untuk posts
    return {
      success: false,
      error: error.response?.data?.message || 'Gagal mengambil data post',
      posts: []
    };
  }
};