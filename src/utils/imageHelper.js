/**
 * Helper function untuk menangani URL gambar
 * @param {string} imagePath - Path gambar yang akan diproses
 * @param {number} version - Version untuk cache busting
 * @returns {string|null} URL lengkap gambar atau null jika tidak ada path
 */
export const getImageUrl = (imagePath, imageSource) => {
  console.log('getImageUrl input:', imagePath, 'source:', imageSource);

  // Tambahkan stack trace untuk debugging
  console.log('getImageUrl called from:', new Error().stack);

  // Jika ada informasi image_source, gunakan untuk menentukan path
  if (imageSource) {
    console.log('Using image_source for path determination:', imageSource);
  }

  // Jika tidak ada path, gunakan gambar default
  if (!imagePath) {
    console.log('No image path, returning default');
    // Gunakan URL lengkap untuk gambar default
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
    return `${apiUrl}/uploads/default-image.jpg`;
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
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
      return `${apiUrl}/uploads/default-image.jpg`;
    }
  }

  // Pastikan path adalah string
  const path = String(imagePath);
  console.log('Path as string:', path);

  // Penanganan khusus untuk default-image.jpg
  if (path === 'default-image.jpg' || path === '/default-image.jpg' ||
      path === 'uploads/default-image.jpg' || path === '/uploads/default-image.jpg') {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
    const fullUrl = `${apiUrl}/uploads/default-image.jpg`;
    console.log('Using default image URL:', fullUrl);
    return fullUrl;
  }

  // Penanganan khusus berdasarkan image_source
  if (imageSource === 'carousel') {
    // Untuk gambar dari carousel post
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

    // Jika path adalah URL lengkap, ekstrak nama file
    if (path.startsWith('http')) {
      try {
        const url = new URL(path);
        const pathParts = url.pathname.split('/');

        // Periksa apakah URL mengandung /carousel/carousel/
        if (url.pathname.includes('/carousel/carousel/')) {
          // Ekstrak nama file dari path
          const fileName = pathParts[pathParts.length - 1];
          // Hapus salah satu 'carousel/'
          const fullUrl = `${apiUrl}/uploads/carousel/${fileName}`;
          console.log('Fixed doubling carousel path in URL, returning:', fullUrl);
          return fullUrl;
        }

        const fileName = pathParts[pathParts.length - 1];
        const fullUrl = `${apiUrl}/uploads/carousel/${fileName}`;
        console.log('Extracted carousel image from URL:', fullUrl);
        return fullUrl;
      } catch (error) {
        console.error('Error parsing URL:', error);
      }
    }

    // Jika path sudah dimulai dengan uploads/, gunakan langsung
    if (path.startsWith('uploads/')) {
      const fullUrl = `${apiUrl}/${path}`;
      console.log('Carousel image with uploads/ prefix:', fullUrl);
      return fullUrl;
    }

    // Jika path dimulai dengan carousel/, tambahkan uploads/
    if (path.startsWith('carousel/')) {
      // Periksa apakah path mengandung doubling 'carousel/carousel/'
      if (path.startsWith('carousel/carousel/')) {
        // Hapus salah satu 'carousel/'
        const fixedPath = path.replace('carousel/carousel/', 'carousel/');
        const fullUrl = `${apiUrl}/uploads/${fixedPath}`;
        console.log('Fixed doubling carousel path in image_source handler:', fullUrl);
        return fullUrl;
      } else {
        const fullUrl = `${apiUrl}/uploads/${path}`;
        console.log('Carousel image with carousel/ prefix:', fullUrl);
        return fullUrl;
      }
    }

    // Jika tidak ada prefix, tambahkan uploads/carousel/
    const fullUrl = `${apiUrl}/uploads/carousel/${path}`;
    console.log('Carousel image without prefix:', fullUrl);
    return fullUrl;
  } else if (imageSource === 'regular') {
    // Untuk gambar dari regular post
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
    console.log('Processing regular post image with path:', path);

    // Jika path adalah URL lengkap, ekstrak nama file
    if (path.startsWith('http')) {
      try {
        const url = new URL(path);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];

        // Jika URL sudah mengandung /uploads/, gunakan langsung
        if (url.pathname.includes('/uploads/')) {
          console.log('URL already contains /uploads/, using as is:', path);
          return path;
        }

        const fullUrl = `${apiUrl}/uploads/${fileName}`;
        console.log('Extracted regular image from URL:', fullUrl);
        return fullUrl;
      } catch (error) {
        console.error('Error parsing URL:', error);
        // Fallback: gunakan URL asli
        return path;
      }
    }

    // Jika path sudah dimulai dengan uploads/, gunakan langsung
    if (path.startsWith('uploads/')) {
      // Jika path mengandung http://, ekstrak nama file
      if (path.includes('http://') || path.includes('https://')) {
        try {
          const parts = path.split('/');
          const fileName = parts[parts.length - 1];
          const fullUrl = `${apiUrl}/uploads/${fileName}`;
          console.log('Extracted filename from path with URL:', fullUrl);
          return fullUrl;
        } catch (error) {
          console.error('Error extracting filename:', error);
        }
      }

      const fullUrl = `${apiUrl}/${path}`;
      console.log('Regular post image with uploads/ prefix:', fullUrl);
      return fullUrl;
    }

    // Jika path dimulai dengan /, hapus
    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    // Jika tidak ada prefix, tambahkan uploads/
    const fullUrl = `${apiUrl}/uploads/${path}`;
    console.log('Regular post image without prefix:', fullUrl);
    return fullUrl;
  }

  // Penanganan khusus untuk path yang dimulai dengan carousel/ (fallback)
  if (path.startsWith('carousel/')) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

    // Periksa apakah path mengandung doubling 'carousel/carousel/'
    if (path.startsWith('carousel/carousel/')) {
      // Hapus salah satu 'carousel/'
      const fixedPath = path.replace('carousel/carousel/', 'carousel/');
      const fullUrl = `${apiUrl}/uploads/${fixedPath}`;
      console.log('Fixed doubling carousel path in fallback handler:', fullUrl);
      return fullUrl;
    } else {
      const fullUrl = `${apiUrl}/uploads/${path}`;
      console.log('Path starts with carousel/, returning:', fullUrl);
      return fullUrl;
    }
  }

  // Jika path sudah berupa URL lengkap
  if (path.startsWith('http')) {
    console.log('Path is already a full URL:', path);

    // Jika URL menggunakan localhost, ganti dengan URL produksi
    if (path.includes('localhost:5000')) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
      const newPath = path.replace(/http:\/\/localhost:5000/g, apiUrl);
      console.log('Replaced localhost URL with production URL:', newPath);
      return newPath;
    }

    // Periksa apakah ini adalah URL gambar profil yang salah (tanpa folder profiles/)
    if ((path.includes('/uploads/profile-') || path.includes('profile-')) && !path.includes('/uploads/profiles/')) {
      // Perbaiki URL dengan menambahkan folder profiles/
      let fixedUrl;
      if (path.includes('/uploads/profile-')) {
        fixedUrl = path.replace('/uploads/', '/uploads/profiles/');
      } else if (path.startsWith('profile-')) {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
        fixedUrl = `${apiUrl}/uploads/profiles/${path}`;
      } else {
        fixedUrl = path.replace('profile-', 'profiles/profile-');
      }
      console.log('Fixed profile URL by adding profiles folder:', fixedUrl);
      return fixedUrl;
    }

    return path;
  }

  // Ambil base URL dari environment variable
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
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

  // Jika path dimulai dengan 'carousel/'
  if (path.startsWith('carousel/')) {
    // Cek apakah path mengandung doubling 'carousel/carousel/'
    if (path.startsWith('carousel/carousel/')) {
      // Hapus salah satu 'carousel/'
      const fixedPath = path.replace('carousel/carousel/', 'carousel/');
      const fullUrl = `${apiUrl}/uploads/${fixedPath}`;
      console.log('Fixed doubling carousel path in general handler, returning:', fullUrl);
      return fullUrl;
    } else {
      // Path normal, tambahkan uploads/
      const fullUrl = `${apiUrl}/uploads/${path}`;
      console.log('Path starts with carousel/, returning:', fullUrl);
      return fullUrl;
    }
  }

  // Penanganan khusus untuk gambar post reguler
  if (path.includes('featured_image') || path.includes('post-image')) {
    // Jika path sudah mengandung /uploads/, jangan tambahkan lagi
    if (path.includes('/uploads/')) {
      console.log('Post image path already contains /uploads/, returning as is');
      return path;
    }

    // Gunakan path yang benar untuk gambar post
    const postImageUrl = `${apiUrl}/uploads/${path}`;
    console.log('Using post image URL format:', postImageUrl);
    return postImageUrl;
  }

  // Penanganan khusus untuk gambar post yang tidak memiliki prefix uploads/
  // Ini untuk menangani kasus di mana image_url disimpan tanpa prefix uploads/
  if (path.includes('post-') || path.includes('featured-') ||
      path.match(/\d{13}-\d+\.[a-z]+$/) || // Format timestamp-number.ext
      path.match(/\d{13}-[a-f0-9]+\.[a-z]+$/) || // Format timestamp-hash.ext
      path.match(/\d{10,13}[_-][a-zA-Z0-9]+\.[a-z]+$/) || // Format timestamp_random.ext
      path.match(/^[0-9]+\.[a-z]+$/) || // Format number.ext
      path.endsWith('.jpg')) { // Semua file jpg
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
    const fullUrl = `${apiUrl}/uploads/${path}`;
    console.log('Using post image URL format for post image:', fullUrl);
    return fullUrl;
  }

  // Untuk kasus lainnya, coba beberapa format umum
  // Coba dengan /uploads/profiles/ untuk gambar profil
  if (path.includes('profile-')) {
    // Jika path sudah mengandung /uploads/profiles/, jangan tambahkan lagi
    if (path.includes('/uploads/profiles/')) {
      console.log('Profile path already contains /uploads/profiles/, returning as is');
      return path;
    }

    // Jika path mengandung /uploads/ tapi tidak /profiles/, tambahkan /profiles/
    if (path.includes('/uploads/')) {
      const fixedUrl = path.replace('/uploads/', '/uploads/profiles/');
      console.log('Fixed profile URL by adding profiles folder:', fixedUrl);
      return fixedUrl;
    }

    // Gunakan path yang benar dengan folder profiles/
    const profileUrl = `${apiUrl}/uploads/profiles/${path}`;
    console.log('Using profile URL format with profiles folder:', profileUrl);
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