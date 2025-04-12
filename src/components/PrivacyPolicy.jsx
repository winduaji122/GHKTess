import React from 'react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-container">
      <h1 className="privacy-policy-title">Kebijakan Privasi Gema Hati Kudus</h1>
      
      <p className="privacy-policy-updated">Terakhir diperbarui: 27 September 2024</p>
      
      <div className="privacy-policy-section">
        <h2>1. Informasi yang Kami Kumpulkan</h2>
        <p>Kami dapat mengumpulkan informasi berikut:</p>
        <ul className="privacy-policy-list">
          <li>Informasi yang Anda berikan saat mendaftar atau menggunakan aplikasi (nama, alamat email)</li>
          <li>Informasi yang dihasilkan saat Anda menggunakan aplikasi (log aktivitas, preferensi)</li>
          <li>Informasi dari layanan pihak ketiga jika Anda memilih untuk menghubungkan akun tersebut (misalnya, Google)</li>
        </ul>
      </div>
      
      <div className="privacy-policy-section">
        <h2>2. Bagaimana Kami Menggunakan Informasi Anda</h2>
        <p>Kami menggunakan informasi yang dikumpulkan untuk:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Menyediakan, memelihara, dan meningkatkan layanan kami</li>
          <li>Berkomunikasi dengan Anda tentang layanan, pembaruan, dan informasi lainnya</li>
          <li>Melindungi keamanan dan integritas aplikasi kami</li>
        </ul>
      </div>
      
      <div className="privacy-policy-section">
        <h2>3. Berbagi Informasi</h2>
        <p>Kami tidak menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga. Kami mungkin membagikan informasi dalam keadaan tertentu, seperti:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Dengan persetujuan Anda</li>
          <li>Untuk mematuhi kewajiban hukum</li>
          <li>Untuk melindungi hak, properti, atau keselamatan kami atau orang lain</li>
        </ul>
      </div>
      
      <div className="privacy-policy-section">
        <h2>4. Keamanan Data</h2>
        <p>Kami mengambil langkah-langkah yang wajar untuk melindungi informasi Anda dari akses, penggunaan, atau pengungkapan yang tidak sah.</p>
      </div>
      
      <div className="privacy-policy-section">
        <h2>5. Perubahan pada Kebijakan Privasi Ini</h2>
        <p>Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami akan memberi tahu Anda tentang perubahan signifikan dengan memposting pemberitahuan di aplikasi kami atau melalui email.</p>
      </div>
      
      <div className="privacy-policy-section privacy-policy-contact">
        <h2>6. Kontak Kami</h2>
        <p>Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami di: <a href="mailto:contact@gemahatikudus.com">contact@gemahatikudus.com</a>.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;