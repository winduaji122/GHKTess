// Import getImageUrl dari imageHelper
import { getImageUrl } from './imageHelper';

/**
 * Fungsi untuk mendapatkan URL gambar responsif untuk berbagai ukuran
 * @param {string|object} imagePath - Path gambar yang akan diproses
 * @param {string} size - Ukuran gambar yang diinginkan ('thumbnail', 'medium', 'original', 'auto')
 * @returns {object|null} Objek berisi URL untuk berbagai ukuran gambar
 */
export const getResponsiveImageUrls = (imagePath, size = 'auto') => {
  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://nodejs-production-0c33.up.railway.app';

  // Jika tidak ada path, return null
  if (!imagePath) {
    return null;
  }

  // Jika path adalah objek, coba ambil properti path
  if (typeof imagePath === 'object' && imagePath !== null) {
    // Coba berbagai properti yang mungkin berisi path
    const possiblePaths = ['path', 'filename', 'url', 'src', 'id'];
    for (const prop of possiblePaths) {
      if (imagePath[prop] && typeof imagePath[prop] === 'string') {
        imagePath = imagePath[prop];
        break;
      }
    }

    // Jika masih objek, return null
    if (typeof imagePath === 'object') {
      return null;
    }
  }

  // Pastikan path adalah string
  const path = String(imagePath);

  // Jika path adalah default-image.jpg, return null
  if (path === 'default-image.jpg' || path === '/default-image.jpg' ||
      path === 'uploads/default-image.jpg' || path === '/uploads/default-image.jpg') {
    return null;
  }

  // Jika path sudah berupa URL lengkap
  if (path.startsWith('http')) {
    // Jika URL menggunakan localhost, ganti dengan URL produksi
    if (path.includes('localhost:5000')) {
      const fixedUrl = path.replace(/http:\/\/localhost:5000/g, apiUrl);
      return {
        original: fixedUrl,
        medium: fixedUrl,
        thumbnail: fixedUrl,
        preferred: fixedUrl,
        srcSet: null,
        sizes: null
      };
    }

    // Jika URL sudah menggunakan domain produksi, gunakan langsung
    return {
      original: path,
      medium: path,
      thumbnail: path,
      preferred: path,
      srcSet: null,
      sizes: null
    };
  }

  // Cek apakah ini adalah UUID (format baru)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(path)) {
    // Ini adalah ID gambar, buat URL untuk setiap ukuran
    const originalUrl = `${apiUrl}/uploads/original/${path}.jpg`;
    const mediumUrl = `${apiUrl}/uploads/medium/${path}.jpg`;
    const thumbnailUrl = `${apiUrl}/uploads/thumbnail/${path}.jpg`;

    // Buat srcSet untuk gambar responsif
    const srcSet = `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`;

    // Tentukan preferred URL berdasarkan parameter size
    let preferredUrl;
    if (size === 'thumbnail') {
      preferredUrl = thumbnailUrl;
    } else if (size === 'medium') {
      preferredUrl = mediumUrl;
    } else if (size === 'original') {
      preferredUrl = originalUrl;
    } else {
      // Auto: default ke medium
      preferredUrl = mediumUrl;
    }

    return {
      original: originalUrl,
      medium: mediumUrl,
      thumbnail: thumbnailUrl,
      preferred: preferredUrl,
      srcSet,
      sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
    };
  }

  // Jika path dimulai dengan 'image-', ini adalah format lama
  if (path.startsWith('image-')) {
    // Jika path sudah mengandung ekstensi file, gunakan langsung
    const hasExtension = path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const imagePath = hasExtension ? path : `${path}.jpg`;

    const imageUrl = `${apiUrl}/uploads/${imagePath}`;

    return {
      original: imageUrl,
      medium: imageUrl,
      thumbnail: imageUrl,
      preferred: imageUrl,
      srcSet: null,
      sizes: null
    };
  }

  // Jika path dimulai dengan '/uploads/' atau 'uploads/'
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    const imageUrl = path.startsWith('/') ? `${apiUrl}${path}` : `${apiUrl}/${path}`;

    return {
      original: imageUrl,
      medium: imageUrl,
      thumbnail: imageUrl,
      preferred: imageUrl,
      srcSet: null,
      sizes: null
    };
  }

  // Default: gunakan getImageUrl untuk mendapatkan URL
  const imageUrl = getImageUrl(path, null, size);

  return {
    original: imageUrl,
    medium: imageUrl,
    thumbnail: imageUrl,
    preferred: imageUrl,
    srcSet: null,
    sizes: null
  };
};

export default getResponsiveImageUrls;
