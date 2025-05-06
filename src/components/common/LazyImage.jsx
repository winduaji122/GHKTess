import React, { useState, useEffect, memo, useRef } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * Komponen LazyImage untuk menampilkan gambar dengan skeleton placeholder
 * Dioptimalkan untuk performa dengan IntersectionObserver
 *
 * @param {string} src - URL gambar
 * @param {string} alt - Teks alternatif untuk gambar
 * @param {string} className - Class CSS tambahan
 * @param {object} style - Style tambahan
 * @param {string|number} width - Lebar gambar
 * @param {string|number} height - Tinggi gambar
 * @param {string} objectFit - Properti object-fit CSS (cover, contain, dll)
 * @param {function} onLoad - Callback saat gambar berhasil dimuat
 * @param {function} onError - Callback saat gambar gagal dimuat
 * @param {React.Component} customPlaceholder - Komponen placeholder kustom
 * @param {React.Component} customError - Komponen error kustom
 * @param {boolean} priority - Jika true, gambar akan dimuat segera tanpa lazy loading
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '100%',
  height = '200px',
  objectFit = 'cover',
  onLoad,
  onError,
  customPlaceholder,
  customError,
  priority = false,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Fungsi untuk memuat gambar
  const loadImage = () => {
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    // Buat objek Image baru untuk preload
    const img = new Image();

    // Tambahkan cache busting untuk mencegah cache browser
    const cacheBuster = `${src}${src.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    img.src = cacheBuster;

    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
      if (onLoad) onLoad();
    };

    img.onerror = () => {
      setError(true);
      setLoading(false);
      if (onError) onError();
    };
  };

  // Setup IntersectionObserver untuk lazy loading
  useEffect(() => {
    // Jika priority=true, muat gambar segera tanpa observer
    if (priority) {
      loadImage();
      return;
    }

    // Reset state saat src berubah
    setLoading(true);
    setError(false);
    setImageSrc(null);

    // Buat IntersectionObserver baru
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          // Hentikan observasi setelah gambar terlihat
          if (observerRef.current && imgRef.current) {
            observerRef.current.unobserve(imgRef.current);
          }
        }
      },
      {
        rootMargin: '200px', // Mulai muat gambar 200px sebelum terlihat
        threshold: 0.01
      }
    );

    // Mulai observasi elemen
    if (imgRef.current && observerRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      // Cleanup observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, priority]);

  // Muat gambar ketika shouldLoad berubah menjadi true
  useEffect(() => {
    if (shouldLoad) {
      loadImage();
    }
  }, [shouldLoad, src]);

  // Tampilkan skeleton saat loading
  if (loading) {
    if (customPlaceholder) {
      return <div ref={imgRef}>{customPlaceholder}</div>;
    }
    return (
      <div
        ref={imgRef}
        className={`writer-lazy-image-skeleton ${className}`}
        style={{ width, height, ...style }}
      >
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }

  // Tampilkan fallback image jika error
  if (error) {
    if (customError) {
      return <div ref={imgRef}>{customError}</div>;
    }
    return (
      <div
        ref={imgRef}
        className={`writer-lazy-image-error ${className}`}
        style={{
          width,
          height,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        {...props}
      >
        <span>Gambar tidak tersedia</span>
      </div>
    );
  }

  // Tampilkan gambar yang sudah dimuat
  // Periksa apakah ini adalah gambar carousel untuk menghindari animasi fade-in
  const isCarouselImage = className && className.includes('writer-carousel-lazy-image');

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`writer-lazy-image ${!isCarouselImage ? 'fade-in' : ''} ${className}`}
      style={{ objectFit, ...style }}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"} // Gunakan native lazy loading juga
      decoding="async" // Tambahkan decoding async untuk performa
      fetchpriority={priority ? "high" : "auto"} // Tambahkan fetchpriority untuk browser modern
      {...props}
    />
  );
};

// Memoize komponen LazyImage untuk mencegah render ulang yang tidak perlu
export default memo(LazyImage, (prevProps, nextProps) => {
  // Hanya render ulang jika src berubah atau props lain yang penting berubah
  return (
    prevProps.src === nextProps.src &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.className === nextProps.className &&
    prevProps.priority === nextProps.priority
  );
});
