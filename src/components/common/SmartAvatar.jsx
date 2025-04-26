import React, { useState, useEffect } from 'react';
import { getProfileImageUrl } from '../../utils/imageHelper';
import { getInitials } from '../../utils/avatarHelper';
import './SmartAvatar.css';

/**
 * Komponen SmartAvatar yang dapat menangani berbagai jenis URL avatar
 * @param {Object} props - Props komponen
 * @param {string} props.src - URL atau path avatar
 * @param {string} props.alt - Teks alternatif untuk gambar
 * @param {string} props.name - Nama pengguna (untuk fallback)
 * @param {string} props.className - Kelas CSS tambahan
 * @param {string} props.size - Ukuran avatar ('sm', 'md', 'lg')
 * @param {Function} props.onClick - Fungsi yang dipanggil saat avatar diklik
 * @returns {JSX.Element} Komponen avatar
 */
const SmartAvatar = ({
  src,
  alt = 'Avatar',
  name = '',
  className = '',
  size = 'md',
  onClick
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Gunakan fungsi helper untuk mendapatkan inisial

  // Mendapatkan URL avatar yang valid
  useEffect(() => {
    if (!src) {
      setImgSrc(null);
      return;
    }

    try {
      // Gunakan helper function untuk mendapatkan URL yang valid
      const validSrc = getProfileImageUrl(src);
      setImgSrc(validSrc);
      setError(false);
      setRetryCount(0);
    } catch (err) {
      console.error('SmartAvatar: Error processing src', err);
      setImgSrc(null);
      setError(true);
    }
  }, [src]);

  // Menangani error saat loading gambar
  const handleError = () => {
    // Jika URL adalah URL Google, jangan coba lagi
    if (imgSrc && (imgSrc.includes('googleusercontent.com') || imgSrc.includes('lh3.google'))) {
      setError(true);
      return;
    }

    // Jika URL tidak mengandung /profiles/ tapi mengandung /uploads/ dan profile-, coba perbaiki
    if (imgSrc && imgSrc.includes('/uploads/') && !imgSrc.includes('/profiles/') && imgSrc.includes('profile-')) {
      const fixedUrl = imgSrc.replace('/uploads/', '/uploads/profiles/');
      setImgSrc(fixedUrl);
      return;
    }

    // Coba lagi dengan cache busting jika belum mencapai batas percobaan
    if (retryCount < maxRetries) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      // Tambahkan parameter cache busting
      const baseUrl = imgSrc?.split('?')[0] || '';
      const newSrc = `${baseUrl}?retry=${newRetryCount}&t=${Date.now()}`;
      setImgSrc(newSrc);
    } else {
      setError(true);
    }
  };

  // Menentukan kelas CSS berdasarkan ukuran
  const sizeClass = `writer-avatar-${size}`;
  const avatarClass = `writer-avatar ${sizeClass} ${className} ${error ? 'writer-avatar-error' : ''}`;

  // Render komponen
  return (
    <div className={avatarClass} onClick={onClick}>
      {!error && imgSrc ? (
        <img
          src={imgSrc}
          alt={alt}
          onError={handleError}
          className="writer-avatar-img"
        />
      ) : (
        <div className="writer-avatar-fallback">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};

export default SmartAvatar;
