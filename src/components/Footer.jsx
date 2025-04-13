import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer({ className }) {
  return (
    <footer className={`site-footer ${className}`}>
      <div className="container">
        <div className="footer-content">
          <div>
            <h6 className="text-lg font-bold mb-4">Gema Hati Kudus</h6>
            <p className="text-sm">
              Komunitas yang berdedikasi untuk menyebarkan kasih dan pengajaran Kristus.
            </p>
          </div>

          <div>
            <h6 className="text-lg font-bold mb-4">Layanan</h6>
            <ul className="space-y-2">
              <li><Link to="/jadwal-misa" className="text-gray-300 hover:text-white">Jadwal Misa</Link></li>
              <li><Link to="/kegiatan" className="text-gray-300 hover:text-white">Kegiatan</Link></li>
              <li><Link to="/pendaftaran" className="text-gray-300 hover:text-white">Pendaftaran</Link></li>
            </ul>
          </div>

          <div>
            <h6 className="text-lg font-bold mb-4">Tautan Berguna</h6>
            <ul className="space-y-2">
              <li><Link to="/tentang-kami" className="text-gray-300 hover:text-white">Tentang Kami</Link></li>
              <li><Link to="/kontak" className="text-gray-300 hover:text-white">Kontak</Link></li>
              <li><Link to="/faq" className="text-gray-300 hover:text-white">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h6 className="text-lg font-bold mb-4">Kontak</h6>
            <p className="text-sm">Alamat Gereja, Kota, Kode Pos</p>
            <p className="text-sm">Email: info@gemahati.com</p>
            <p className="text-sm">Telp: + 62 123 456 789</p>
          </div>
        </div>

        <div className="footer-copyright">
          <p>&copy; 2024 Gema Hati Kudus. Hak Cipta Dilindungi.</p>
          <div>
            <Link to="/privacy-policy" className="text-gray-300 hover:text-white mr-4">Kebijakan Privasi</Link>
            <Link to="/terms-of-service" className="text-gray-300 hover:text-white">Syarat Layanan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;