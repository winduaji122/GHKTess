/**
 * Helper function untuk menangani URL gambar
 * @param {string} imagePath - Path gambar yang akan diproses
 * @param {number} version - Version untuk cache busting
 * @returns {string|null} URL lengkap gambar atau null jika tidak ada path
 */
export const getImageUrl = (imagePath) => {
  console.log('getImageUrl input:', imagePath);

  // Jika tidak ada path, gunakan gambar default
  if (!imagePath) {
    console.log('No image path, returning default');
    return '/default-fallback-image.jpg';
  }

  // Jika path adalah objek, coba ambil properti path
  if (typeof imagePath === 'object' && imagePath !== null) {
    console.warn('Image path is an object:', imagePath);

    // Coba berbagai properti yang mungkin berisi path
    const possiblePaths = ['path', 'filename', 'url', 'src'];
    for (const prop of possiblePaths) {
      if (imagePath[prop] && typeof imagePath[prop] === 'string') {
        console.log(`Using object property ${prop}:`, imagePath[prop]);
        imagePath = imagePath[prop];
        break;
      }
    }

    // Jika masih objek, gunakan default
    if (typeof imagePath === 'object') {
      console.error('Could not extract path from object, using default');
      return '/default-fallback-image.jpg';
    }
  }

  // Pastikan path adalah string
  const path = String(imagePath);
  console.log('Path as string:', path);

  // Jika path sudah berupa URL lengkap
  if (path.startsWith('http')) {
    console.log('Path is already a full URL, returning as is');
    return path;
  }

  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_URL || 'https://ghk-tess-backend.vercel.app';
  console.log('API URL:', apiUrl);

  // Jika path dimulai dengan '/uploads/'
  if (path.startsWith('/uploads/')) {
    const fullUrl = `${apiUrl}${path}`;
    console.log('Path starts with /uploads/, returning:', fullUrl);
    return fullUrl;
  }

  // Jika path dimulai dengan 'uploads/'
  if (path.startsWith('uploads/')) {
    const fullUrl = `${apiUrl}/${path}`;
    console.log('Path starts with uploads/, returning:', fullUrl);
    return fullUrl;
  }

  // Jika path dimulai dengan '/storage/'
  if (path.startsWith('/storage/')) {
    const fullUrl = `${apiUrl}${path}`;
    console.log('Path starts with /storage/, returning:', fullUrl);
    return fullUrl;
  }

  // Jika path dimulai dengan 'storage/'
  if (path.startsWith('storage/')) {
    const fullUrl = `${apiUrl}/${path}`;
    console.log('Path starts with storage/, returning:', fullUrl);
    return fullUrl;
  }

  // Untuk kasus lainnya, coba beberapa format umum
  // Coba dengan /uploads/profiles/ untuk gambar profil
  if (path.includes('profile-')) {
    const profileUrl = `${apiUrl}/uploads/profiles/${path}`;
    console.log('Using profile URL format:', profileUrl);
    return profileUrl;
  }

  // Coba dengan /uploads/ untuk gambar umum
  const uploadsUrl = `${apiUrl}/uploads/${path}`;
  console.log('Using uploads URL format:', uploadsUrl);
  return uploadsUrl;
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

      // Debug log
      console.log('Validating file:', {
        file,
        type: file?.type,
        size: file?.size,
        name: file?.name
      });

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
          validation.errors.push(`Format file ${fileType} tidak didukung. Gunakan JPEG/JPG, PNG, GIF, atau WEBP`);
        }
      }

      // Validasi ukuran
      if (file.size > maxSize) {
        validation.isValid = false;
        validation.errors.push(`Ukuran file (${(file.size/1024/1024).toFixed(2)}MB) terlalu besar. Maksimal 5MB`);
      }

      // Debug log hasil validasi
      console.log('Validation result:', validation);

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

  export default {
    getImageUrl,
    validateImage,
    sanitizeFileName
  };