import { useState, useEffect } from 'react';

/**
 * Custom hook untuk lazy loading gambar
 * 
 * @param {string} src - URL gambar
 * @param {string} placeholder - URL gambar placeholder (opsional)
 * @returns {Object} - { loading, error, imageSrc }
 */
const useLazyImage = (src, placeholder = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder);

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
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    
    return () => {
      // Cleanup
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { loading, error, imageSrc };
};

export default useLazyImage;
