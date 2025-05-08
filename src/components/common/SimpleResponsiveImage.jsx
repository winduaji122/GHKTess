import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ResponsiveImage.css';

// Deklarasi tipe untuk window.imageCache dan window.extensionCache
if (typeof window !== 'undefined') {
  window.imageCache = window.imageCache || new Map();
  
  // Inisialisasi cache ekstensi jika belum ada
  if (!window.extensionCache) {
    try {
      const cachedExtensions = localStorage.getItem('imageExtensionCache');
      window.extensionCache = cachedExtensions ? JSON.parse(cachedExtensions) : {};
    } catch (error) {
      console.error('Error loading extension cache:', error);
      window.extensionCache = {};
    }
  }
}

/**
 * Fungsi untuk mendapatkan URL gambar dengan ekstensi yang benar
 * @param {string} imageId - ID gambar
 * @param {string} size - Ukuran gambar (original, medium, thumbnail)
 * @returns {string} URL gambar dengan ekstensi yang benar
 */
const getImageUrl = (imageId, size = 'original') => {
  if (!imageId) return null;
  
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // Jika imageId sudah mengandung ekstensi, gunakan langsung
  if (imageId.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return `${apiUrl}/uploads/${size}/${imageId}`;
  }
  
  // Jika imageId adalah URL lengkap, ekstrak nama file
  if (imageId.startsWith('http')) {
    const urlParts = imageId.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return `${apiUrl}/uploads/${fileName}`;
  }
  
  // Jika imageId adalah format image-*, gunakan langsung
  if (imageId.includes('image-')) {
    return `${apiUrl}/uploads/${imageId}`;
  }
  
  // Cek apakah ada di cache ekstensi
  if (window.extensionCache && window.extensionCache[imageId]) {
    return `${apiUrl}/uploads/${size}/${imageId}${window.extensionCache[imageId]}`;
  }
  
  // Default: gunakan tanpa ekstensi
  return `${apiUrl}/uploads/${size}/${imageId}`;
};

/**
 * Fungsi untuk menyimpan ekstensi file yang berhasil ditemukan
 * @param {string} id - ID gambar
 * @param {string} extension - Ekstensi file (.jpg, .png, dll)
 */
const saveExtension = (id, extension) => {
  if (!id || !extension) return;
  
  try {
    // Simpan ke cache memori
    window.extensionCache = window.extensionCache || {};
    window.extensionCache[id] = extension;
    
    // Simpan ke localStorage
    localStorage.setItem('imageExtensionCache', JSON.stringify(window.extensionCache));
    console.log(`Saved extension ${extension} for image ${id} to cache`);
  } catch (error) {
    console.error('Error saving extension to cache:', error);
  }
};

/**
 * Komponen SimpleResponsiveImage untuk menampilkan gambar dengan berbagai ukuran
 * dan dukungan untuk lazy loading dan fallback
 */
const SimpleResponsiveImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width,
  height,
  loading = 'lazy',
  onError,
  fallbackSrc = '/placeholder-image.jpg',
  size = 'medium'
}) => {
  const [imgSrc, setImgSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 5;

  // Inisialisasi URL gambar
  useEffect(() => {
    // Ekstrak ID gambar dari src
    let imageId = src;
    
    // Jika src adalah URL lengkap, ekstrak ID
    if (src.includes('/uploads/')) {
      const match = src.match(/\/uploads\/(?:original|medium|thumbnail)\/([^\/\?]+)/);
      if (match) {
        imageId = match[1].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      } else {
        const parts = src.split('/uploads/');
        if (parts.length > 1) {
          imageId = parts[1].split('?')[0].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        }
      }
    }
    
    // Gunakan fungsi getImageUrl untuk mendapatkan URL dengan ekstensi yang benar
    const url = getImageUrl(imageId, size);
    setImgSrc(url);
    
    // Reset state
    setHasError(false);
    setIsLoaded(false);
    retryCount.current = 0;
  }, [src, size]);

  // Handler untuk error loading gambar
  const handleError = () => {
    // Increment retry counter
    retryCount.current += 1;
    
    // Jika sudah mencapai batas retry, gunakan fallback
    if (retryCount.current >= MAX_RETRIES) {
      console.log('Reached maximum retries, using fallback');
      setHasError(true);
      setImgSrc(fallbackSrc);
      
      if (onError) {
        onError();
      }
      return;
    }
    
    // Ekstrak informasi dari URL
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    let imageId = '';
    let currentSize = size;
    
    // Coba ekstrak ID dan ukuran dari URL
    if (imgSrc.includes('/uploads/')) {
      const match = imgSrc.match(/\/uploads\/(original|medium|thumbnail)\/([^\/\?]+)/);
      if (match) {
        currentSize = match[1];
        imageId = match[2].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      } else {
        // Jika tidak ada ukuran, coba ekstrak ID saja
        const parts = imgSrc.split('/uploads/');
        if (parts.length > 1) {
          imageId = parts[1].split('?')[0].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        }
      }
    } else {
      // Jika bukan URL uploads, gunakan src langsung
      imageId = src;
    }
    
    // Coba dengan ekstensi .jpg
    if (retryCount.current === 1 && imageId) {
      const newUrl = `${apiUrl}/uploads/${currentSize}/${imageId}.jpg`;
      console.log('Trying with .jpg extension:', newUrl);
      setImgSrc(newUrl);
      return;
    }
    
    // Coba dengan ekstensi .png
    if (retryCount.current === 2 && imageId) {
      const newUrl = `${apiUrl}/uploads/${currentSize}/${imageId}.png`;
      console.log('Trying with .png extension:', newUrl);
      setImgSrc(newUrl);
      return;
    }
    
    // Coba dengan ekstensi .gif
    if (retryCount.current === 3 && imageId) {
      const newUrl = `${apiUrl}/uploads/${currentSize}/${imageId}.gif`;
      console.log('Trying with .gif extension:', newUrl);
      setImgSrc(newUrl);
      return;
    }
    
    // Coba dengan URL langsung ke uploads
    if (retryCount.current === 4 && imageId) {
      const newUrl = `${apiUrl}/uploads/${imageId}`;
      console.log('Trying with direct uploads URL:', newUrl);
      setImgSrc(newUrl);
      return;
    }
    
    // Jika semua percobaan gagal, gunakan fallback
    console.log('All attempts failed, using fallback');
    setHasError(true);
    setImgSrc(fallbackSrc);
    
    if (onError) {
      onError();
    }
  };

  // Handler untuk successful load
  const handleLoad = () => {
    setIsLoaded(true);
    
    // Jika berhasil dimuat, simpan ekstensi ke cache
    if (imgSrc.includes('/uploads/')) {
      const match = imgSrc.match(/\/uploads\/(?:original|medium|thumbnail)\/([^\/\?]+)(\.(jpg|jpeg|png|gif|webp))?/i);
      if (match) {
        const imageId = match[1].replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        const extension = match[2] || '';
        
        if (imageId && extension) {
          saveExtension(imageId, extension);
        }
      }
    }
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

SimpleResponsiveImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  width: PropTypes.string,
  height: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager', 'auto']),
  onError: PropTypes.func,
  fallbackSrc: PropTypes.string,
  size: PropTypes.oneOf(['thumbnail', 'medium', 'original'])
};

export default SimpleResponsiveImage;
