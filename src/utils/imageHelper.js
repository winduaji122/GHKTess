/**
 * Helper function untuk menangani URL gambar
 * @param {string} imagePath - Path gambar yang akan diproses
 * @param {string} imageSource - Sumber gambar (optional: 'carousel', 'regular', dll)
 * @param {string} size - Ukuran gambar yang diinginkan ('thumbnail', 'medium', 'original', 'auto')
 * @returns {string|null} URL lengkap gambar atau null jika tidak ada path
 */
export const getImageUrl = (imagePath, imageSource, size = 'auto') => {
  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

  // Jika tidak ada path, gunakan gambar default
  if (!imagePath) {
    return `${apiUrl}/uploads/default-image.jpg`;
  }

  // Cek apakah ini adalah UUID (format baru)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(imagePath)) {
    // Ini adalah ID gambar, gunakan URL langsung ke file
    // Pilih path berdasarkan parameter size
    if (size === 'thumbnail') {
      return `${apiUrl}/uploads/thumbnail/${imagePath}`;
    } else if (size === 'medium') {
      return `${apiUrl}/uploads/medium/${imagePath}`;
    } else if (size === 'original') {
      return `${apiUrl}/uploads/original/${imagePath}`;
    } else {
      // Default ke original jika size adalah 'auto' atau tidak valid
      return `${apiUrl}/uploads/original/${imagePath}`;
    }
  }

  // Jika path adalah objek, coba ambil properti path
  if (typeof imagePath === 'object' && imagePath !== null) {
    // Coba berbagai properti yang mungkin berisi path
    const possiblePaths = ['path', 'filename', 'url', 'src'];
    for (const prop of possiblePaths) {
      if (imagePath[prop] && typeof imagePath[prop] === 'string') {
        imagePath = imagePath[prop];
        break;
      }
    }

    // Jika masih objek, gunakan default
    if (typeof imagePath === 'object') {
      return `${apiUrl}/uploads/default-image.jpg`;
    }
  }

  // Pastikan path adalah string
  const path = String(imagePath);

  // Penanganan khusus untuk default-image.jpg
  if (path === 'default-image.jpg' || path === '/default-image.jpg' ||
      path === 'uploads/default-image.jpg' || path === '/uploads/default-image.jpg') {
    return `${apiUrl}/uploads/default-image.jpg`;
  }

  // Jika path sudah berupa URL lengkap
  if (path.startsWith('http')) {
    // Jika URL menggunakan localhost, ganti dengan URL produksi
    if (path.includes('localhost:5000')) {
      return path.replace(/http:\/\/localhost:5000/g, apiUrl);
    }

    // Jika URL mengandung /uploads/original/ dan UUID, coba gunakan API endpoint
    const uuidMatch = path.match(/\/uploads\/original\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch && uuidMatch[1]) {
      return `${apiUrl}/api/images/${uuidMatch[1]}/original`;
    }

    return path;
  }

  // Penanganan khusus untuk path yang mengandung UUID tanpa ekstensi
  const uuidInPathMatch = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidInPathMatch && uuidInPathMatch[1]) {
    return `${apiUrl}/api/images/${uuidInPathMatch[1]}/original`;
  }

  // Penanganan khusus berdasarkan image_source
  if (imageSource === 'carousel') {
    // Untuk gambar dari carousel post

    // Jika path sudah dimulai dengan uploads/, gunakan langsung
    if (path.startsWith('uploads/')) {
      return `${apiUrl}/${path}`;
    }

    // Jika path dimulai dengan carousel/, tambahkan uploads/
    if (path.startsWith('carousel/')) {
      // Periksa apakah path mengandung doubling 'carousel/carousel/'
      if (path.startsWith('carousel/carousel/')) {
        // Hapus salah satu 'carousel/'
        const fixedPath = path.replace('carousel/carousel/', 'carousel/');
        return `${apiUrl}/uploads/${fixedPath}`;
      } else {
        return `${apiUrl}/uploads/${path}`;
      }
    }

    // Jika tidak ada prefix, tambahkan uploads/carousel/
    return `${apiUrl}/uploads/carousel/${path}`;
  } else if (imageSource === 'regular') {
    // Untuk gambar dari regular post

    // Jika path sudah dimulai dengan uploads/, gunakan langsung
    if (path.startsWith('uploads/')) {
      return `${apiUrl}/${path}`;
    }

    // Jika path dimulai dengan /, hapus
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Jika tidak ada prefix, tambahkan uploads/
    return `${apiUrl}/uploads/${cleanPath}`;
  }

  // Penanganan khusus untuk path yang dimulai dengan carousel/ (fallback)
  if (path.startsWith('carousel/')) {
    // Periksa apakah path mengandung doubling 'carousel/carousel/'
    if (path.startsWith('carousel/carousel/')) {
      // Hapus salah satu 'carousel/'
      const fixedPath = path.replace('carousel/carousel/', 'carousel/');
      return `${apiUrl}/uploads/${fixedPath}`;
    } else {
      return `${apiUrl}/uploads/${path}`;
    }
  }

  // Jika path dimulai dengan '/uploads/'
  if (path.startsWith('/uploads/')) {
    return `${apiUrl}${path}`;
  }

  // Jika path dimulai dengan 'uploads/'
  if (path.startsWith('uploads/')) {
    return `${apiUrl}/${path}`;
  }

  // Jika path dimulai dengan '/storage/' atau 'storage/'
  if (path.startsWith('/storage/')) {
    return `${apiUrl}${path}`;
  }
  if (path.startsWith('storage/')) {
    return `${apiUrl}/${path}`;
  }

  // Penanganan khusus untuk gambar profil
  if (path.includes('profile-')) {
    // Jika path sudah mengandung /uploads/profiles/, jangan tambahkan lagi
    if (path.includes('/uploads/profiles/')) {
      return path;
    }

    // Jika path mengandung /uploads/ tapi tidak /profiles/, tambahkan /profiles/
    if (path.includes('/uploads/')) {
      return path.replace('/uploads/', '/uploads/profiles/');
    }

    // Gunakan path yang benar dengan folder profiles/
    return `${apiUrl}/uploads/profiles/${path}`;
  }

  // Default: tambahkan /uploads/ untuk semua kasus lainnya
  return `${apiUrl}/uploads/${path}`;
};

