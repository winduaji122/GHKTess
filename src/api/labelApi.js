import { api, publicApi } from './axios';
import { endpoints } from './Config';

export const createLabel = async (labelData) => {
  try {
    const response = await api.post('/api/labels', labelData, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error creating label:', error);
    throw error;
  }
};

export const getLabels = async () => {
  try {
    const response = await publicApi.get('/api/search/labels');

    // Tambahkan log untuk debugging
    console.log('Raw labels response:', response.data);

    let formattedLabels = [];

    // Response langsung berisi array labels
    if (response.data && Array.isArray(response.data)) {
      formattedLabels = response.data.map(label => ({
        id: parseInt(label.id), // Pastikan id adalah number
        name: label.name || label.label || ''
      }));
    }
    // Jika response dalam format {data: [...]}
    else if (response.data?.data && Array.isArray(response.data.data)) {
      formattedLabels = response.data.data.map(label => ({
        id: parseInt(label.id), // Pastikan id adalah number
        name: label.name || label.label || ''
      }));
    }

    console.log('Formatted labels:', formattedLabels);
    return formattedLabels;

  } catch (error) {
    console.error('Error fetching labels:', error);
    return [];
  }
};

export const updateLabel = async (labelId, newLabel) => {
  try {
    if (isNaN(parseInt(labelId))) {
      throw new Error('Label ID harus berupa number');
    }
    const response = await api.put(`${endpoints.labels}/${parseInt(labelId)}`, { label: newLabel });
    console.log('Label berhasil diperbarui:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error memperbarui label:', error);
    throw error;
  }
};

export const deleteLabel = async (labelId) => {
  try {
    if (isNaN(parseInt(labelId))) {
      throw new Error('Label ID harus berupa number');
    }
    await api.delete(`${endpoints.labels}/${parseInt(labelId)}`);
    console.log('Label berhasil dihapus');
  } catch (error) {
    console.error('Error menghapus label:', error);
    throw error;
  }
};

export const getPopularLabels = async (limit = 10) => {
  try {
    const response = await publicApi.get(`${endpoints.labels}/popular`, { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Error mengambil popular labels:', error.response?.data || error.message);
    throw error;
  }
};

export const getLabelsForPost = async (postId) => {
  try {
    const response = await publicApi.get(`${endpoints.posts}/${postId}/labels`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching labels for post ${postId}:`, error.response?.data || error.message);
    return [];
  }
};

// Alias untuk kompatibilitas
export const getUniqueLabels = getLabels;
export const addLabel = createLabel;
export const getAllLabels = getLabels;

// Tambahkan fungsi khusus untuk search labels
export const searchLabels = async (query) => {
  try {
    const response = await publicApi.get('/api/search/labels', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching labels:', error);
    return [];
  }
};

// Fungsi terpisah untuk admin yang memerlukan autentikasi
export const getAdminLabels = async () => {
  try {
    const response = await api.get(endpoints.labels, {
      params: {
        status: 'active',
        sort: 'name:asc'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching admin labels:', error);
    throw error;
  }
};

// Fungsi-fungsi yang sudah tidak diperlukan telah dihapus

// Fungsi untuk mendapatkan label berdasarkan slug
export const getLabelBySlug = async (slug) => {
  try {
    const response = await publicApi.get(`/api/labels/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching label by slug:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan post berdasarkan label
export const getPostsByLabel = async (labelSlug, page = 1, limit = 12) => {
  try {
    // Jika labelSlug adalah '404' atau 'not-found', kembalikan error khusus
    if (labelSlug === '404' || labelSlug === 'not-found') {
      return {
        success: false,
        error: 'Not Found',
        posts: [],
        label: { label: 'Not Found' },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0
        }
      };
    }

    // Jika labelSlug adalah 'all', ambil semua post
    if (labelSlug === 'all') {
      const response = await publicApi.get('/api/posts', {
        params: {
          page,
          limit,
          status: 'published',
          deleted: false
        }
      });

      return {
        success: true,
        posts: response.data.posts || [],
        label: { label: 'Semua Artikel' },
        pagination: response.data.pagination || {
          currentPage: page,
          totalPages: Math.ceil((response.data.total || 0) / limit),
          totalItems: response.data.total || 0
        }
      };
    }

    // Coba ambil post berdasarkan slug label terlebih dahulu
    try {
      console.log('Trying to fetch posts by label slug:', labelSlug);
      const response = await publicApi.get(`/api/posts/label/${labelSlug}`, {
        params: {
          page,
          limit,
          status: 'published',
          deleted: false
        }
      });

      // Filter posts to only include published posts
      const publishedPosts = response.data.posts ? response.data.posts.filter(post => post.status === 'published') : [];

      return {
        success: true,
        posts: publishedPosts,
        label: response.data.label || { label: labelSlug },
        pagination: response.data.pagination || {
          currentPage: page,
          totalPages: Math.ceil((response.data.total || 0) / limit),
          totalItems: response.data.total || 0
        }
      };
    } catch (slugError) {
      console.log('Error fetching by slug, trying alternative methods:', slugError);

      // Jika gagal dengan slug, coba dengan ID jika labelSlug adalah angka
      const isNumeric = !isNaN(parseInt(labelSlug)) && isFinite(labelSlug);

      if (isNumeric) {
        try {
          console.log('Trying to fetch posts by label ID:', labelSlug);
          const response = await publicApi.get(`/api/posts/by-label-id/${labelSlug}`, {
            params: {
              page,
              limit,
              status: 'published',
              deleted: false
            }
          });

          // Filter posts to only include published posts
          const publishedPosts = response.data.posts ? response.data.posts.filter(post => post.status === 'published') : [];

          return {
            success: true,
            posts: publishedPosts,
            label: response.data.label || { label: `Label ${labelSlug}` },
            pagination: response.data.pagination || {
              currentPage: page,
              totalPages: Math.ceil((response.data.total || 0) / limit),
              totalItems: response.data.total || 0
            }
          };
        } catch (idError) {
          console.log('Error fetching by ID:', idError);
          throw idError;
        }
      } else {
        // Jika bukan angka dan gagal dengan slug, coba dengan endpoint lama
        try {
          console.log('Trying to fetch posts with legacy endpoint:', labelSlug);
          // Coba dengan endpoint search
          const response = await publicApi.get(`/api/search`, {
            params: {
              q: labelSlug,
              page,
              limit,
              status: 'published',
              deleted: false
            }
          });

          // Filter posts to only include published posts
          const publishedPosts = response.data.posts ? response.data.posts.filter(post => post.status === 'published') : [];

          return {
            success: true,
            posts: publishedPosts,
            label: response.data.label || { label: labelSlug },
            pagination: response.data.pagination || {
              currentPage: page,
              totalPages: Math.ceil((response.data.total || 0) / limit),
              totalItems: response.data.total || 0
            }
          };
        } catch (legacyError) {
          console.log('Error fetching with legacy endpoint:', legacyError);
          throw legacyError;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching posts by label:', error);

    // Jika semua metode gagal, coba ambil semua post sebagai fallback
    try {
      console.log('All methods failed, fetching all posts as fallback');
      const response = await publicApi.get('/api/posts', {
        params: {
          page,
          limit,
          status: 'published',
          deleted: false
        }
      });

      // Filter posts to only include published posts
      const publishedPosts = response.data.posts ? response.data.posts.filter(post => post.status === 'published') : [];

      return {
        success: true,
        posts: publishedPosts,
        label: { label: labelSlug || 'Semua Artikel' },
        pagination: response.data.pagination || {
          currentPage: page,
          totalPages: Math.ceil((response.data.total || 0) / limit),
          totalItems: response.data.total || 0
        },
        fallback: true // Menandai bahwa ini adalah fallback
      };
    } catch (fallbackError) {
      console.error('Even fallback failed:', fallbackError);
      return {
        success: false,
        posts: [],
        label: null,
        error: 'Gagal memuat artikel. Silakan coba lagi nanti.'
      };
    }
  }
};
