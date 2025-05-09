import React, { useState, useEffect, useCallback } from 'react';
import ResponsiveImage from './ResponsiveImage';
import { getImageUrl } from '../../utils/imageHelper';
import { getResponsiveImageUrls } from '../../utils/getResponsiveImageUrls';
import { DEFAULT_FALLBACK_IMAGE } from '../../utils/fallbackImageConfig';

/**
 * Komponen SimplifiedResponsivePostImage yang lebih efisien untuk menampilkan gambar post
 * dengan dukungan untuk berbagai ukuran dan format
 * @param {string} size - Ukuran gambar yang akan digunakan: 'thumbnail', 'medium', atau 'original'
 */
const SimplifiedResponsivePostImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '100%',
  height = '200px',
  objectFit = 'cover',
  priority = false,
  onError,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
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

    // Jika imagePath adalah objek, coba ekstrak properti yang relevan
    if (typeof imagePath === 'object' && imagePath !== null) {
      // Coba berbagai properti yang mungkin berisi path
      const possiblePaths = ['path', 'id', 'url', 'src'];
      for (const prop of possiblePaths) {
        if (imagePath[prop] && typeof imagePath[prop] === 'string') {
          imagePath = imagePath[prop];
          break;
        }
      }

      // Jika masih objek, gunakan default
      if (typeof imagePath === 'object') {
        return {
          main: fallbackSrc,
          thumbnail: null,
          medium: null,
          srcSet: null,
          sizes: null
        };
      }
    }

    // Gunakan getResponsiveImageUrls untuk mendapatkan URL untuk berbagai ukuran
    const urls = getResponsiveImageUrls(imagePath, size);

    if (!urls) {
      // Fallback ke getImageUrl jika getResponsiveImageUrls gagal
      const url = getImageUrl(imagePath, null, size);
      return {
        main: url,
        thumbnail: null,
        medium: null,
        srcSet: null,
        sizes: null
      };
    }

    // Tentukan main URL berdasarkan parameter size
    let mainUrl;
    if (size === 'thumbnail') {
      mainUrl = urls.thumbnail;
    } else if (size === 'medium') {
      mainUrl = urls.medium;
    } else if (size === 'original') {
      mainUrl = urls.original;
    } else if (size === 'auto') {
      // Auto: pilih berdasarkan dimensi komponen
      if (parseInt(height) <= 200) {
        mainUrl = urls.thumbnail;
      } else if (parseInt(height) <= 640) {
        mainUrl = urls.medium;
      } else {
        mainUrl = urls.original;
      }
    } else {
      // Default ke preferred URL dari getResponsiveImageUrls
      mainUrl = urls.preferred || urls.original || urls.medium || urls.thumbnail;
    }

    return {
      main: mainUrl,
      thumbnail: urls.thumbnail,
      medium: urls.medium,
      original: urls.original,
      srcSet: urls.srcSet,
      sizes: urls.sizes || "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px"
    };
  }, [fallbackSrc, height, size]);

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

export default SimplifiedResponsivePostImage;
