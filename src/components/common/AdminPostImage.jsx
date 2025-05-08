import React, { useCallback, useEffect } from 'react';
import ResponsivePostImage from './ResponsivePostImage';
import { fixImageUrl } from '../../utils/imageUrlHelper';

/**
 * Komponen AdminPostImage yang dioptimalkan untuk halaman admin posts
 * Menggunakan ResponsivePostImage untuk performa yang lebih baik
 */
const AdminPostImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '180px',
  height = '140px',
  onError,
  fallbackSrc = '/placeholder-image.jpg',
  index = 0
}) => {
  // Gunakan fungsi fixImageUrl dari imageUrlHelper.js
  // Ini sudah diimpor di bagian atas file

  // Inisialisasi database gambar jika belum ada
  useEffect(() => {
    if (!window.imageDatabase && typeof window !== 'undefined') {
      // Coba ambil dari localStorage
      try {
        const cachedData = localStorage.getItem('imageDatabase');
        if (cachedData) {
          window.imageDatabase = JSON.parse(cachedData);
        }
      } catch (error) {
        console.error('Error loading image database from localStorage:', error);
      }
    }
  }, []);

  return (
    <ResponsivePostImage
      src={fixImageUrl(src)}
      alt={alt}
      className={`admin-post-image-container ${className}`}
      style={style}
      width={width}
      height={height}
      onError={onError}
      size="thumbnail" // Gunakan ukuran thumbnail untuk performa yang lebih baik
      priority={index < 5} // Prioritaskan 5 gambar pertama
      loading={index < 5 ? "eager" : "lazy"} // Lazy loading untuk gambar yang tidak terlihat
      fallbackSrc="/placeholder-image.jpg"
    />
  );
};

export default AdminPostImage;
