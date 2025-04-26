import React, { useState, useEffect, useRef } from 'react';
import LazyImage from '../../common/LazyImage';
import '../../../styles/lazyImage.css';

const ImagePreview = ({ src, onError, isUploading, onRemove }) => {
  const [hasError, setHasError] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const handleError = (error) => {
    if (retryCount.current >= maxRetries) {
      setHasError(true);
      onError?.(error);
      return;
    }

    retryCount.current += 1;
    const baseUrl = src.split('?')[0];
    const newSrc = `${baseUrl}?retry=${retryCount.current}&t=${Date.now()}`;
    error.target.src = newSrc;
  };

  useEffect(() => {
    retryCount.current = 0;
    setHasError(false);
  }, [src]);

  return (
    <div className="writer-image-preview">
      <LazyImage
        src={hasError ? '/default-fallback-image.jpg' : src}
        alt="Preview"
        height="200px"
        width="100%"
        objectFit="cover"
        className={`writer-preview-image ${isUploading ? 'uploading' : ''}`}
        onError={handleError}
        key={src}
      />
      {!hasError && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (window.confirm('Apakah Anda yakin ingin menghapus gambar ini?')) {
              onRemove();
            }
          }}
          className="writer-remove-image-btn"
          disabled={isUploading}
        >
          Hapus Gambar
        </button>
      )}
    </div>
  );
};

export default ImagePreview;