/**
 * Helper function untuk memvalidasi file gambar
 * @param {File} file - File yang akan divalidasi
 * @returns {Promise} Promise dengan hasil validasi
 */
export const validateImage = async (file) => {
  return new Promise((resolve) => {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validation = {
      isValid: true,
      errors: []
    };

    // Validasi dasar file
    if (!file) {
      validation.isValid = false;
      validation.errors.push('File tidak ditemukan');
      resolve(validation);
      return;
    }

    // Validasi tipe file berdasarkan ekstensi jika MIME type tidak terdeteksi
    if (!file.type) {
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

      if (!hasValidExtension) {
        validation.isValid = false;
        validation.errors.push('Format file tidak didukung. Gunakan JPEG/JPG, PNG, GIF, atau WEBP');
        resolve(validation);
        return;
      }

      // Tentukan tipe berdasarkan ekstensi
      const ext = fileName.substring(fileName.lastIndexOf('.'));
      let detectedType;
      switch(ext) {
        case '.jpg':
        case '.jpeg':
          detectedType = 'image/jpeg';
          break;
        case '.png':
          detectedType = 'image/png';
          break;
        case '.gif':
          detectedType = 'image/gif';
          break;
        case '.webp':
          detectedType = 'image/webp';
          break;
      }

      // Set tipe yang terdeteksi ke file object
      Object.defineProperty(file, 'type', {
        writable: true,
        value: detectedType
      });
    } else {
      // Validasi MIME type jika terdeteksi
      const fileType = file.type.toLowerCase();
      if (!validTypes.includes(fileType)) {
        validation.isValid = false;
        validation.errors.push(`Format file tidak didukung. Gunakan JPEG/JPG, PNG, GIF, atau WEBP`);
      }
    }

    // Validasi ukuran
    if (file.size > maxSize) {
      validation.isValid = false;
      validation.errors.push(`Ukuran file terlalu besar. Maksimal 5MB`);
    }

    resolve(validation);
  });
};

  /**
   * Helper function untuk membersihkan nama file
   * @param {string} fileName - Nama file yang akan dibersihkan
   * @returns {string} Nama file yang sudah dibersihkan
   */
  export const sanitizeFileName = (fileName) => {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Ganti karakter non-alphanumeric dengan underscore
      .toLowerCase(); // Konversi ke lowercase
  };

/**
 * Fungsi khusus untuk mendapatkan URL gambar profil
 * @param {string} profilePath - Path gambar profil
 * @returns {string} URL lengkap gambar profil
 */
