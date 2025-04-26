import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import './StaticPage.css';
import { FaHome, FaChevronRight, FaCalendarAlt, FaEdit, FaShareAlt, FaPrint, FaArrowUp } from 'react-icons/fa';
import NotFound from './NotFound';
import { Helmet } from 'react-helmet-async';

function StaticPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { slug } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const lastUpdatedDate = page?.updated_at ? new Date(page.updated_at) : null;

  // Fungsi untuk scroll ke atas
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Fungsi untuk print halaman
  const handlePrint = () => {
    window.print();
  };

  // Fungsi untuk share halaman
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: page.title,
          text: `Baca artikel "${page.title}" di Gema Hati Kudus`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback untuk browser yang tidak mendukung Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          alert('Link berhasil disalin ke clipboard!');
        })
        .catch(err => {
          console.error('Gagal menyalin link:', err);
        });
    }
  };

  // Effect untuk fetch data halaman
  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/static-pages/public/slug/${slug}`);
        if (response.data && response.data.success) {
          setPage(response.data.data);
          // Set document title
          document.title = `${response.data.data.title} | Gema Hati Kudus`;
        } else {
          setError('Halaman tidak ditemukan');
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        setError('Terjadi kesalahan saat memuat halaman');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  // Effect untuk mendeteksi scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (loading) {
    return (
      <div className="static-page-loading">
        <div className="loading-spinner"></div>
        <p>Memuat halaman...</p>
      </div>
    );
  }

  if (error || !page) {
    return <NotFound error={error} />;
  }

  return (
    <div className="static-page-container">
      <Helmet>
        <title>{page.title} | Gema Hati Kudus</title>
        <meta name="description" content={`${page.title} - Gema Hati Kudus`} />
        <meta property="og:title" content={`${page.title} | Gema Hati Kudus`} />
        <meta property="og:description" content={`${page.title} - Gema Hati Kudus`} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="article" />
      </Helmet>

      <nav aria-label="breadcrumb" className="static-page-breadcrumb-container">
        <ol className="static-page-breadcrumb">
          <li className="static-page-breadcrumb-item">
            <Link to="/" className="static-page-breadcrumb-link">
              <FaHome className="breadcrumb-icon" /> <span className="breadcrumb-text">Beranda</span>
            </Link>
          </li>
          <li className="static-page-breadcrumb-separator">
            <FaChevronRight />
          </li>
          <li className="static-page-breadcrumb-item active">
            <span>{page.title}</span>
          </li>
        </ol>
      </nav>

      <div className="static-page-content">
        <div className="static-page-header">
          <h1 className="static-page-title">{page.title}</h1>

          {lastUpdatedDate && (
            <div className="static-page-meta">
              <span className="static-page-date">
                <FaCalendarAlt /> Terakhir diperbarui: {lastUpdatedDate.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          <div className="static-page-actions">
            <button
              className="static-page-action-button"
              onClick={handleShare}
              title="Bagikan Halaman"
            >
              <FaShareAlt /> <span className="action-text">Bagikan</span>
            </button>

            <button
              className="static-page-action-button"
              onClick={handlePrint}
              title="Cetak Halaman"
            >
              <FaPrint /> <span className="action-text">Cetak</span>
            </button>
          </div>
        </div>

        <div
          ref={contentRef}
          className="static-page-body"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />

        <div className="static-page-footer">
          <div className="static-page-tags">
            {/* Jika ada tag, tampilkan di sini */}
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          className="scroll-to-top-button"
          onClick={scrollToTop}
          title="Kembali ke Atas"
        >
          <FaArrowUp />
        </button>
      )}
    </div>
  );
}

export default StaticPage;
