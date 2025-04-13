import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = ({ error }) => {
  return (
    <div className="not-found-container">
      <h1>404 - Halaman Tidak Ditemukan</h1>
      <p>Maaf, halaman yang Anda cari tidak ditemukan.</p>
      {error && (
        <div className="error-details">
          <h2>Detail Kesalahan:</h2>
          <p>{error.message || 'Terjadi kesalahan yang tidak diketahui.'}</p>
          {error.status === 404 && (
            <p>Post yang Anda cari mungkin telah dihapus atau belum dipublikasikan.</p>
          )}
          {error.status === 500 && (
            <p>Terjadi kesalahan server. Silakan coba lagi nanti atau hubungi administrator.</p>
          )}
        </div>
      )}
      <div className="action-buttons">
        <Link to="/" className="home-button">Kembali ke Beranda</Link>
        <button onClick={() => window.location.reload()} className="retry-button">Coba Lagi</button>
      </div>
    </div>
  );
};

export default NotFound;
