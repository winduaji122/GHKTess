import React, { useState, useEffect, useRef } from 'react';
import '../../../styles/lazyImage.css';

const ImagePreview = ({ src, onError, isUploading, onRemove }) => {
  const [hasError, setHasError] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const imgRef = useRef(null);

  // Fungsi untuk menangani error loading gambar
  const handleError = (error) => {
    if (retryCount.current >= maxRetries) {
      setHasError(true);
      onError?.(error);
      return;
    }

    retryCount.current += 1;

    // Coba load gambar lagi dengan cache busting
    const baseUrl = src.split('?')[0];
    const newSrc = `${baseUrl}?retry=${retryCount.current}&t=${Date.now()}`;

    // Gunakan referensi langsung ke elemen img
    if (imgRef.current) {
      imgRef.current.src = newSrc;
    }
  };

  // Reset state saat src berubah
  useEffect(() => {
    retryCount.current = 0;
    setHasError(false);
  }, [src]);

  return (
    <div className="writer-image-preview">
      {/* Gunakan img langsung daripada LazyImage untuk menghindari masalah */}
      <img
        ref={imgRef}
        src={hasError ? '/default-fallback-image.jpg' : src}
        alt="Preview"
        height="200px"
        width="100%"
        style={{ objectFit: 'cover' }}
        className={`writer-preview-image ${isUploading ? 'uploading' : ''}`}
        onError={handleError}
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