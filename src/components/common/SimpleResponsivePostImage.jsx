import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SimpleResponsiveImage from './SimpleResponsiveImage';

/**
 * Komponen SimpleResponsivePostImage khusus untuk menampilkan gambar post
 * dengan dukungan untuk berbagai ukuran dan format
 * @param {string} size - Ukuran gambar yang akan digunakan: 'thumbnail', 'medium', atau 'original'
 */
const SimpleResponsivePostImage = ({
  src,
  alt = '',
  className = '',
  style = {},
  width = '100%',
  height = '200px',
  objectFit = 'cover',
  priority = false,
  onError,
  fallbackSrc = '/placeholder-image.jpg',
  size = 'auto' // 'auto', 'thumbnail', 'medium', atau 'original'
}) => {
  const [imageSize, setImageSize] = useState('medium');
  const [imageUrl, setImageUrl] = useState('');
  
  // Tentukan ukuran gambar berdasarkan parameter size dan dimensi komponen
  useEffect(() => {
    let selectedSize = 'medium'; // Default ke medium
    
    if (size === 'thumbnail') {
      selectedSize = 'thumbnail';
    } else if (size === 'medium') {
      selectedSize = 'medium';
    } else if (size === 'original') {
      selectedSize = 'original';
    } else if (size === 'auto') {
      // Auto: pilih berdasarkan dimensi komponen
      const heightValue = parseInt(height);
      if (heightValue <= 200) {
        selectedSize = 'thumbnail';
      } else if (heightValue <= 640) {
        selectedSize = 'medium';
      } else {
        selectedSize = 'original';
      }
    }
    
    setImageSize(selectedSize);
  }, [size, height]);
  
  // Tentukan URL gambar berdasarkan src
  useEffect(() => {
    if (!src) {
      setImageUrl(fallbackSrc);
      return;
    }
    
    // Jika src adalah string, gunakan langsung
    if (typeof src === 'string') {
      setImageUrl(src);
      return;
    }
    
    // Jika src adalah objek dengan properti dari API baru
    if (typeof src === 'object' && src !== null) {
      // Jika objek memiliki properti original_path, thumbnail_path, medium_path (dari database)
      if (src.original_path || src.thumbnail_path || src.medium_path) {
        if (imageSize === 'thumbnail' && src.thumbnail_path) {
          setImageUrl(src.thumbnail_path);
        } else if (imageSize === 'medium' && src.medium_path) {
          setImageUrl(src.medium_path);
        } else if (imageSize === 'original' && src.original_path) {
          setImageUrl(src.original_path);
        } else {
          // Default ke original
          setImageUrl(src.original_path || src.medium_path || src.thumbnail_path);
        }
        return;
      }
      
      // Jika objek memiliki properti url, thumbnailUrl, mediumUrl (dari API)
      if (src.url || src.thumbnailUrl || src.mediumUrl) {
        if (imageSize === 'thumbnail' && src.thumbnailUrl) {
          setImageUrl(src.thumbnailUrl);
        } else if (imageSize === 'medium' && src.mediumUrl) {
          setImageUrl(src.mediumUrl);
        } else if (imageSize === 'original' && src.url) {
          setImageUrl(src.url);
        } else {
          // Default ke original
          setImageUrl(src.url || src.mediumUrl || src.thumbnailUrl || src.path);
        }
        return;
      }
      
      // Jika hanya ada path
      if (src.path) {
        setImageUrl(src.path);
        return;
      }
    }
    
    // Fallback ke fallbackSrc
    setImageUrl(fallbackSrc);
  }, [src, imageSize, fallbackSrc]);
  
  // Handler untuk error
  const handleError = () => {
    if (onError) {
      onError();
    }
  };
  
  return (
    <SimpleResponsiveImage
      src={imageUrl}
      alt={alt}
      className={className}
      style={{
        objectFit,
        ...style
      }}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
      fallbackSrc={fallbackSrc}
      size={imageSize}
    />
  );
};

SimpleResponsivePostImage.propTypes = {
  src: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]).isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  width: PropTypes.string,
  height: PropTypes.string,
  objectFit: PropTypes.string,
  priority: PropTypes.bool,
  onError: PropTypes.func,
  fallbackSrc: PropTypes.string,
  size: PropTypes.oneOf(['auto', 'thumbnail', 'medium', 'original'])
};

export default SimpleResponsivePostImage;
