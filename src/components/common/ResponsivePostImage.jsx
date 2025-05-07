import React, { useState, useEffect, useCallback } from 'react';
import ResponsiveImage from './ResponsiveImage';
import { getImageUrl } from '../../utils/imageHelper';

/**
 * Komponen ResponsivePostImage khusus untuk menampilkan gambar post
 * dengan dukungan untuk berbagai ukuran dan format
 * @param {string} size - Ukuran gambar yang akan digunakan: 'thumbnail', 'medium', atau 'original'
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
  fallbackSrc = '/placeholder-image.jpg',
  size = 'auto' // 'auto', 'thumbnail', 'medium', atau 'original'
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
        // Tentukan main berdasarkan parameter size
        let mainUrl;
        if (size === 'thumbnail' && imagePath.thumbnailUrl) {
          mainUrl = imagePath.thumbnailUrl;
        } else if (size === 'medium' && imagePath.mediumUrl) {
          mainUrl = imagePath.mediumUrl;
        } else if (size === 'original' && imagePath.url) {
          mainUrl = imagePath.url;
        } else {
          // Default atau 'auto': gunakan ukuran yang sesuai berdasarkan dimensi komponen
          if (parseInt(height) <= 200 && imagePath.thumbnailUrl) {
            mainUrl = imagePath.thumbnailUrl;
          } else if (parseInt(height) <= 640 && imagePath.mediumUrl) {
            mainUrl = imagePath.mediumUrl;
          } else {
            mainUrl = imagePath.url || imagePath.path;
          }
        }

        return {
          main: mainUrl,
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
        // Ini adalah ID gambar, gunakan URL API untuk mengakses gambar
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

        // Gunakan API endpoint untuk mengakses gambar
        const originalUrl = `${apiUrl}/api/images/${imagePath}/original`;
        const mediumUrl = `${apiUrl}/api/images/${imagePath}/medium`;
        const thumbnailUrl = `${apiUrl}/api/images/${imagePath}/thumbnail`;

        // Alternatif: Gunakan path langsung ke file jika API tidak tersedia
        const directOriginalUrl = `${apiUrl}/uploads/original/${imagePath}`;
        const directMediumUrl = `${apiUrl}/uploads/medium/${imagePath}`;
        const directThumbnailUrl = `${apiUrl}/uploads/thumbnail/${imagePath}`;

        // Tentukan main URL berdasarkan parameter size
        let mainUrl;
        let directMainUrl;

        if (size === 'thumbnail') {
          mainUrl = thumbnailUrl;
          directMainUrl = directThumbnailUrl;
        } else if (size === 'medium') {
          mainUrl = mediumUrl;
          directMainUrl = directMediumUrl;
        } else if (size === 'original') {
          mainUrl = originalUrl;
          directMainUrl = directOriginalUrl;
        } else {
          // Mode auto: pilih berdasarkan dimensi komponen
          if (parseInt(height) <= 200) {
            mainUrl = thumbnailUrl;
            directMainUrl = directThumbnailUrl;
          } else if (parseInt(height) <= 400) {
            mainUrl = mediumUrl;
            directMainUrl = directMediumUrl;
          } else {
            mainUrl = originalUrl;
            directMainUrl = directOriginalUrl;
          }
        }

        return {
          main: mainUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px",
          // Tambahkan URL langsung sebagai fallback
          directMain: directMainUrl,
          directThumbnail: directThumbnailUrl,
          directMedium: directMediumUrl
        };
      }

      // Gunakan getImageUrl dengan parameter size
      const url = getImageUrl(imagePath, null, size);

      // Coba buat srcSet berdasarkan URL
      let thumbnailUrl = null;
      let mediumUrl = null;
      let originalUrl = null;
      let srcSet = null;
      let mainUrl = url; // Default ke URL yang dikembalikan oleh getImageUrl

      // Jika URL mengandung /uploads/original/
      if (url.includes('/uploads/original/')) {
        thumbnailUrl = url.replace('/uploads/original/', '/uploads/thumbnail/');
        mediumUrl = url.replace('/uploads/original/', '/uploads/medium/');
        originalUrl = url;

        // Buat srcSet jika URL berhasil diubah
        if (thumbnailUrl !== url && mediumUrl !== url) {
          srcSet = `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`;
        }

        // Pilih URL yang sesuai berdasarkan parameter size
        if (size === 'thumbnail') {
          mainUrl = thumbnailUrl;
        } else if (size === 'medium') {
          mainUrl = mediumUrl;
        } else if (size === 'original') {
          mainUrl = originalUrl;
        } else {
          // Mode auto: pilih berdasarkan dimensi komponen
          if (parseInt(height) <= 200) {
            mainUrl = thumbnailUrl;
          } else if (parseInt(height) <= 400) {
            mainUrl = mediumUrl;
          } else {
            mainUrl = originalUrl;
          }
        }
      } else if (url.includes('/api/images/')) {
        // Jika URL sudah menggunakan API endpoint, coba ekstrak ID dan buat URL untuk ukuran yang berbeda
        const match = url.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
        if (match && match[1]) {
          const imageId = match[1];
          const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';

          thumbnailUrl = `${apiUrl}/api/images/${imageId}/thumbnail`;
          mediumUrl = `${apiUrl}/api/images/${imageId}/medium`;
          originalUrl = `${apiUrl}/api/images/${imageId}/original`;

          srcSet = `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`;

          // Pilih URL yang sesuai berdasarkan parameter size
          if (size === 'thumbnail') {
            mainUrl = thumbnailUrl;
          } else if (size === 'medium') {
            mainUrl = mediumUrl;
          } else if (size === 'original') {
            mainUrl = originalUrl;
          } else {
            // Mode auto: pilih berdasarkan dimensi komponen
            if (parseInt(height) <= 200) {
              mainUrl = thumbnailUrl;
            } else if (parseInt(height) <= 400) {
              mainUrl = mediumUrl;
            } else {
              mainUrl = originalUrl;
            }
          }
        }
      }

      return {
        main: mainUrl,
        thumbnail: thumbnailUrl,
        medium: mediumUrl,
        original: originalUrl,
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
      directMain={imageInfo.directMain}
      directThumbnail={imageInfo.directThumbnail}
      directMedium={imageInfo.directMedium}
    />
  );
};

export default ResponsivePostImage;
