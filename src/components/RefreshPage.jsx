import React from 'react';
import { useNavigate } from 'react-router-dom';

function RefreshPage() {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="refresh-page">
      <h2>Terjadi Masalah</h2>
      <p>Sepertinya ada masalah dalam memuat halaman. Silakan coba salah satu opsi berikut:</p>
      <button onClick={handleRefresh}>Muat Ulang Halaman</button>
      <button onClick={handleGoHome}>Kembali ke Beranda</button>
    </div>
  );
}

export default RefreshPage;