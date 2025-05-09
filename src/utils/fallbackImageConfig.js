/**
 * Konfigurasi untuk fallback image yang konsisten di seluruh aplikasi
 */

// URL default untuk fallback image
export const DEFAULT_FALLBACK_IMAGE = '/default-fallback-image.jpg';

// Fungsi untuk mendapatkan URL fallback image berdasarkan konteks
export const getFallbackImage = (context = 'default') => {
  switch (context) {
    case 'post':
      return '/default-fallback-image.jpg';
    case 'profile':
      return '/default-fallback-image.jpg';
    case 'carousel':
      return '/default-fallback-image.jpg';
    default:
      return DEFAULT_FALLBACK_IMAGE;
  }
};

// Fungsi untuk memeriksa apakah URL adalah URL gambar
export const isImageUrl = (url) => {
  if (!url) return false;
  return Boolean(url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
};

// Fungsi untuk mendapatkan komponen fallback berdasarkan konteks
export const getFallbackComponent = (context = 'default', props = {}) => {
  const { width, height, className, style } = props;

  // Style default untuk fallback component
  const defaultStyle = {
    width: width || '100%',
    height: height || '200px',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontSize: '12px',
    padding: '8px',
    textAlign: 'center',
    ...style
  };

  return (
    <div className={`fallback-image ${className || ''}`} style={defaultStyle}>
      {context === 'profile' ? 'Foto profil tidak tersedia' : 'Gambar tidak tersedia'}
    </div>
  );
};

export default {
  DEFAULT_FALLBACK_IMAGE,
  getFallbackImage,
  isImageUrl,
  getFallbackComponent
};
