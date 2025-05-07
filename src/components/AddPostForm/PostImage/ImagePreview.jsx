import React, { useState, useEffect } from 'react';
import ResponsiveImage from '../../common/ResponsiveImage';
import '../../../styles/lazyImage.css';
import { getImageUrl, getResponsiveImageUrls } from '../../../utils/imageHelper';

const ImagePreview = ({ src, onError, isUploading, onRemove, thumbnailSrc, mediumSrc, srcSet, sizes }) => {
  const [hasError, setHasError] = useState(false);

  // Ekstrak informasi gambar dari src
  const extractImageInfo = () => {
    // Jika src adalah objek dengan properti url, thumbnailUrl, dll.
    if (typeof src === 'object' && src !== null) {
      return {
        main: src.url || src.path,
        thumbnail: src.thumbnailUrl,
        medium: src.mediumUrl,
        srcSet: src.srcSet,
        sizes: src.sizes
      };
    }

    // Cek apakah src adalah UUID (format baru)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof src === 'string' && uuidPattern.test(src)) {
      // Gunakan getResponsiveImageUrls untuk mendapatkan URL gambar dengan berbagai ukuran
      return getResponsiveImageUrls(src);
    }

    // Jika src adalah string biasa
    return {
      main: getImageUrl(src),
      thumbnail: thumbnailSrc || null,
      medium: mediumSrc || null,
      srcSet,
      sizes
    };
  };

  const imageInfo = extractImageInfo();

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
      {/* Gunakan ResponsiveImage untuk performa yang lebih baik */}
      <ResponsiveImage
        src={imageInfo.main}
        thumbnailSrc={imageInfo.thumbnail}
        mediumSrc={imageInfo.medium}
        srcSet={imageInfo.srcSet}
        sizes={imageInfo.sizes}
        alt="Preview"
        height="200px"
        width="100%"
        className={`writer-preview-image ${isUploading ? 'uploading' : ''}`}
        onError={handleImageError}
        fallbackSrc="/default-fallback-image.jpg"
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