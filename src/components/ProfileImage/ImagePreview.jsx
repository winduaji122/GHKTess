import React, { useState, useEffect, useRef } from 'react';
import { FaTrash, FaUser } from 'react-icons/fa';

const ImagePreview = ({ src, onError, isUploading, onRemove }) => {
  const [hasError, setHasError] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const handleError = (error) => {
    // Cek apakah URL adalah URL Google
    if (src && (src.includes('googleusercontent.com') || src.includes('lh3.google'))) {
      // Untuk Google avatar, langsung tampilkan error state tanpa retry
      setHasError(true);
      onError?.(error);
      return;
    }

    if (retryCount.current >= maxRetries) {
      setHasError(true);
      onError?.(error);
      return;
    }

    retryCount.current += 1;

    // Try with cache busting
    const baseUrl = src.split('?')[0];
    const newSrc = `${baseUrl}?retry=${retryCount.current}&t=${Date.now()}`;
    error.target.src = newSrc;
  };

  // Reset error state when src changes
  useEffect(() => {
    retryCount.current = 0;
    setHasError(false);
  }, [src]);

  return (
    <div className="user-profile-image-preview-wrapper">
      <div className="user-profile-avatar-container">
        {hasError ? (
          <div className="user-profile-image-placeholder">
            <FaUser className="user-profile-image-icon" size={50} />
          </div>
        ) : (
          <div className="user-profile-avatar-wrapper">
            <img
              alt="Profile Preview"
              src={src}
              className={`user-profile-image-preview ${isUploading ? 'uploading' : ''}`}
              onError={handleError}
            />
          </div>
        )}
      </div>

      {!hasError && !isUploading && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (window.confirm('Apakah Anda yakin ingin menghapus foto profil ini?')) {
              onRemove();
            }
          }}
          className="user-profile-image-remove-button"
        >
          <FaTrash className="user-profile-button-icon" />
          <span>Hapus Foto</span>
        </button>
      )}
    </div>
  );
};

export default ImagePreview;
