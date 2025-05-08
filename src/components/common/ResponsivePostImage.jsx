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
      // Jika objek memiliki properti original_path, thumbnail_path, medium_path (dari database)
      if (imagePath.original_path || imagePath.thumbnail_path || imagePath.medium_path) {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Gunakan path langsung dari database
        const originalUrl = imagePath.original_path ? `${apiUrl}/${imagePath.original_path}` : null;
        const mediumUrl = imagePath.medium_path ? `${apiUrl}/${imagePath.medium_path}` : null;
        const thumbnailUrl = imagePath.thumbnail_path ? `${apiUrl}/${imagePath.thumbnail_path}` : null;

        // Tentukan main berdasarkan parameter size
        let mainUrl;
        if (size === 'thumbnail' && thumbnailUrl) {
          mainUrl = thumbnailUrl;
        } else if (size === 'medium' && mediumUrl) {
          mainUrl = mediumUrl;
        } else if (size === 'original' && originalUrl) {
          mainUrl = originalUrl;
        } else {
          // Default atau 'auto': gunakan ukuran yang sesuai berdasarkan dimensi komponen
          if (parseInt(height) <= 200 && thumbnailUrl) {
            mainUrl = thumbnailUrl;
          } else if (parseInt(height) <= 640 && mediumUrl) {
            mainUrl = mediumUrl;
          } else {
            mainUrl = originalUrl;
          }
        }

        return {
          main: mainUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          srcSet: thumbnailUrl && mediumUrl && originalUrl ?
            `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w` : null,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
        };
      }

      // Jika objek memiliki properti url, thumbnailUrl, mediumUrl (dari API)
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
        // Ini adalah ID gambar, coba cari di database
        try {
          // Coba ambil data gambar dari database
          const imageData = window.imageDatabase ? window.imageDatabase.find(img => img.id === imagePath) : null;

          if (imageData) {
            // Gunakan path dari database
            const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

            // Gunakan path lengkap dari database
            const originalUrl = `${apiUrl}/${imageData.original_path}`;
            const mediumUrl = `${apiUrl}/${imageData.medium_path}`;
            const thumbnailUrl = `${apiUrl}/${imageData.thumbnail_path}`;

            // Tentukan main URL berdasarkan parameter size
            let mainUrl;

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

            return {
              main: mainUrl,
              thumbnail: thumbnailUrl,
              medium: mediumUrl,
              srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
              sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
            };
          }
        } catch (error) {
          console.error('Error accessing image database:', error);
        }

        // Fallback jika tidak ada database atau gambar tidak ditemukan
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Coba beberapa format path
        // Prioritaskan format tanpa ekstensi terlebih dahulu karena banyak file di server tidak memiliki ekstensi
        const formats = [
          { original: `${apiUrl}/uploads/original/${imagePath}`, medium: `${apiUrl}/uploads/medium/${imagePath}`, thumbnail: `${apiUrl}/uploads/thumbnail/${imagePath}` },
          { original: `${apiUrl}/uploads/original/${imagePath}.jpg`, medium: `${apiUrl}/uploads/medium/${imagePath}.jpg`, thumbnail: `${apiUrl}/uploads/thumbnail/${imagePath}.jpg` },
          { original: `${apiUrl}/uploads/original/${imagePath}.jpeg`, medium: `${apiUrl}/uploads/medium/${imagePath}.jpeg`, thumbnail: `${apiUrl}/uploads/thumbnail/${imagePath}.jpeg` },
          { original: `${apiUrl}/uploads/original/${imagePath}.png`, medium: `${apiUrl}/uploads/medium/${imagePath}.png`, thumbnail: `${apiUrl}/uploads/thumbnail/${imagePath}.png` },
          { original: `${apiUrl}/uploads/original/${imagePath}.webp`, medium: `${apiUrl}/uploads/medium/${imagePath}.webp`, thumbnail: `${apiUrl}/uploads/thumbnail/${imagePath}.webp` }
        ];

        // Simpan format untuk digunakan di fallback
        window.imageFormats = window.imageFormats || {};
        window.imageFormats[imagePath] = formats;

        // Gunakan format pertama sebagai default
        const originalUrl = formats[0].original;
        const mediumUrl = formats[0].medium;
        const thumbnailUrl = formats[0].thumbnail;

        // Tentukan main URL berdasarkan parameter size
        let mainUrl;

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

        return {
          main: mainUrl,
          thumbnail: thumbnailUrl,
          medium: mediumUrl,
          srcSet: `${thumbnailUrl} 200w, ${mediumUrl} 640w, ${originalUrl} 1200w`,
          sizes: "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px",
          // Simpan format untuk digunakan di fallback
          formats: formats
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
      formats={imageInfo.formats}
    />
  );
};

export default ResponsivePostImage;
