import React from 'react';
import { FaInfoCircle, FaExclamationTriangle, FaGoogle, FaExternalLinkAlt } from 'react-icons/fa';
import './GoogleAuthInstructions.css';

const GoogleAuthInstructions = ({ onClose }) => {
  const currentOrigin = window.location.origin;

  return (
    <div className="google-auth-instructions">
      <div className="google-auth-instructions-header">
        <FaExclamationTriangle className="google-auth-instructions-icon" />
        <h3>Google Login Error: Origin Not Allowed</h3>
        <button className="google-auth-instructions-close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="google-auth-instructions-content">
        <p>
          <strong>Masalah:</strong> Origin <code>{currentOrigin}</code> tidak diizinkan untuk menggunakan Google Client ID ini.
        </p>

        <div className="google-auth-instructions-info">
          <FaInfoCircle />
          <div>
            <p>
              <strong>Client ID yang digunakan:</strong> <code>{import.meta.env.VITE_GOOGLE_CLIENT_ID}</code>
            </p>
            <p>
              <strong>Origin saat ini:</strong> <code>{currentOrigin}</code>
            </p>
          </div>
        </div>

        <div className="google-auth-instructions-steps">
          <h4>Cara Mengatasi:</h4>
          <ol>
            <li>
              <strong>Buka Google Cloud Console</strong>
              <p>
                Kunjungi <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                  Google Cloud Console <FaExternalLinkAlt size={12} />
                </a>
              </p>
            </li>
            <li>
              <strong>Pilih Project</strong>
              <p>Pilih project yang berisi Client ID yang Anda gunakan</p>
            </li>
            <li>
              <strong>Buka Credentials</strong>
              <p>Klik "Credentials" di sidebar, lalu cari OAuth 2.0 Client ID yang digunakan</p>
            </li>
            <li>
              <strong>Edit Client ID</strong>
              <p>Klik pada Client ID untuk mengedit</p>
            </li>
            <li>
              <strong>Tambahkan Authorized JavaScript Origins</strong>
              <p>
                Tambahkan <code>{currentOrigin}</code> ke daftar "Authorized JavaScript origins"
              </p>
            </li>
            <li>
              <strong>Simpan Perubahan</strong>
              <p>Klik "Save" untuk menyimpan perubahan</p>
            </li>
            <li>
              <strong>Tunggu Propagasi</strong>
              <p>Perubahan mungkin memerlukan waktu beberapa menit untuk diterapkan</p>
            </li>
          </ol>
        </div>

        <div className="google-auth-instructions-note">
          <FaInfoCircle />
          <p>
            <strong>Catatan:</strong> Jika Anda menggunakan localhost, pastikan untuk menambahkan <code>http://localhost:5173</code> dan <code>http://localhost:5000</code> ke daftar origins yang diizinkan.
          </p>
        </div>

        <div className="google-auth-instructions-warning">
          <FaExclamationTriangle />
          <div>
            <p>
              <strong>Penting:</strong> Jika Anda melihat pesan "FedCM was disabled in browser Site Settings", Anda perlu mengaktifkan FedCM di browser Chrome:
            </p>
            <ol>
              <li>Buka <code>chrome://flags</code> di browser Chrome</li>
              <li>Cari "FedCM"</li>
              <li>Aktifkan flag "FedCM" dan "FedCM Without Third-Party Cookies"</li>
              <li>Restart browser Chrome</li>
            </ol>
            <p>
              Atau, Anda dapat menggunakan mode non-FedCM dengan mengubah konfigurasi di kode aplikasi.
            </p>
          </div>
        </div>
      </div>

      <div className="google-auth-instructions-footer">
        <button className="google-auth-instructions-button" onClick={onClose}>
          Tutup
        </button>
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="google-auth-instructions-button primary"
        >
          <FaGoogle style={{ marginRight: '8px' }} />
          Buka Google Cloud Console
        </a>
      </div>
    </div>
  );
};

export default GoogleAuthInstructions;
