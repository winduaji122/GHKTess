import React, { useState, useEffect, memo } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * Komponen LazyImage untuk menampilkan gambar dengan skeleton placeholder
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
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    // Reset state saat src berubah
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Buat objek Image baru untuk preload
    const img = new Image();
    img.src = src;

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

    return () => {
      // Cleanup
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  // Tampilkan skeleton saat loading
  if (loading) {
    if (customPlaceholder) {
      return customPlaceholder;
    }
    return (
      <div className={`writer-lazy-image-skeleton ${className}`} style={{ width, height, ...style }}>
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }

  // Tampilkan fallback image jika error
  if (error) {
    if (customError) {
      return customError;
    }
    return (
      <div
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
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`writer-lazy-image fade-in ${className}`}
      style={{ objectFit, ...style }}
      width={width}
      height={height}
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
    prevProps.className === nextProps.className
  );
});
