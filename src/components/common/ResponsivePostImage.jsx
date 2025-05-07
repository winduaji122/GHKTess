import React, { useState, useEffect, useCallback } from 'react';
import ResponsiveImage from './ResponsiveImage';
import { getImageUrl } from '../../utils/imageHelper';

/**
 * Komponen ResponsivePostImage khusus untuk menampilkan gambar post
 * dengan dukungan untuk berbagai ukuran dan format
 */
const ResponsivePostImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '100%',
  height = '200px',
  objectFit = 'cover',
  priority = false,
  onError,
  fallbackSrc = '/placeholder-image.jpg'
}) => {
  const [imageInfo, setImageInfo] = useState({
    main: null,
    thumbnail: null,
    medium: null,
    srcSet: null,
    sizes: null
  });

  // Fungsi untuk mengekstrak informasi gambar dari URL
  const extractImageInfo = useCallback((imagePath) => {
    if (!imagePath) {
      return {
        main: fallbackSrc,
        thumbnail: null,
        medium: null,
        srcSet: null,
        sizes: null
      };
    }

    // Jika imagePath adalah objek dengan properti dari API baru
    if (typeof imagePath === 'object' && imagePath !== null) {
      if (imagePath.url || imagePath.thumbnailUrl || imagePath.mediumUrl) {
        return {
          main: imagePath.url || imagePath.path,
          thumbnail: imagePath.thumbnailUrl,
          medium: imagePath.mediumUrl,
          srcSet: imagePath.srcSet,
          sizes: imagePath.sizes || "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika hanya ada path
      if (imagePath.path) {
        const url = getImageUrl(imagePath.path);
        return {
          main: url,
          thumbnail: null,
          medium: null,
          srcSet: null,
          sizes: null
        };
      }
    }

    // Jika imagePath adalah string
    if (typeof imagePath === 'string') {
      // Cek apakah ini adalah UUID (format baru)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(imagePath)) {
        // Ini adalah ID gambar, gunakan endpoint API baru
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
        const originalUrl = `${apiUrl}/api/images/${imagePath}/original`;
        const mediumUrl = `${apiUrl}/api/images/${imagePath}/medium`;
        const thumbnailUrl = `${apiUrl}/api/images/${imagePath}/thumbnail`;

        return {
          main: originalUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      const url = getImageUrl(imagePath);

      // Coba buat srcSet berdasarkan URL
      let thumbnailUrl = null;
      let mediumUrl = null;
      let srcSet = null;

      // Jika URL mengandung /uploads/original/
      if (url.includes('/uploads/original/')) {
        thumbnailUrl = url.replace('/uploads/original/', '/uploads/thumbnail/');
        mediumUrl = url.replace('/uploads/original/', '/uploads/medium/');

        // Buat srcSet jika URL berhasil diubah
        if (thumbnailUrl !== url && mediumUrl !== url) {
          srcSet = `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${url} 1200w`;
        }
      }

      return {
        main: url,
        thumbnail: thumbnailUrl,
        medium: mediumUrl,
        srcSet,
        sizes: srcSet ? "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px" : null
      };
    }

    return {
      main: fallbackSrc,
      thumbnail: null,
      medium: null,
      srcSet: null,
      sizes: null
    };
  }, [fallbackSrc]);

  // Update imageInfo saat src berubah
  useEffect(() => {
    setImageInfo(extractImageInfo(src));
  }, [src, extractImageInfo]);

  return (
    <ResponsiveImage
      src={imageInfo.main}
      thumbnailSrc={imageInfo.thumbnail}
      mediumSrc={imageInfo.medium}
      srcSet={imageInfo.srcSet}
      sizes={imageInfo.sizes}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      onError={onError}
      fallbackSrc={fallbackSrc}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
};

export default ResponsivePostImage;
