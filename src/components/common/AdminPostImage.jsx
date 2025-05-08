import React, { useCallback, useEffect } from 'react';
import SimpleResponsivePostImage from './SimpleResponsivePostImage';

/**
 * Komponen AdminPostImage yang dioptimalkan untuk halaman admin posts
 * Menggunakan SimpleResponsivePostImage untuk performa yang lebih baik
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
  // Fungsi untuk memperbaiki URL gambar dengan format lama
  const fixImageUrl = useCallback((imageUrl) => {
    if (!imageUrl) return null;

    // Jika URL mengandung 'image-' (format lama), coba konversi ke UUID
    if (typeof imageUrl === 'string' && imageUrl.includes('image-')) {
      // Coba cari di database gambar berdasarkan nama file
      if (window.imageDatabase && Array.isArray(window.imageDatabase)) {
        const matchingImage = window.imageDatabase.find(img =>
          img.original_path.includes(imageUrl.split('/').pop())
        );

        if (matchingImage) {
          console.log('Found matching image in database:', matchingImage.id);
          return matchingImage.id;
        }
      }

      // Jika tidak ditemukan di database, gunakan URL asli
      return imageUrl;
    }

    return imageUrl;
  }, []);

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
    <SimpleResponsivePostImage
      src={fixImageUrl(src)}
      alt={alt}
      className={`admin-post-image-container ${className}`}
      style={style}
      width={width}
      height={height}
      onError={onError}
      size="thumbnail" // Gunakan ukuran thumbnail untuk performa yang lebih baik
      priority={index < 5} // Prioritaskan 5 gambar pertama
      fallbackSrc="/placeholder-image.jpg"
    />
  );
};

export default AdminPostImage;
