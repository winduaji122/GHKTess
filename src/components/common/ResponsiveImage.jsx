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

          // Hapus parameter cache busting jika ada
          const cleanImgSrc = imgSrc.split('?')[0];

          // Ekstrak ID gambar dari URL API
          const match = cleanImgSrc.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
          if (match && match[1] && match[2]) {
            const imageId = match[1];
            const size = match[2]; // original, medium, atau thumbnail

            // Coba beberapa format file yang umum
            const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', ''];

            // Coba format pertama
            const directUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[0]}`;
            console.log('Trying direct URL:', directUrl);
            setImgSrc(directUrl);

            // Simpan informasi untuk mencoba format lain jika gagal
            window.imageRetryInfo = {
              imageId,
              size,
              extensions,
              currentExtIndex: 0,
              apiUrl
            };
          } else {
            // Fallback jika tidak bisa mengekstrak ID
            const directUrl = `${apiUrl}/uploads/${cleanImgSrc.split('/').pop()}`;
            console.log('Trying direct URL (fallback):', directUrl);
            setImgSrc(directUrl);
          }
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

        // Hapus parameter cache busting jika ada
        const cleanImgSrc = imgSrc.split('?')[0];

        const match = cleanImgSrc.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
        if (match && match[1] && match[2]) {
          const imageId = match[1];
          const size = match[2]; // original, medium, atau thumbnail

          // Coba beberapa format file yang umum
          const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', ''];

          // Coba format pertama
          const directUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[0]}`;
          console.log('Trying alternative URL:', directUrl);
          setImgSrc(directUrl);

          // Simpan informasi untuk mencoba format lain jika gagal
          window.imageRetryInfo = {
            imageId,
            size,
            extensions,
            currentExtIndex: 0,
            apiUrl
          };

          setUseFallback(false); // Reset useFallback untuk mencoba lagi
          retryCount.current = 0; // Reset retry count
          return;
        }
      }

      // Jika kita sudah mencoba URL alternatif dan masih gagal, coba format file lain
      if (window.imageRetryInfo && imgSrc.includes('/uploads/')) {
        const { imageId, size, extensions, currentExtIndex, apiUrl } = window.imageRetryInfo;

        // Coba format file berikutnya
        const nextExtIndex = currentExtIndex + 1;
        if (nextExtIndex < extensions.length) {
          const nextDirectUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[nextExtIndex]}`;
          console.log('Trying next file format:', nextDirectUrl);

          // Update informasi retry
          window.imageRetryInfo.currentExtIndex = nextExtIndex;

          setImgSrc(nextDirectUrl);
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
    // Pastikan kita tidak menambahkan parameter ke path URL
    if (imgSrc.includes('/uploads/')) {
      // Untuk URL langsung ke file, jangan tambahkan parameter cache busting
      // karena bisa menyebabkan masalah dengan path
      const retryUrl = imgSrc;
      console.log('Retrying with same URL (no cache busting for direct file access):', retryUrl);
      setImgSrc(retryUrl);
    } else {
      // Untuk URL API, tambahkan parameter cache busting
      const cacheBuster = `${imgSrc}${imgSrc.includes('?') ? '&' : '?'}_v=${Date.now()}`;
      console.log('Retrying with cache busting:', cacheBuster);
      setImgSrc(cacheBuster);
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
  directMain: PropTypes.string,
  directThumbnail: PropTypes.string,
  directMedium: PropTypes.string
};

export default ResponsiveImage;
