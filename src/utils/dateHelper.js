/**
 * Format tanggal ke format yang lebih mudah dibaca
 * @param {string|Date} date - Tanggal yang akan diformat
 * @returns {string} Tanggal yang sudah diformat
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  // Cek apakah tanggal valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // Format tanggal dalam bahasa Indonesia
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  try {
    return dateObj.toLocaleDateString('id-ID', options);
  } catch (error) {
    // Fallback jika locale tidak didukung
    return dateObj.toLocaleDateString('en-US', options);
  }
};

/**
 * Mendapatkan waktu relatif (misalnya "5 menit yang lalu")
 * @param {string|Date} date - Tanggal yang akan diformat
 * @returns {string} Waktu relatif
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const now = new Date();
  
  // Cek apakah tanggal valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Baru saja';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} jam yang lalu`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} hari yang lalu`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} bulan yang lalu`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} tahun yang lalu`;
};
