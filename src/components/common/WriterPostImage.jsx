import React from 'react';
import ResponsiveImage from './ResponsiveImage';

/**
 * Komponen WriterPostImage yang dioptimalkan untuk halaman writer posts
 * Menggunakan ResponsiveImage untuk performa yang lebih baik
 */
const WriterPostImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '180px',
  height = '140px',
  onError,
  fallbackSrc = '/placeholder-image.jpg'
}) => {
  // Perbaiki URL localhost jika ada
  const fixImageUrl = (url) => {
    if (!url) return fallbackSrc;

    if (url.includes('localhost:5000')) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
      return url.replace('http://localhost:5000', apiUrl);
    }

    return url;
  };

  const fixedSrc = fixImageUrl(src);

  return (
    <ResponsiveImage
      src={fixedSrc}
      alt={alt}
      className={`writer-post-image-container ${className}`}
      style={style}
      width={width}
      height={height}
      onError={onError}
      fallbackSrc={fallbackSrc}
      loading="lazy"
    />
  );
};

export default WriterPostImage;
