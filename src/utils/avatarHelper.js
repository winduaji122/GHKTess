/**
 * Mendapatkan inisial dari nama untuk avatar
 * @param {string} name - Nama pengguna
 * @returns {string} Inisial (huruf pertama kapital)
 */
export const getInitials = (name) => {
  if (!name) return '?';
  
  // Pastikan selalu menggunakan huruf kapital
  return name.charAt(0).toUpperCase();
};

/**
 * Mendapatkan warna latar belakang berdasarkan nama
 * @param {string} name - Nama pengguna
 * @returns {string} Warna latar belakang dalam format hex
 */
export const getAvatarColor = (name) => {
  if (!name) return '#4a90e2';
  
  // Daftar warna yang menarik
  const colors = [
    '#4a90e2', // Biru
    '#50c878', // Hijau
    '#f39c12', // Oranye
    '#e74c3c', // Merah
    '#9b59b6', // Ungu
    '#3498db', // Biru muda
    '#2ecc71', // Hijau muda
    '#e67e22', // Oranye tua
    '#c0392b', // Merah tua
    '#8e44ad'  // Ungu tua
  ];
  
  // Gunakan karakter pertama sebagai indeks
  const charCode = name.charCodeAt(0);
  const index = charCode % colors.length;
  
  return colors[index];
};
