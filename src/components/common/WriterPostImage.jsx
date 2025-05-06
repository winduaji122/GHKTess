import React, { useState, useRef, useEffect } from 'react';

/**
 * Komponen WriterPostImage yang dioptimalkan untuk halaman writer posts
 * Menghindari efek berkedip dengan pendekatan yang lebih sederhana
 * Menangani URL localhost dengan lebih baik
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
  const [imgSrc, setImgSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 1; // Kurangi jumlah retry untuk performa lebih baik

  // Perbaiki URL localhost saat inisialisasi
  useEffect(() => {
    if (!src) {
      setImgSrc(fallbackSrc);
      return;
    }

    // Perbaiki URL localhost jika ada
    if (src.includes('localhost:5000')) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://ghk-tess-backend.vercel.app';
      const fixedSrc = src.replace('http://localhost:5000', apiUrl);
      setImgSrc(fixedSrc);
    } else {
      setImgSrc(src);
    }

    // Reset state
    setHasError(false);
    setIsLoaded(false);
    retryCount.current = 0;
  }, [src, fallbackSrc]);

  // Handler untuk error loading gambar
  const handleError = () => {
    // Jika sudah mencapai batas retry, gunakan fallback
    if (retryCount.current >= MAX_RETRIES) {
      setHasError(true);
      setImgSrc(fallbackSrc);

      if (onError) {
        onError();
      }
      return;
    }

    // Coba lagi dengan cache busting
    retryCount.current += 1;

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
      className={`writer-post-image-container ${className}`}
      style={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        ...style
      }}
    >
      {/* Gambar utama */}
      <img
        ref={imgRef}
        src={imgSrc}
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
        loading="lazy"
        decoding="async"
      />

      {/* Fallback jika error */}
      {hasError && (
        <div
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

export default WriterPostImage;
