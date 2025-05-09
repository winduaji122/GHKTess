// Deklarasi tipe untuk window.imageCache, window.imageDatabase, dan window.saveImageExtension
if (typeof window !== 'undefined') {
  window.imageCache = window.imageCache || new Map();
  window.imageDatabase = window.imageDatabase || [];

  // Deklarasi fungsi saveImageExtension jika belum ada
  if (typeof window.saveImageExtension !== 'function') {
    window.saveImageExtension = (id, extension) => {
      try {
        // Ambil cache yang sudah ada
        const cachedExtensions = localStorage.getItem('imageExtensionCache') || '{}';
        const extensionMap = JSON.parse(cachedExtensions);

        // Tambahkan atau perbarui data
        extensionMap[id] = extension;

        // Simpan kembali ke localStorage
        localStorage.setItem('imageExtensionCache', JSON.stringify(extensionMap));

        // Tambahkan ke database gambar jika belum ada
        if (window.imageDatabase && Array.isArray(window.imageDatabase)) {
          const exists = window.imageDatabase.some(img => img.id === id);
          if (!exists) {
            window.imageDatabase.push({
              id: id,
              original_path: `uploads/original/${id}${extension}`,
              thumbnail_path: `uploads/thumbnail/${id}${extension}`,
              medium_path: `uploads/medium/${id}${extension}`
            });
          }
        }

        console.log(`Saved extension ${extension} for image ${id} to cache`);
      } catch (error) {
        console.error('Error saving image extension to cache:', error);
      }
    };
  }
}

/**
 * Helper function untuk menangani URL gambar
 * @param {string} imagePath - Path gambar yang akan diproses
 * @param {string} imageSource - Sumber gambar (optional: 'carousel', 'regular', dll)
 * @param {string} size - Ukuran gambar yang diinginkan ('thumbnail', 'medium', 'original', 'auto')
 * @returns {string|null} URL lengkap gambar atau null jika tidak ada path
 */
// Import getResponsiveImageUrls
import { getResponsiveImageUrls as importedGetResponsiveImageUrls } from './getResponsiveImageUrls';

// Re-export dengan nama yang berbeda untuk menghindari konflik
export { importedGetResponsiveImageUrls as getResponsiveImageUrlsFromFile };

