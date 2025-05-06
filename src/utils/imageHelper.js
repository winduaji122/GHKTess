/**
 * Helper function untuk menangani URL gambar
 * @param {string} imagePath - Path gambar yang akan diproses
 * @param {string} imageSource - Sumber gambar (optional: 'carousel', 'regular', dll)
 * @returns {string|null} URL lengkap gambar atau null jika tidak ada path
 */
export const getImageUrl = (imagePath, imageSource) => {
  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

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
    return path;
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

  /**
   * Fungsi khusus untuk mendapatkan URL gambar profil
   * @param {string} profilePath - Path gambar profil
   * @returns {string} URL lengkap gambar profil
   */
  export const getProfileImageUrl = (profilePath) => {
    if (!profilePath) return null;

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
    console.log('Getting profile image URL for:', profilePath);

    // Deteksi URL Google (dengan atau tanpa http/https)
    if (profilePath.includes('googleusercontent.com') || profilePath.includes('lh3.google')) {
      // Jika sudah memiliki http/https, gunakan langsung
      if (profilePath.startsWith('http')) {
        console.log('Detected Google avatar URL with http, using directly:', profilePath);
        return profilePath;
      } else {
        // Jika tidak memiliki http/https, tambahkan https://
        console.log('Detected Google avatar URL without http prefix, adding https://');
        return `https://${profilePath}`;
      }
    }

    // Jika sudah URL lengkap
    if (profilePath.startsWith('http')) {
      // Jika ini adalah URL avatar lain dari pihak ketiga (seperti gravatar), gunakan langsung
      if (profilePath.includes('gravatar.com') || profilePath.includes('avatar') || profilePath.includes('.jpg') || profilePath.includes('.png')) {
        console.log('Detected third-party avatar URL, using directly:', profilePath);
        return profilePath;
      }

      // Periksa apakah URL sudah benar (mengandung /profiles/)
      if (profilePath.includes('/uploads/profiles/')) {
        return profilePath;
      }

      // Jika URL mengandung /uploads/ tapi tidak /profiles/ dan mengandung profile-
      if (profilePath.includes('/uploads/') && !profilePath.includes('/profiles/') && profilePath.includes('profile-')) {
        console.log('Fixing profile URL by adding profiles folder');
        return profilePath.replace('/uploads/', '/uploads/profiles/');
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
      console.log('Profile path contains only filename, adding /uploads/profiles/ prefix');
      return `${apiUrl}/uploads/profiles/${profilePath}`;
    }

    // Jika path dimulai dengan /uploads/ tapi tidak /profiles/ dan mengandung profile-
    if (profilePath.startsWith('/uploads/') && !profilePath.includes('/profiles/') && profilePath.includes('profile-')) {
      console.log('Profile path starts with /uploads/ but missing /profiles/, fixing path');
      return `${apiUrl}${profilePath.replace('/uploads/', '/uploads/profiles/')}`;
    }

    // Jika path dimulai dengan uploads/ tapi tidak profiles/ dan mengandung profile-
    if (profilePath.startsWith('uploads/') && !profilePath.includes('profiles/') && profilePath.includes('profile-')) {
      console.log('Profile path starts with uploads/ but missing profiles/, fixing path');
      return `${apiUrl}/${profilePath.replace('uploads/', 'uploads/profiles/')}`;
    }

    // Default case: tambahkan /uploads/profiles/
    console.log('Using default case, adding /uploads/profiles/ prefix');
    return `${apiUrl}/uploads/profiles/${profilePath}`;
  };

  export default {
    getImageUrl,
    getProfileImageUrl,
    validateImage,
    sanitizeFileName
  };