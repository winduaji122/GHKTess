import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ResponsiveImage.css';
import { DEFAULT_FALLBACK_IMAGE, isImageUrl } from '../../utils/fallbackImageConfig';

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
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
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

    // Jika URL adalah URL lengkap dengan format image-*
    if (imgSrc.includes('/uploads/image-')) {
      console.log('Gambar dengan format lama tidak ditemukan:', imgSrc);
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Periksa apakah URL terlalu panjang (tanda infinite loop)
    if (imgSrc.length > 500) {
      console.error('URL terlalu panjang, kemungkinan infinite loop:', imgSrc.substring(0, 100) + '...');
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Periksa apakah ini adalah percobaan ulang dengan ekstensi ganda
    const multipleExtensions = imgSrc.match(/\.(jpg|jpeg|png|gif|webp)\.(jpg|jpeg|png|gif|webp)/i);
    if (multipleExtensions) {
      console.error('Terdeteksi multiple ekstensi, gunakan fallback:', imgSrc.substring(0, 100) + '...');
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Jika sudah mencapai batas retry, gunakan fallback
    if (retryCount.current >= MAX_RETRIES) {
      console.log('Batas retry tercapai, gunakan fallback:', imgSrc);
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Strategi 1: Gunakan medium size jika tersedia dan belum dicoba
    if (mediumSrc && imgSrc !== mediumSrc && !imgSrc.includes(mediumSrc)) {
      console.log('Mencoba medium size:', mediumSrc);
      setImgSrc(mediumSrc);
      return;
    }

    // Strategi 2: Gunakan thumbnail size jika tersedia dan belum dicoba
    if (thumbnailSrc && imgSrc !== thumbnailSrc && !imgSrc.includes(thumbnailSrc)) {
      console.log('Mencoba thumbnail size:', thumbnailSrc);
      setImgSrc(thumbnailSrc);
      return;
    }

    // Strategi 3: Jika URL mengandung /uploads/ tapi tidak mengandung ekstensi file, tambahkan ekstensi .jpg
    if (imgSrc.includes('/uploads/') && !imgSrc.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const newUrl = imgSrc + '.jpg';
      console.log('Menambahkan ekstensi .jpg:', newUrl);
      setImgSrc(newUrl);
      return;
    }

    // Strategi 4: Gunakan fallback
    console.log('Semua strategi gagal, gunakan fallback:', imgSrc);
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
        <>
          {/* Jika fallbackSrc adalah URL gambar, tampilkan gambar */}
          {fallbackSrc && isImageUrl(fallbackSrc) ? (
            <img
              src={fallbackSrc}
              alt={alt || "Gambar tidak tersedia"}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            /* Jika bukan URL gambar, tampilkan div dengan teks */
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
        </>
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
