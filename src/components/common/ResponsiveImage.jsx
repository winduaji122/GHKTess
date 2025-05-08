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
      // Jika ada format alternatif yang tersedia
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

      // Jika belum mencoba URL alternatif
      if (!useFallback) {
        console.log('Switching to alternative URL fallback');
        setUseFallback(true);
        retryCount.current = 0; // Reset retry count

        // Hapus parameter cache busting jika ada
        const cleanImgSrc = imgSrc.split('?')[0];
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Periksa apakah URL mengandung localhost
        if (cleanImgSrc.includes('localhost:5000')) {
          // Ganti localhost dengan URL API
          const fixedUrl = cleanImgSrc.replace('http://localhost:5000', apiUrl);
          console.log('Fixed localhost URL:', fixedUrl);
          setImgSrc(fixedUrl);
          return;
        }

        // Periksa apakah URL mengandung path yang salah
        if (cleanImgSrc.includes('/uploads/http://')) {
          // Ekstrak nama file dari URL yang salah
          const parts = cleanImgSrc.split('/uploads/');
          if (parts.length > 1) {
            const wrongPath = parts[1];
            const filename = wrongPath.split('/').pop();
            // Gunakan nama file langsung
            const fixedUrl = `${apiUrl}/uploads/${filename}`;
            console.log('Fixed malformed URL:', fixedUrl);
            setImgSrc(fixedUrl);
            return;
          }
        }

        // Ekstrak ID gambar dari URL API
        const match = cleanImgSrc.match(/\/api\/images\/([^\/]+)\/([^\/]+)/);
        if (match && match[1] && match[2]) {
          const imageId = match[1];
          const size = match[2]; // original, medium, atau thumbnail

          // Coba beberapa format file
          const extensions = ['.jpg', '.png', '.webp', '.jpeg', ''];
          const directUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[0]}`;
          console.log('Trying direct URL with extension:', directUrl);

          // Simpan informasi untuk mencoba format lain jika gagal
          window.imageRetryInfo = {
            imageId,
            size,
            extensions,
            currentExtIndex: 0,
            apiUrl
          };

          setImgSrc(directUrl);
          return;
        } else {
          // Fallback jika tidak bisa mengekstrak ID
          const directUrl = `${apiUrl}/uploads/${cleanImgSrc.split('/').pop()}`;
          console.log('Trying direct URL (fallback):', directUrl);
          setImgSrc(directUrl);
          return;
        }
        return;
      }

      // Jika sudah mencoba URL alternatif dan masih gagal
      if (useFallback && window.imageRetryInfo) {
        const { imageId, size, extensions, currentExtIndex, apiUrl } = window.imageRetryInfo;

        // Coba format file berikutnya
        const nextExtIndex = currentExtIndex + 1;
        if (nextExtIndex < extensions.length) {
          const nextDirectUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[nextExtIndex]}`;
          console.log('Trying next file extension:', nextDirectUrl);

          // Update informasi retry
          window.imageRetryInfo.currentExtIndex = nextExtIndex;

          setImgSrc(nextDirectUrl);
          retryCount.current = 0; // Reset retry count
          return;
        }
      }

      // Coba ekstensi file berikutnya jika ada
      if (window.imageExtensionRetry) {
        const { imageId, size, extensions, currentIndex, apiUrl } = window.imageExtensionRetry;

        // Coba ekstensi berikutnya
        const nextIndex = currentIndex + 1;
        if (nextIndex < extensions.length) {
          const nextUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[nextIndex]}`;
          console.log('Trying next extension:', nextUrl);

          // Update informasi retry
          window.imageExtensionRetry.currentIndex = nextIndex;

          setImgSrc(nextUrl);
          retryCount.current = 0; // Reset retry count
          return;
        }

        // Jika sudah mencoba semua ekstensi, coba tanpa ekstensi
        if (nextIndex === extensions.length) {
          const noExtUrl = `${apiUrl}/uploads/${size}/${imageId}`;
          console.log('Trying without extension:', noExtUrl);

          // Update informasi retry
          window.imageExtensionRetry.currentIndex = nextIndex + 1;

          setImgSrc(noExtUrl);
          retryCount.current = 0; // Reset retry count
          return;
        }
      }

      // Jika sudah mencoba semua alternatif dan masih gagal, gunakan fallback default
      console.log('All alternatives failed, using default fallback');
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

      // Periksa apakah URL mengandung localhost
      if (imgSrc.includes('localhost:5000')) {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Ganti localhost dengan URL API
        const fixedUrl = imgSrc.replace('http://localhost:5000', apiUrl);
        console.log('Fixed localhost URL:', fixedUrl);
        setImgSrc(fixedUrl);
      } else if (imgSrc.includes('/uploads/http://')) {
        // Periksa apakah URL mengandung path yang salah
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Ekstrak nama file dari URL yang salah
        const parts = imgSrc.split('/uploads/');
        if (parts.length > 1) {
          const wrongPath = parts[1];
          const filename = wrongPath.split('/').pop();
          // Gunakan nama file langsung
          const fixedUrl = `${apiUrl}/uploads/${filename}`;
          console.log('Fixed malformed URL:', fixedUrl);
          setImgSrc(fixedUrl);
        }
      } else if (imgSrc.includes('/image-')) {
        // Periksa apakah URL mengandung pattern image-timestamp
        // Ini adalah format lama yang mungkin tidak ada di server
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Coba cari file di direktori uploads/original
        // Ekstrak ID dari URL jika ada
        const match = imgSrc.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (match && match[1]) {
          const imageId = match[1];
          // Coba gunakan ID untuk membuat URL ke direktori original
          const newUrl = `${apiUrl}/uploads/original/${imageId}`;
          console.log('Trying ID-based URL:', newUrl);
          setImgSrc(newUrl);
          return;
        }

        // Jika tidak ada ID, gunakan fallback
        console.log('Image with old format, using fallback');
        setHasError(true);
        setImgSrc(fallbackSrc);
      } else if (imgSrc.includes('/medium/') || imgSrc.includes('/original/') || imgSrc.includes('/thumbnail/')) {
        // URL sudah dalam format yang benar, coba tambahkan ekstensi jika belum ada
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Periksa apakah URL sudah memiliki ekstensi
        const hasExtension = /\.(jpg|jpeg|png|gif|webp)$/i.test(imgSrc);

        if (!hasExtension) {
          // Ekstrak ID dari URL
          const parts = imgSrc.split('/');
          const imageId = parts[parts.length - 1].split('?')[0]; // Hapus parameter query jika ada
          const size = imgSrc.includes('/medium/') ? 'medium' :
                       imgSrc.includes('/original/') ? 'original' : 'thumbnail';

          // Coba beberapa ekstensi file
          const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

          // Coba ekstensi pertama
          const newUrl = `${apiUrl}/uploads/${size}/${imageId}${extensions[0]}`;
          console.log('Trying with extension:', newUrl);

          // Simpan informasi untuk mencoba ekstensi lain jika gagal
          window.imageExtensionRetry = {
            imageId,
            size,
            extensions,
            currentIndex: 0,
            apiUrl
          };

          setImgSrc(newUrl);
          return;
        } else {
          // URL sudah memiliki ekstensi, coba reload dengan parameter dummy
          console.log('Retrying with same URL (with dummy parameter):', imgSrc);
          const dummyParam = `${imgSrc}${imgSrc.includes('?') ? '&' : '?'}_dummy=${Math.random()}`;
          setImgSrc(dummyParam);
        }
      } else {
        // Coba URL yang sama tanpa cache busting
        console.log('Retrying with same URL (no cache busting for direct file access):', imgSrc);
        // Trick untuk memaksa browser me-reload gambar
        const dummyParam = `${imgSrc}${imgSrc.includes('?') ? '&' : '?'}_dummy=${Math.random()}`;
        setImgSrc(dummyParam);
      }
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
  formats: PropTypes.array
};

export default ResponsiveImage;
