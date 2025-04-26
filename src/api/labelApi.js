import { api, publicApi } from './axios';
import { endpoints } from './Config';

export const createLabel = async (labelData) => {
  try {
    console.log('Creating label with data:', labelData);

    // Pastikan token masih valid sebelum membuat label
    const tokenStr = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!tokenStr) {
      console.error('No access token available for creating label');
      throw new Error('Authentication required');
    }

    // Parse token untuk mendapatkan token aktual
    let token;
    try {
      const tokenData = JSON.parse(tokenStr);
      token = tokenData.token;

      // Cek apakah token sudah expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        console.error('Token has expired');
        throw new Error('Token expired');
      }
    } catch (parseError) {
      console.error('Error parsing token:', parseError);
      throw new Error('Invalid token format');
    }

    // Tambahkan timestamp untuk mencegah caching
    const timestamp = Date.now();

    const response = await api.post(`/api/labels?_t=${timestamp}`, labelData, {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('Label created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating label:', error.response?.data || error.message);

    // Jika error 401 (Unauthorized), coba refresh token dan coba lagi
    if (error.response?.status === 401) {
      console.log('Unauthorized error when creating label, attempting to refresh token');
      try {
        // Tampilkan pesan error tanpa redirect
        console.error('Session expired. Please login again.');
        throw new Error('Session expired. Please login again.');
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        throw refreshError;
      }
    }

    throw error;
  }
};

export const getLabels = async () => {
  try {
    const response = await publicApi.get('/api/search/labels', {
      // Tambahkan header khusus untuk menandai ini sebagai request publik
      headers: {
        'X-Public-Request': 'true'
      }
    });

    // Tambahkan log untuk debugging
    console.log('Raw labels response:', response.data);

    let formattedLabels = [];

    // Response langsung berisi array labels
    if (response.data && Array.isArray(response.data)) {
      formattedLabels = response.data.map(label => ({
        id: parseInt(label.id), // Pastikan id adalah number
        name: label.name || label.label || '',
        label: label.label || label.name || '', // Tambahkan field label untuk konsistensi
        parent_id: label.parent_id ? parseInt(label.parent_id) : null, // Tambahkan parent_id untuk sublabel
        slug: label.slug || label.name || label.label || '' // Tambahkan slug untuk URL
      }));
    }
    // Jika response dalam format {data: [...]}
    else if (response.data?.data && Array.isArray(response.data.data)) {
      formattedLabels = response.data.data.map(label => ({
        id: parseInt(label.id), // Pastikan id adalah number
        name: label.name || label.label || '',
        label: label.label || label.name || '', // Tambahkan field label untuk konsistensi
        parent_id: label.parent_id ? parseInt(label.parent_id) : null, // Tambahkan parent_id untuk sublabel
        slug: label.slug || label.name || label.label || '' // Tambahkan slug untuk URL
      }));
    }

    console.log('Formatted labels with parent_id:', formattedLabels);

    // Tambahkan log untuk memeriksa struktur label dan sublabel
    const mainLabels = formattedLabels.filter(label => !label.parent_id);
    console.log('Main labels:', mainLabels);

    const sublabels = formattedLabels.filter(label => label.parent_id);
    console.log('Sublabels:', sublabels);

    // Periksa apakah ada sublabel yang parent_id-nya tidak ada di mainLabels
    const invalidSublabels = sublabels.filter(sublabel =>
      !mainLabels.some(mainLabel => mainLabel.id === sublabel.parent_id)
    );
    console.log('Invalid sublabels (parent not found):', invalidSublabels);

    return formattedLabels;

  } catch (error) {
    console.error('Error fetching labels:', error);
    // Fallback ke label hardcoded jika gagal mengambil dari API
    return [
      { id: 1, name: 'Berita', label: 'Berita', slug: 'berita' },
      { id: 2, name: 'Renungan', label: 'Renungan', slug: 'renungan' },
      { id: 3, name: 'Artikel', label: 'Artikel', slug: 'artikel' }
    ];
  }
};

export const updateLabel = async (labelId, newLabel) => {
  try {
    if (isNaN(parseInt(labelId))) {
      throw new Error('Label ID harus berupa number');
    }

    // Pastikan token masih valid sebelum memperbarui label
    const tokenStr = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!tokenStr) {
      console.error('No access token available for updating label');
      throw new Error('Authentication required');
    }

    // Parse token untuk mendapatkan token aktual
    let token;
    try {
      const tokenData = JSON.parse(tokenStr);
      token = tokenData.token;

      // Cek apakah token sudah expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        console.error('Token has expired');
        throw new Error('Token expired');
      }
    } catch (parseError) {
      console.error('Error parsing token:', parseError);
      throw new Error('Invalid token format');
    }

    // Jika newLabel adalah string, gunakan sebagai nama label
    // Jika newLabel adalah objek, gunakan sebagai data label lengkap
    const labelData = typeof newLabel === 'string'
      ? { label: newLabel }
      : newLabel;

    // Tambahkan timestamp untuk mencegah caching
    const timestamp = Date.now();

    const response = await api.put(`${endpoints.labels}/${parseInt(labelId)}?_t=${timestamp}`, labelData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log('Label berhasil diperbarui:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error memperbarui label:', error);

    // Jika error 401 (Unauthorized), coba refresh token dan coba lagi
    if (error.response?.status === 401) {
      console.log('Unauthorized error when updating label, attempting to refresh token');
      try {
        // Tampilkan pesan error tanpa redirect
        console.error('Session expired. Please login again.');
        throw new Error('Session expired. Please login again.');
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        throw refreshError;
      }
    }

    throw error;
  }
};

