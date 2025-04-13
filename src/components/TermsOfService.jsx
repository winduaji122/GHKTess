import React from 'react';
import './TermsOfService.css';

const TermsOfService = () => {
  return (
    <div className="terms-of-service-container">
      <h1 className="terms-of-service-title">Syarat Layanan Gema Hati Kudus</h1>
      
      <p className="terms-of-service-updated">Terakhir diperbarui: 27 September 2024</p>
      
      <div className="terms-of-service-content">
        <p>
          Selamat datang di Gema Hati Kudus. Dengan mengakses atau menggunakan layanan kami, Anda setuju untuk terikat oleh syarat dan ketentuan ini. Harap baca dengan seksama.
        </p>
        
        <section className="terms-of-service-section">
          <h2>1. Penerimaan Syarat</h2>
          <p>
            Dengan menggunakan Gema Hati Kudus, Anda setuju untuk mematuhi dan terikat oleh syarat layanan ini. Jika Anda tidak setuju dengan syarat ini, harap jangan gunakan layanan kami.
          </p>
        </section>
        
        <section className="terms-of-service-section">
          <h2>2. Perubahan Layanan</h2>
          <p>
            Gema Hati Kudus berhak untuk memodifikasi atau menghentikan layanan, baik sementara atau permanen, tanpa pemberitahuan sebelumnya. Kami tidak bertanggung jawab atas perubahan, penangguhan, atau penghentian layanan.
          </p>
        </section>
        
        {/* Tambahkan bagian lain dengan struktur yang sama */}
        
        <section className="terms-of-service-section">
          <h2>9. Kontak</h2>
          <p>
            Jika Anda memiliki pertanyaan tentang Syarat Layanan ini, silakan hubungi kami di: <a href="mailto:contact@gemahatikudus.com">contact@gemahatikudus.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;