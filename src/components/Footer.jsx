import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import './Footer.css';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaTiktok, FaGlobe } from 'react-icons/fa';

function Footer({ className }) {
  const [footerPages, setFooterPages] = useState({
    main: [],
    about: [],
    links: [],
    social: []
  });
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mendapatkan ikon sosial media berdasarkan judul halaman
  const getSocialIcon = (title) => {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('facebook')) return <FaFacebook className="social-icon" />;
    if (titleLower.includes('twitter') || titleLower.includes('x')) return <FaTwitter className="social-icon" />;
    if (titleLower.includes('instagram')) return <FaInstagram className="social-icon" />;
    if (titleLower.includes('youtube')) return <FaYoutube className="social-icon" />;
    if (titleLower.includes('tiktok')) return <FaTiktok className="social-icon" />;

    // Default icon jika tidak ada yang cocok
    return <FaGlobe className="social-icon" />;
  };

  useEffect(() => {
    const fetchFooterPages = async () => {
      try {
        const response = await api.get('/api/static-pages/public/footer');
        if (response.data && response.data.success) {
          setFooterPages(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching footer pages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFooterPages();
  }, []);

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
            <h6 className="text-lg font-bold mb-4">Tautan Berguna</h6>
            <ul className="space-y-2">
              {!loading && footerPages.links && footerPages.links.length > 0 ? (
                footerPages.links.map(page => (
                  <li key={page.id}>
                    {page.external_link ? (
                      <a
                        href={page.external_link}
                        className="text-gray-300 hover:text-white"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {page.title}
                      </a>
                    ) : (
                      <Link to={`/page/${page.slug}`} className="text-gray-300 hover:text-white">
                        {page.title}
                      </Link>
                    )}
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/page/tentang-kami" className="text-gray-300 hover:text-white">Tentang Kami</Link></li>
                  <li><Link to="/page/kontak" className="text-gray-300 hover:text-white">Kontak Kami</Link></li>
                  <li><Link to="/page/faq" className="text-gray-300 hover:text-white">FAQ</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Bagian Sosial Media */}
          {!loading && footerPages.social && footerPages.social.length > 0 && (
            <div>
              <h6 className="text-lg font-bold mb-4">Sosial Media</h6>
              <ul className="space-y-2 social-links">
                {footerPages.social.map(page => (
                  <li key={page.id}>
                    {page.external_link ? (
                      <a
                        href={page.external_link}
                        className="text-gray-300 hover:text-white social-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {getSocialIcon(page.title)}
                        <span>{page.title}</span>
                      </a>
                    ) : (
                      <Link to={`/page/${page.slug}`} className="text-gray-300 hover:text-white social-link">
                        {getSocialIcon(page.title)}
                        <span>{page.title}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Render bagian footer kustom */}
          {!loading && Object.entries(footerPages).map(([section, pages]) => {
            // Skip bagian default yang sudah dirender
            if (['main', 'links', 'social', 'about'].includes(section)) {
              return null;
            }

            // Jika tidak ada halaman dalam bagian ini, jangan tampilkan
            if (!pages || pages.length === 0) {
              return null;
            }

            // Format nama bagian untuk ditampilkan
            const formattedSectionName = section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Render bagian kustom
            return (
              <div key={section} className="footer-custom-section">
                <h6 className="text-lg font-bold mb-4">
                  {formattedSectionName}
                </h6>
                <ul className="space-y-2">
                  {pages.map(page => (
                    <li key={page.id}>
                      {page.external_link ? (
                        <a
                          href={page.external_link}
                          className="text-gray-300 hover:text-white"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {page.title}
                        </a>
                      ) : (
                        <Link to={`/page/${page.slug}`} className="text-gray-300 hover:text-white">
                          {page.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="footer-copyright">
          <p>&copy; {new Date().getFullYear()} Gema Hati Kudus. Hak Cipta Dilindungi.</p>
          <div>
            {!loading && footerPages.main && footerPages.main.length > 0 ? (
              footerPages.main.map(page => (
                page.external_link ? (
                  <a
                    key={page.id}
                    href={page.external_link}
                    className="text-gray-300 hover:text-white mr-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {page.title}
                  </a>
                ) : (
                  <Link
                    key={page.id}
                    to={`/page/${page.slug}`}
                    className="text-gray-300 hover:text-white mr-4"
                  >
                    {page.title}
                  </Link>
                )
              ))
            ) : (
              <>
                <Link to="/page/kebijakan-privasi" className="text-gray-300 hover:text-white mr-4">Kebijakan Privasi</Link>
                <Link to="/page/syarat-dan-ketentuan" className="text-gray-300 hover:text-white">Syarat Layanan</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;