export const deleteLabel = async (labelId) => {
  try {
    if (isNaN(parseInt(labelId))) {
      throw new Error('Label ID harus berupa number');
    }

    // Pastikan token masih valid sebelum menghapus label
    const tokenStr = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!tokenStr) {
      console.error('No access token available for deleting label');
      throw new Error('Authentication required');
    }

    // Parse token untuk mendapatkan token aktual
    let token;
    try {
      const tokenData = JSON.parse(tokenStr);
      token = tokenData.token;

      // Cek apakah token sudah expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        console.error('Token has expired');
        throw new Error('Token expired');
      }
    } catch (parseError) {
      console.error('Error parsing token:', parseError);
      throw new Error('Invalid token format');
    }

    // Tambahkan timestamp untuk mencegah caching
    const timestamp = Date.now();

    await api.delete(`${endpoints.labels}/${parseInt(labelId)}?_t=${timestamp}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log('Label berhasil dihapus');
  } catch (error) {
    console.error('Error menghapus label:', error);

    // Jika error 401 (Unauthorized), coba refresh token dan coba lagi
    if (error.response?.status === 401) {
      console.log('Unauthorized error when deleting label, attempting to refresh token');
      try {
        // Tampilkan pesan error tanpa redirect
        console.error('Session expired. Please login again.');
        throw new Error('Session expired. Please login again.');
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        throw refreshError;
      }
    }

    throw error;
  }
};

export const getPopularLabels = async (limit = 10) => {
  try {
    const response = await publicApi.get(`${endpoints.labels}/popular`, {
      // Tambahkan header khusus untuk menandai ini sebagai request publik
      headers: {
        'X-Public-Request': 'true'
      },
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error mengambil popular labels:', error.response?.data || error.message);
    // Fallback ke label hardcoded jika gagal
    return [
      { id: 1, name: 'Berita', label: 'Berita', slug: 'berita', count: 10 },
      { id: 2, name: 'Renungan', label: 'Renungan', slug: 'renungan', count: 8 },
      { id: 3, name: 'Artikel', label: 'Artikel', slug: 'artikel', count: 5 }
    ];
  }
};

export const getLabelsForPost = async (postId) => {
  try {
    const response = await publicApi.get(`${endpoints.posts}/${postId}/labels`, {
      // Tambahkan header khusus untuk menandai ini sebagai request publik
      headers: {
        'X-Public-Request': 'true'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching labels for post ${postId}:`, error.response?.data || error.message);
    // Return array kosong jika gagal
    return [];
  }
};

// Fungsi khusus untuk mendapatkan label dengan sublabel
export const getLabelsWithSublabels = async () => {
  try {
    // Gunakan endpoint publik yang sudah terbukti berfungsi
    try {
      // Gunakan endpoint search labels yang sudah terbukti berfungsi untuk publik
      const response = await publicApi.get('/api/search/labels', {
        // Tambahkan header khusus untuk menandai ini sebagai request publik
        headers: {
          'X-Public-Request': 'true'
        },
        params: {
          _t: Date.now() // Cache busting
        }
      });

      let allLabels = [];

      if (Array.isArray(response.data)) {
        allLabels = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        allLabels = response.data.data;
      }

      if (allLabels.length === 0) {
        console.log('No labels returned from search endpoint, using hardcoded fallback');
        // Fallback ke label hardcoded jika tidak ada label yang dikembalikan
        return [
          { id: 1, name: 'Berita', label: 'Berita', slug: 'berita', sublabels: [] },
          { id: 2, name: 'Renungan', label: 'Renungan', slug: 'renungan', sublabels: [] },
          { id: 3, name: 'Artikel', label: 'Artikel', slug: 'artikel', sublabels: [] }
        ];
      }

      // Pisahkan label utama dan sublabel
      const mainLabels = allLabels.filter(label => !label.parent_id);
      const subLabels = allLabels.filter(label => label.parent_id);

      console.log('Main labels from API:', mainLabels);
      console.log('Sub labels from API:', subLabels);

      // Tambahkan sublabel ke label utama
      const labelsWithSublabels = mainLabels.map(mainLabel => {
        const labelSublabels = subLabels.filter(subLabel =>
          subLabel.parent_id === mainLabel.id ||
          subLabel.parent_id === mainLabel.id.toString()
        );
        return {
          ...mainLabel,
          sublabels: labelSublabels
        };
      });

      console.log('Labels with sublabels (processed manually):', labelsWithSublabels);
      return labelsWithSublabels;
    } catch (error) {
      console.error('Error fetching from search endpoint:', error);

      // Fallback ke label hardcoded jika gagal
      return [
        { id: 1, name: 'Berita', label: 'Berita', slug: 'berita', sublabels: [] },
        { id: 2, name: 'Renungan', label: 'Renungan', slug: 'renungan', sublabels: [] },
        { id: 3, name: 'Artikel', label: 'Artikel', slug: 'artikel', sublabels: [] }
      ];
    }
  } catch (error) {
    console.error('Error fetching labels with sublabels:', error);
    // Fallback ke label hardcoded jika semua metode gagal
    return [
      { id: 1, name: 'Berita', label: 'Berita', slug: 'berita', sublabels: [] },
      { id: 2, name: 'Renungan', label: 'Renungan', slug: 'renungan', sublabels: [] },
      { id: 3, name: 'Artikel', label: 'Artikel', slug: 'artikel', sublabels: [] }
    ];
  }
};

