import React, { useState, useEffect, useRef } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

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
      <LazyLoadImage
        alt="Preview"
        height={200}
        src={hasError ? '/default-fallback-image.jpg' : src}
        width="100%"
        effect="blur"
        className={`writer-preview-image ${isUploading ? 'uploading' : ''}`}
        onError={handleError}
        placeholderSrc="/default-fallback-image.jpg"
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