export const getImageUrl = (imagePath, imageSource, size = 'auto') => {
  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://nodejs-production-0c33.up.railway.app';

  // Jika tidak ada path, gunakan gambar default
  if (!imagePath) {
    return `${apiUrl}/uploads/default-image.jpg`;
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

    // Jika URL sudah menggunakan domain produksi, gunakan langsung
    if (path.includes('nodejs-production-0c33.up.railway.app')) {
      // Jika URL mengandung format image-*, gunakan placeholder
      if (path.includes('/uploads/image-')) {
        console.log('URL dengan format lama terdeteksi:', path);
        return `${apiUrl}/uploads/default-image.jpg`;
      }
      return path;
    }

    return path;
  }

  // Cek apakah ini adalah UUID (format baru)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(path)) {
    // Ini adalah ID gambar, gunakan URL langsung ke file
    // Pilih path berdasarkan parameter size
    let sizeDir = 'original';
    if (size === 'thumbnail') {
      sizeDir = 'thumbnail';
    } else if (size === 'medium') {
      sizeDir = 'medium';
    } else if (size === 'original') {
      sizeDir = 'original';
    } else if (size === 'auto') {
      // Auto: pilih berdasarkan konteks
      sizeDir = 'medium'; // Default ke medium untuk 'auto'
    }

    // Tambahkan ekstensi .jpg untuk UUID
    return `${apiUrl}/uploads/${sizeDir}/${path}.jpg`;
  }

  // Jika path dimulai dengan 'image-', ini adalah format lama
  if (path.startsWith('image-')) {
    // Jika path sudah mengandung ekstensi file, gunakan langsung
    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return `${apiUrl}/uploads/${path}`;
    }

    // Jika tidak ada ekstensi, tambahkan .jpg
    return `${apiUrl}/uploads/${path}.jpg`;
  }

  // Jika path dimulai dengan '/uploads/'
  if (path.startsWith('/uploads/')) {
    return `${apiUrl}${path}`;
  }

  // Jika path dimulai dengan 'uploads/'
  if (path.startsWith('uploads/')) {
    return `${apiUrl}/${path}`;
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

/**
 * Fungsi untuk mendeteksi ekstensi file berdasarkan ID atau path
 * @param {string} imageId - ID gambar atau path
 * @returns {string} Ekstensi file yang terdeteksi (.jpg, .png, dll)
 */
export const detectImageExtension = (imageId) => {
  if (!imageId) return '';

  // Jika imageId sudah mengandung ekstensi, ekstrak dan kembalikan
  const extensionMatch = imageId.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  if (extensionMatch) {
    return extensionMatch[0].toLowerCase();
  }

  // Cek apakah ada di cache localStorage
  try {
    const cachedExtensions = localStorage.getItem('imageExtensionCache');
    if (cachedExtensions) {
      const extensionMap = JSON.parse(cachedExtensions);
      if (extensionMap[imageId]) {
        return extensionMap[imageId];
      }
    }
  } catch (error) {
    console.error('Error reading from imageExtensionCache:', error);
  }

  // Cek apakah ini adalah format image-*
  if (typeof imageId === 'string' && imageId.includes('image-')) {
    // Coba cari di database gambar
    if (window.imageDatabase && Array.isArray(window.imageDatabase)) {
      const matchingImage = window.imageDatabase.find(img =>
        img.original_path.includes(imageId) ||
        img.id === imageId
      );

      if (matchingImage) {
        // Ekstrak ekstensi dari path di database
        const pathParts = matchingImage.original_path.split('.');
        if (pathParts.length > 1) {
          const extension = `.${pathParts.pop().toLowerCase()}`;

          // Simpan ke cache untuk penggunaan berikutnya
          if (typeof window.saveImageExtension === 'function') {
            window.saveImageExtension(imageId, extension);
          }

          return extension;
        }
      }
    }

    // Jika tidak ditemukan di database, coba deteksi dari pola
    if (imageId.includes('-gif')) {
      return '.gif';
    } else if (imageId.includes('-png')) {
      return '.png';
    } else if (imageId.includes('-webp')) {
      return '.webp';
    } else {
      return '.jpg'; // Default untuk format image-*
    }
  }

  // Cek apakah ini adalah UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(imageId)) {
    // Coba cari di database gambar
    if (window.imageDatabase && Array.isArray(window.imageDatabase)) {
      const matchingImage = window.imageDatabase.find(img => img.id === imageId);
      if (matchingImage) {
        // Ekstrak ekstensi dari path di database
        const pathParts = matchingImage.original_path.split('.');
        if (pathParts.length > 1) {
          const extension = `.${pathParts.pop().toLowerCase()}`;

          // Simpan ke cache untuk penggunaan berikutnya
          if (typeof window.saveImageExtension === 'function') {
            window.saveImageExtension(imageId, extension);
          }

          return extension;
        }
      }
    }

    // Jika tidak ditemukan di database, gunakan .jpg sebagai default untuk UUID
    return '.jpg';
  }

  // Default: gunakan .jpg
  return '.jpg';
};

/**
 * Fungsi untuk mendapatkan URL gambar dengan ekstensi yang benar
 * @param {string} imageId - ID gambar
 * @param {string} size - Ukuran gambar (original, medium, thumbnail)
 * @returns {string} URL gambar dengan ekstensi yang benar
 */
export const getImageUrlWithExtension = (imageId, size = 'original') => {
  if (!imageId) return null;

  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

  // Jika imageId sudah mengandung ekstensi, gunakan langsung
  if (imageId.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return `${apiUrl}/uploads/${size}/${imageId}`;
  }

  // Jika imageId adalah URL lengkap, ekstrak nama file
  if (imageId.startsWith('http')) {
    const urlParts = imageId.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return `${apiUrl}/uploads/${size}/${fileName}`;
  }

  // Jika imageId adalah format image-*, coba deteksi ekstensi dari pola
  if (imageId.includes('image-')) {
    // Coba cari di cache localStorage
    try {
      const cachedExtensions = localStorage.getItem('imageExtensionCache');
      if (cachedExtensions) {
        const extensionMap = JSON.parse(cachedExtensions);
        if (extensionMap[imageId]) {
          return `${apiUrl}/uploads/${size}/${imageId}${extensionMap[imageId]}`;
        }
      }
    } catch (error) {
      console.error('Error reading from imageExtensionCache:', error);
    }

    // Jika tidak ada di cache, gunakan .jpg sebagai default untuk image-*
    return `${apiUrl}/uploads/${imageId}`;
  }

  // Untuk UUID, coba semua ekstensi yang umum
  const extension = detectImageExtension(imageId);

  // Jika ekstensi ditemukan, gunakan
  if (extension) {
    return `${apiUrl}/uploads/${size}/${imageId}${extension}`;
  }

  // Jika tidak ada ekstensi yang ditemukan, coba tanpa ekstensi
  return `${apiUrl}/uploads/${size}/${imageId}`;
};

export default {
  getImageUrl,
  getProfileImageUrl,
  validateImage,
  sanitizeFileName,
  getResponsiveImageUrls,
  detectImageExtension,
  getImageUrlWithExtension
};