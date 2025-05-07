import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ResponsiveImage.css';

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
  directMain,
  directThumbnail,
  directMedium
}) => {
  const [imgSrc, setImgSrc] = useState(thumbnailSrc || src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const imgRef = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  // Simpan URL asli untuk referensi
  const originalUrl = src;

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
    // Jika sudah mencapai batas retry, gunakan fallback
    if (retryCount.current >= MAX_RETRIES) {
      // Jika belum mencoba URL langsung dan URL langsung tersedia
      if (!useFallback && directMain) {
        console.log('Switching to direct URL fallback');
        setUseFallback(true);
        retryCount.current = 0; // Reset retry count untuk URL langsung

        // Gunakan URL langsung yang sesuai
        if (imgSrc === src || imgSrc === originalUrl) {
          // Coba URL langsung ke file di direktori uploads
          const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
          const directUrl = `${apiUrl}/uploads/${imgSrc.split('/').pop()}`;
          console.log('Trying direct URL:', directUrl);
          setImgSrc(directUrl);
        } else if (imgSrc === thumbnailSrc) {
          setImgSrc(directThumbnail || directMain);
        } else if (imgSrc === mediumSrc) {
          setImgSrc(directMedium || directMain);
        } else {
          setImgSrc(directMain);
        }
        return;
      }

      // Jika sudah mencoba URL langsung atau tidak ada URL langsung, coba URL alternatif
      if (useFallback && imgSrc.includes('/api/images/')) {
        // Coba URL langsung ke direktori uploads
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        const match = imgSrc.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
        if (match && match[1] && match[2]) {
          const imageId = match[1];
          const size = match[2]; // original, medium, atau thumbnail
          const directUrl = `${apiUrl}/uploads/${size}/${imageId}`;
          console.log('Trying alternative URL:', directUrl);
          setImgSrc(directUrl);
          setUseFallback(false); // Reset useFallback untuk mencoba lagi
          retryCount.current = 0; // Reset retry count
          return;
        }
      }

      // Jika semua upaya gagal, gunakan fallback default
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Coba lagi dengan cache busting
    retryCount.current += 1;

    // Coba gunakan medium size jika tersedia
    if (retryCount.current === 1 && mediumSrc && imgSrc !== mediumSrc) {
      setImgSrc(mediumSrc);
      return;
    }

    // Tambahkan timestamp untuk cache busting
    const cacheBuster = `${imgSrc}${imgSrc.includes('?') ? '&' : '?'}_v=${Date.now()}`;
    setImgSrc(cacheBuster);
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
  directMain: PropTypes.string,
  directThumbnail: PropTypes.string,
  directMedium: PropTypes.string
};

export default ResponsiveImage;