export const getProfileImageUrl = (profilePath) => {
  if (!profilePath) return null;

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

  // Deteksi URL Google (dengan atau tanpa http/https)
  if (profilePath.includes('googleusercontent.com') || profilePath.includes('lh3.google')) {
    // Jika sudah memiliki http/https, gunakan langsung
    if (profilePath.startsWith('http')) {
      return profilePath;
    } else {
      // Jika tidak memiliki http/https, tambahkan https://
      return `https://${profilePath}`;
    }
  }

  // Jika sudah URL lengkap
  if (profilePath.startsWith('http')) {
    // Jika ini adalah URL avatar lain dari pihak ketiga (seperti gravatar), gunakan langsung
    if (profilePath.includes('gravatar.com') || profilePath.includes('avatar') ||
        profilePath.includes('.jpg') || profilePath.includes('.png')) {
      return profilePath;
    }

    // Periksa apakah URL sudah benar (mengandung /profiles/)
    if (profilePath.includes('/uploads/profiles/')) {
      return profilePath;
    }

    // Jika URL mengandung /uploads/ tapi tidak /profiles/ dan mengandung profile-
    if (profilePath.includes('/uploads/') && !profilePath.includes('/profiles/') &&
        profilePath.includes('profile-')) {
      return profilePath.replace('/uploads/', '/uploads/profiles/');
    }

    // Jika URL menggunakan localhost, ganti dengan URL produksi
    if (profilePath.includes('localhost:5000')) {
      return profilePath.replace('http://localhost:5000', apiUrl);
    }

    return profilePath;
  }

  // Jika path dimulai dengan /uploads/profiles/
  if (profilePath.startsWith('/uploads/profiles/')) {
    return `${apiUrl}${profilePath}`;
  }

  // Jika path dimulai dengan uploads/profiles/
  if (profilePath.startsWith('uploads/profiles/')) {
    return `${apiUrl}/${profilePath}`;
  }

  // Jika path hanya berisi nama file (profile-xxx.jpg)
  if (profilePath.startsWith('profile-')) {
    return `${apiUrl}/uploads/profiles/${profilePath}`;
  }

  // Jika path dimulai dengan /uploads/ tapi tidak /profiles/ dan mengandung profile-
  if (profilePath.startsWith('/uploads/') && !profilePath.includes('/profiles/') &&
      profilePath.includes('profile-')) {
    return `${apiUrl}${profilePath.replace('/uploads/', '/uploads/profiles/')}`;
  }

  // Jika path dimulai dengan uploads/ tapi tidak profiles/ dan mengandung profile-
  if (profilePath.startsWith('uploads/') && !profilePath.includes('profiles/') &&
      profilePath.includes('profile-')) {
    return `${apiUrl}/${profilePath.replace('uploads/', 'uploads/profiles/')}`;
  }

  // Default case: tambahkan /uploads/profiles/
  return `${apiUrl}/uploads/profiles/${profilePath}`;
};

/**
 * Helper function untuk mendapatkan URL gambar dengan berbagai ukuran
 * @param {string} imageId - ID gambar (UUID)
 * @param {string} preferredSize - Ukuran gambar yang diutamakan ('thumbnail', 'medium', 'original')
 * @returns {Object} Objek berisi URL untuk berbagai ukuran gambar
 */
export const getResponsiveImageUrls = (imageId, preferredSize = 'auto') => {
  // Jika tidak ada ID, kembalikan null
  if (!imageId) {
    return null;
  }

  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

  // Cek apakah ini adalah UUID (format baru)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(imageId)) {
    // Jika bukan UUID, gunakan getImageUrl biasa dengan parameter size
    const url = getImageUrl(imageId, null, preferredSize);
    return {
      original: url,
      medium: url,
      thumbnail: url,
      srcSet: null,
      sizes: null
    };
  }

  // Coba cari file di database jika tersedia
  if (window.imageDatabase) {
    const imageData = window.imageDatabase.find(img => img.id === imageId);
    if (imageData) {
      // Gunakan path dari database
      const originalUrl = `${apiUrl}/${imageData.original_path}`;
      const mediumUrl = `${apiUrl}/${imageData.medium_path}`;
      const thumbnailUrl = `${apiUrl}/${imageData.thumbnail_path}`;

      // Tentukan URL yang diutamakan berdasarkan preferredSize
      let preferredUrl;
      if (preferredSize === 'thumbnail') {
        preferredUrl = thumbnailUrl;
      } else if (preferredSize === 'medium') {
        preferredUrl = mediumUrl;
      } else if (preferredSize === 'original') {
        preferredUrl = originalUrl;
      } else {
        // Default ke original jika preferredSize adalah 'auto' atau tidak valid
        preferredUrl = originalUrl;
      }

      return {
        original: originalUrl,
        medium: mediumUrl,
        thumbnail: thumbnailUrl,
        preferred: preferredUrl,
        srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
        sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
      };
    }
  }

  // Gunakan URL langsung ke file tanpa ekstensi
  const originalUrl = `${apiUrl}/uploads/original/${imageId}`;
  const mediumUrl = `${apiUrl}/uploads/medium/${imageId}`;
  const thumbnailUrl = `${apiUrl}/uploads/thumbnail/${imageId}`;

  // Tentukan URL yang diutamakan berdasarkan preferredSize
  let preferredUrl;
  if (preferredSize === 'thumbnail') {
    preferredUrl = thumbnailUrl;
  } else if (preferredSize === 'medium') {
    preferredUrl = mediumUrl;
  } else if (preferredSize === 'original') {
    preferredUrl = originalUrl;
  } else {
    // Default ke original jika preferredSize adalah 'auto' atau tidak valid
    preferredUrl = originalUrl;
  }

  return {
    original: originalUrl,
    medium: mediumUrl,
    thumbnail: thumbnailUrl,
    preferred: preferredUrl,
    srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
    sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
  };
};

export default {
  getImageUrl,
  getProfileImageUrl,
  validateImage,
  sanitizeFileName,
  getResponsiveImageUrls
};