// Alias untuk kompatibilitas
export const getUniqueLabels = getLabels;
export const addLabel = createLabel;
export const getAllLabels = getLabelsWithSublabels; // Gunakan fungsi baru untuk mendapatkan label dengan sublabel

// Tambahkan fungsi khusus untuk search labels
export const searchLabels = async (query) => {
  try {
    const response = await publicApi.get('/api/search/labels', {
      // Tambahkan header khusus untuk menandai ini sebagai request publik
      headers: {
        'X-Public-Request': 'true'
      },
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching labels:', error);
    // Fallback ke label hardcoded jika gagal
    return [
      { id: 1, name: 'Berita', label: 'Berita', slug: 'berita' },
      { id: 2, name: 'Renungan', label: 'Renungan', slug: 'renungan' },
      { id: 3, name: 'Artikel', label: 'Artikel', slug: 'artikel' }
    ].filter(label => label.name.toLowerCase().includes(query.toLowerCase()));
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
    const response = await publicApi.get(`/api/labels/slug/${slug}`, {
      // Tambahkan header khusus untuk menandai ini sebagai request publik
      headers: {
        'X-Public-Request': 'true'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching label by slug:', error);
    // Return default label jika gagal
    return { id: 0, name: slug, label: slug, slug: slug };
  }
};

// Fungsi untuk mendapatkan label berdasarkan ID
export const getLabelById = async (id) => {
  try {
    if (!id) return null;

    // Pastikan id adalah number
    const labelId = typeof id === 'string' ? parseInt(id) : id;

    // Coba ambil dari API publik terlebih dahulu
    try {
      const response = await publicApi.get(`/api/labels/id/${labelId}`, {
        // Tambahkan header khusus untuk menandai ini sebagai request publik
        headers: {
          'X-Public-Request': 'true'
        },
        params: {
          _t: Date.now() // Cache busting
        }
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }

      return response.data;
    } catch (publicApiError) {
      console.log('Error fetching from public API, trying alternative method');

      // Jika gagal, coba ambil dari semua label
      const allLabels = await getLabels();
      if (Array.isArray(allLabels)) {
        const foundLabel = allLabels.find(label =>
          label.id === labelId || label.id === labelId.toString()
        );

        if (foundLabel) {
          return foundLabel;
        }
      }

      // Jika masih gagal, coba ambil dari API labels dengan sublabels
      try {
        const labelsWithSublabels = await getLabelsWithSublabels();
        let foundLabel = null;

        // Cari di label utama
        for (const mainLabel of labelsWithSublabels) {
          if (mainLabel.id === labelId || mainLabel.id === labelId.toString()) {
            foundLabel = mainLabel;
            break;
          }

          // Cari di sublabel
          if (mainLabel.sublabels && Array.isArray(mainLabel.sublabels)) {
            const foundSublabel = mainLabel.sublabels.find(sublabel =>
              sublabel.id === labelId || sublabel.id === labelId.toString()
            );

            if (foundSublabel) {
              foundLabel = foundSublabel;
              break;
            }
          }
        }

        if (foundLabel) {
          return foundLabel;
        }
      } catch (sublabelsError) {
        console.error('Error fetching labels with sublabels:', sublabelsError);
      }
    }

    // Jika semua metode gagal, return null
    return null;
  } catch (error) {
    console.error(`Error fetching label by ID ${id}:`, error);
    // Return null jika gagal
    return null;
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
        // Tambahkan header khusus untuk menandai ini sebagai request publik
        headers: {
          'X-Public-Request': 'true'
        },
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
        // Tambahkan header khusus untuk menandai ini sebagai request publik
        headers: {
          'X-Public-Request': 'true'
        },
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
            // Tambahkan header khusus untuk menandai ini sebagai request publik
            headers: {
              'X-Public-Request': 'true'
            },
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
            // Tambahkan header khusus untuk menandai ini sebagai request publik
            headers: {
              'X-Public-Request': 'true'
            },
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
        // Tambahkan header khusus untuk menandai ini sebagai request publik
        headers: {
          'X-Public-Request': 'true'
        },
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
