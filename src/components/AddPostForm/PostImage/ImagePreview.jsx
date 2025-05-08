import React, { useState, useEffect, useCallback } from 'react';
import ResponsivePostImage from '../../common/ResponsivePostImage';
import '../../../styles/lazyImage.css';

const ImagePreview = ({ src, onError, isUploading, onRemove }) => {
  const [hasError, setHasError] = useState(false);

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
          console.log('ImagePreview: Loaded image database from localStorage:', window.imageDatabase.length, 'images');
        }
      } catch (error) {
        console.error('Error loading image database from localStorage:', error);
      }
    }
  }, []);

  // Tidak perlu ekstrak informasi gambar karena kita menggunakan ResponsivePostImage

  // Reset state saat src berubah
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Handler untuk error
  const handleImageError = () => {
    setHasError(true);
    if (onError) {
      onError(new Error('Failed to load image'));
    }
  };

  return (
    <div className="writer-image-preview">
      {/* Gunakan ResponsivePostImage untuk performa yang lebih baik */}
      <ResponsivePostImage
        src={fixImageUrl(src)}
        alt="Preview"
        height="200px"
        width="100%"
        className={`writer-preview-image ${isUploading ? 'uploading' : ''}`}
        onError={handleImageError}
        size="thumbnail" // Gunakan ukuran thumbnail untuk performa yang lebih baik
        priority={true} // Prioritaskan loading gambar preview
        loading="eager"
      />
      {!hasError && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (window.confirm('Apakah Anda yakin ingin menghapus gambar ini?')) {
              onRemove();
            }
          }}
          className="writer-remove-image-btn"
          disabled={isUploading}
        >
          Hapus Gambar
        </button>
      )}
    </div>
  );
};

export default ImagePreview;