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
  formats
}) => {
  const [imgSrc, setImgSrc] = useState(thumbnailSrc || src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [formatIndex, setFormatIndex] = useState(0);
  const imgRef = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 1; // Kurangi jumlah percobaan untuk menghindari infinite loop

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

    // Strategi 1: Coba gunakan medium size jika tersedia dan belum dicoba
    if (retryCount.current === 1 && mediumSrc && imgSrc !== mediumSrc) {
      console.log('Trying medium size URL:', mediumSrc);
      setImgSrc(mediumSrc);
      return;
    }

    // Strategi 2: Coba format alternatif jika tersedia
    if (formats && formats.length > formatIndex + 1) {
      console.log('Trying next format:', formats[formatIndex + 1]);
      setFormatIndex(formatIndex + 1);
      retryCount.current = 0; // Reset retry count

      // Pilih URL yang sesuai dari format berikutnya
      const nextFormat = formats[formatIndex + 1];

      if (imgSrc === src || imgSrc.includes('/original/')) {
        setImgSrc(nextFormat.original);
      } else if (imgSrc.includes('/thumbnail/')) {
        setImgSrc(nextFormat.thumbnail);
      } else if (imgSrc.includes('/medium/')) {
        setImgSrc(nextFormat.medium);
      } else {
        setImgSrc(nextFormat.original);
      }
      return;
    }

    // Strategi 3: Perbaiki URL yang salah format
    const cleanImgSrc = imgSrc.split('?')[0]; // Hapus parameter query
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

    // Strategi 3.1: Perbaiki URL localhost
    if (cleanImgSrc.includes('localhost:5000')) {
      const fixedUrl = cleanImgSrc.replace('http://localhost:5000', apiUrl);
      console.log('Fixed localhost URL:', fixedUrl);
      setImgSrc(fixedUrl);
      return;
    }

    // Strategi 3.2: Perbaiki URL yang salah format
    if (cleanImgSrc.includes('/uploads/http://')) {
      const parts = cleanImgSrc.split('/uploads/');
      if (parts.length > 1) {
        const wrongPath = parts[1];
        const filename = wrongPath.split('/').pop();
        const fixedUrl = `${apiUrl}/uploads/${filename}`;
        console.log('Fixed malformed URL:', fixedUrl);
        setImgSrc(fixedUrl);
        return;
      }
    }

    // Strategi 4: Konversi URL API ke URL langsung
    const apiMatch = cleanImgSrc.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
    if (apiMatch && apiMatch[1] && apiMatch[2]) {
      const imageId = apiMatch[1];
      const size = apiMatch[2]; // original, medium, atau thumbnail
      const directUrl = `${apiUrl}/uploads/${size}/${imageId}`;
      console.log('Converting API URL to direct URL:', directUrl);
      setImgSrc(directUrl);
      return;
    }

    // Strategi 5: Ekstrak ukuran dan ID dari URL langsung
    const directMatch = cleanImgSrc.match(/\/uploads\/(original|medium|thumbnail)\/([^\/\?]+)/);
    if (directMatch && directMatch[1] && directMatch[2]) {
      // Jika sudah mencapai batas retry, coba dengan ekstensi file
      if (retryCount.current >= 2) {
        const size = directMatch[1];
        const imageId = directMatch[2].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Coba dengan ekstensi file yang berbeda
        const extensions = ['', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const extensionIndex = Math.min(retryCount.current - 2, extensions.length - 1);

        if (extensionIndex < extensions.length) {
          const newUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[extensionIndex]}`;
          console.log(`Trying with extension ${extensions[extensionIndex]}:`, newUrl);
          setImgSrc(newUrl);
          return;
        }
      }

      // Jika belum mencapai batas retry atau sudah mencoba semua ekstensi, coba dengan parameter dummy
      const dummyParam = `${cleanImgSrc}${cleanImgSrc.includes('?') ? '&' : '?'}_dummy=${Math.random()}`;
      console.log('Refreshing direct URL with dummy parameter:', dummyParam);
      setImgSrc(dummyParam);
      return;
    }

    // Strategi 6: Jika sudah mencapai batas retry, gunakan fallback
    if (retryCount.current >= MAX_RETRIES) {
      console.log('Reached maximum retries, using fallback');
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Strategi 7: Tambahkan parameter dummy untuk refresh
    if (imgSrc.includes('/uploads/')) {
      const dummyParam = `${cleanImgSrc}${cleanImgSrc.includes('?') ? '&' : '?'}_dummy=${Math.random()}`;
      console.log('Retrying with dummy parameter:', dummyParam);
      setImgSrc(dummyParam);
    } else {
      // Untuk URL API, tambahkan parameter cache busting
      const cacheBuster = `${cleanImgSrc}${cleanImgSrc.includes('?') ? '&' : '?'}_v=${Date.now()}`;
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
  formats: PropTypes.array
};

export default ResponsiveImage;
