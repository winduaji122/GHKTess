/**
 * Fungsi untuk mendapatkan URL gambar profil yang valid
 * @param {string} profilePath - Path gambar profil
 * @returns {string} URL lengkap gambar profil
 */
export const getValidProfileUrl = (profilePath) => {
  if (!profilePath) return null;

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
  let result;

  // Jika URL Google, gunakan langsung
  if (profilePath.includes('googleusercontent.com') || profilePath.includes('lh3.google')) {
    if (profilePath.startsWith('http')) {
      result = profilePath;
      console.log('Google avatar URL with http:', result);
      return result;
    } else {
      result = `https://${profilePath}`;
      console.log('Google avatar URL without http:', result);
      return result;
    }
  }

  // Jika sudah URL lengkap
  if (profilePath.startsWith('http')) {
    // Jika URL menggunakan localhost, ganti dengan URL produksi
    if (profilePath.includes('localhost:5000')) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
      let newPath = profilePath.replace(/http:\/\/localhost:5000/g, apiUrl);

      // Jika URL mengandung /uploads/ tapi tidak /profiles/ dan mengandung profile-
      if (newPath.includes('/uploads/') && !newPath.includes('/profiles/') && newPath.includes('profile-')) {
        newPath = newPath.replace('/uploads/', '/uploads/profiles/');
        console.log('Fixed localhost URL path with profiles folder:', newPath);
        return newPath;
      }

      console.log('Replaced localhost URL with production URL:', newPath);
      return newPath;
    }

    // Jika URL sudah benar (mengandung /uploads/profiles/)
    if (profilePath.includes('/uploads/profiles/')) {
      result = profilePath;
      console.log('Full URL with correct path:', result);
      return result;
    }

    // Jika URL mengandung /uploads/ tapi tidak /profiles/ dan mengandung profile-
    if (profilePath.includes('/uploads/') && !profilePath.includes('/profiles/') && profilePath.includes('profile-')) {
      result = profilePath.replace('/uploads/', '/uploads/profiles/');
      console.log('Fixed URL path:', result);
      return result;
    }

    result = profilePath;
    console.log('Using original URL:', result);
    return result;
  }

  // Jika path dimulai dengan /uploads/profiles/
  if (profilePath.startsWith('/uploads/profiles/')) {
    result = `${apiUrl}${profilePath}`;
    console.log('Path starts with /uploads/profiles/:', result);
    return result;
  }

  // Jika path dimulai dengan uploads/profiles/
  if (profilePath.startsWith('uploads/profiles/')) {
    result = `${apiUrl}/${profilePath}`;
    console.log('Path starts with uploads/profiles/:', result);
    return result;
  }

  // Jika path hanya berisi nama file (profile-xxx.jpg)
  if (profilePath.startsWith('profile-')) {
    result = `${apiUrl}/uploads/profiles/${profilePath}`;
    console.log('Path contains only filename:', result);
    return result;
  }

  // Jika path dimulai dengan /uploads/ tapi tidak /profiles/
  if (profilePath.startsWith('/uploads/') && profilePath.includes('profile-')) {
    result = `${apiUrl}${profilePath.replace('/uploads/', '/uploads/profiles/')}`;
    console.log('Path starts with /uploads/ but missing /profiles/:', result);
    return result;
  }

  // Jika path dimulai dengan uploads/ tapi tidak profiles/
  if (profilePath.startsWith('uploads/') && profilePath.includes('profile-')) {
    result = `${apiUrl}/${profilePath.replace('uploads/', 'uploads/profiles/')}`;
    console.log('Path starts with uploads/ but missing profiles/:', result);
    return result;
  }

  // Default case: tambahkan /uploads/profiles/
  result = `${apiUrl}/uploads/profiles/${profilePath}`;
  console.log('Using default case:', result);
  return result;
};
