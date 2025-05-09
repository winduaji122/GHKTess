import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ResponsiveImage.css';

// Inisialisasi cache gambar jika belum ada
if (typeof window !== 'undefined') {
  window.imageCache = window.imageCache || new Map();
}

/**
 * Komponen ResponsiveImage untuk menampilkan gambar responsif dengan srcSet
 * Mendukung lazy loading dan fallback
 */
const ResponsiveImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width,
  height,
  srcSet,
  sizes,
  loading = 'lazy',
  onError,
  fallbackSrc = '/placeholder-image.jpg',
  thumbnailSrc,
  mediumSrc,
  formats
}) => {
  const [imgSrc, setImgSrc] = useState(thumbnailSrc || src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [formatIndex, setFormatIndex] = useState(0);
  const imgRef = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 1; // Kurangi jumlah percobaan untuk menghindari infinite loop

  // Buat srcSet jika tidak disediakan tapi ada thumbnailSrc dan mediumSrc
  const computedSrcSet = srcSet || (
    thumbnailSrc && mediumSrc
      ? `${thumbnailSrc} 200w, ${mediumSrc} 640w, ${src} 1200w`
      : undefined
  );

  // Buat sizes jika tidak disediakan
  const computedSizes = sizes || "(max-width: 640px) 100vw, (max-width: 1200px) 640px, 1200px";

  // Reset state saat src berubah
  useEffect(() => {
    setImgSrc(thumbnailSrc || src);
    setHasError(false);
    setIsLoaded(false);
    retryCount.current = 0;
  }, [src, thumbnailSrc]);

  // Handler untuk error loading gambar
  const handleError = () => {
    // Increment retry counter
    retryCount.current += 1;

    // Periksa apakah URL terlalu panjang (tanda infinite loop)
    if (imgSrc.length > 500) {
      console.error('URL terlalu panjang, kemungkinan infinite loop:', imgSrc.substring(0, 100) + '...');
      setHasError(true);
      setImgSrc(fallbackSrc);
      return;
    }

    // Periksa apakah ini adalah percobaan ulang dengan ekstensi ganda
    const multipleExtensions = imgSrc.match(/\.(jpg|jpeg|png|gif|webp)\.(jpg|jpeg|png|gif|webp)/i);
    if (multipleExtensions) {
      console.error('Terdeteksi multiple ekstensi, gunakan fallback:', imgSrc.substring(0, 100) + '...');
      setHasError(true);
      setImgSrc(fallbackSrc);
      return;
    }

    // Jika URL mengandung /uploads/ tapi tidak mengandung ekstensi file, tambahkan ekstensi .jpg
    if (imgSrc.includes('/uploads/') && !imgSrc.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const newUrl = imgSrc + '.jpg';
      setImgSrc(newUrl);
      return;
    }

    // Strategi 1: Gunakan medium size jika tersedia
    if (mediumSrc && imgSrc !== mediumSrc) {
      setImgSrc(mediumSrc);
      return;
    }

    // Strategi 2: Gunakan format alternatif jika tersedia
    if (formats && formats.length > formatIndex + 1) {
      const nextFormat = formats[formatIndex + 1];
      setImgSrc(nextFormat.original || nextFormat.medium || nextFormat.thumbnail);
      setFormatIndex(formatIndex + 1);
      return;
    }

    // Strategi 3: Perbaiki URL yang salah format
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

    // Strategi 3.1: Perbaiki URL localhost
    if (imgSrc.includes('localhost:5000')) {
      const fixedUrl = imgSrc.replace('http://localhost:5000', apiUrl);
      setImgSrc(fixedUrl);
      return;
    }

    // Strategi 3.2: Konversi URL API ke URL langsung
    const apiMatch = imgSrc.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
    if (apiMatch && apiMatch[1] && apiMatch[2]) {
      const imageId = apiMatch[1];
      const size = apiMatch[2]; // original, medium, atau thumbnail
      const directUrl = `${apiUrl}/uploads/${size}/${imageId}`;
      setImgSrc(directUrl);
      return;
    }

    // Strategi 5: Ekstrak ukuran dan ID dari URL langsung
    const directMatch = imgSrc.match(/\/uploads\/(original|medium|thumbnail)\/([^\/\?]+)/);
    if (directMatch && directMatch[1] && directMatch[2]) {
      const size = directMatch[1];

      // Ekstrak ID dan ekstensi jika ada
      const fullImageId = directMatch[2];
      const extensionMatch = fullImageId.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const imageId = extensionMatch ? fullImageId.substring(0, fullImageId.lastIndexOf('.')) : fullImageId;

      // Gunakan pendekatan sederhana dengan ekstensi .jpg
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      const newUrl = `${apiUrl}/uploads/${size}/${imageId}.jpg`;
      setImgSrc(newUrl);

      return;
    }

    // Strategi 6: Langsung gunakan fallback jika sudah mencoba beberapa kali

    // Strategi 7: Jika sudah mencapai batas retry, gunakan fallback
    if (retryCount.current >= MAX_RETRIES) {
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Strategi 8: Gunakan fallback
    setHasError(true);
    setImgSrc(fallbackSrc);

    if (onError) {
      onError();
    }
  };

  // Handler untuk successful load
  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div
      className={`responsive-image-container ${className}`}
      style={{
        width: width || 'auto',
        height: height || 'auto',
        position: 'relative',
        ...style
      }}
    >
      {/* Gambar utama dengan srcSet untuk responsif */}
      <img
        ref={imgRef}
        src={imgSrc}
        srcSet={!hasError ? computedSrcSet : undefined}
        sizes={!hasError ? computedSizes : undefined}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: hasError && !isLoaded ? 'none' : 'block',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out'
        }}
        loading={loading}
        decoding="async"
      />

      {/* Fallback jika error */}
      {hasError && (
        <div
          className="responsive-image-fallback"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            color: '#666',
            fontSize: '12px',
            padding: '8px',
            textAlign: 'center'
          }}
        >
          Gambar tidak tersedia
        </div>
      )}
    </div>
  );
};

ResponsiveImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  width: PropTypes.string,
  height: PropTypes.string,
  srcSet: PropTypes.string,
  sizes: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager', 'auto']),
  onError: PropTypes.func,
  fallbackSrc: PropTypes.string,
  thumbnailSrc: PropTypes.string,
  mediumSrc: PropTypes.string,
  formats: PropTypes.array
};

export default ResponsiveImage;
