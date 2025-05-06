import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

/**
 * Komponen SEO untuk mengelola meta tag
 * 
 * @param {Object} props - Props komponen
 * @param {string} props.title - Judul halaman
 * @param {string} props.description - Deskripsi halaman
 * @param {string} props.keywords - Kata kunci halaman
 * @param {string} props.ogImage - URL gambar untuk Open Graph
 * @param {string} props.ogType - Tipe konten Open Graph
 * @param {string} props.canonicalUrl - URL kanonik halaman
 * @param {string} props.ogUrl - URL untuk Open Graph
 * @param {string} props.twitterCard - Tipe kartu Twitter
 * @param {string} props.twitterSite - Username Twitter situs
 * @param {string} props.twitterCreator - Username Twitter penulis
 * @param {string} props.language - Bahasa halaman
 * @param {Object} props.structuredData - Data terstruktur JSON-LD
 */
const SEO = ({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonicalUrl,
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterSite = '@gemahati',
  twitterCreator = '@gemahati',
  language = 'id',
  structuredData = null,
}) => {
  // Gunakan environment variable untuk URL frontend
  const siteUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  
  // Pastikan URL gambar lengkap
  const fullOgImage = ogImage && !ogImage.startsWith('http') 
    ? `${siteUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}` 
    : ogImage;
  
  // Pastikan URL kanonik lengkap
  const fullCanonicalUrl = canonicalUrl 
    ? (canonicalUrl.startsWith('http') ? canonicalUrl : `${siteUrl}${canonicalUrl.startsWith('/') ? '' : '/'}${canonicalUrl}`)
    : `${siteUrl}${window.location.pathname}`;
  
  // Pastikan URL Open Graph lengkap
  const fullOgUrl = ogUrl 
    ? (ogUrl.startsWith('http') ? ogUrl : `${siteUrl}${ogUrl.startsWith('/') ? '' : '/'}${ogUrl}`)
    : fullCanonicalUrl;

  return (
    <Helmet>
      {/* Judul dan meta dasar */}
      <html lang={language} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* URL Kanonik */}
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullOgUrl} />
      {fullOgImage && <meta property="og:image" content={fullOgImage} />}
      <meta property="og:site_name" content="Gema Hati Kudus" />
      <meta property="og:locale" content={language === 'id' ? 'id_ID' : 'en_US'} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {fullOgImage && <meta name="twitter:image" content={fullOgImage} />}
      
      {/* Data Terstruktur JSON-LD */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

SEO.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  keywords: PropTypes.string,
  ogImage: PropTypes.string,
  ogType: PropTypes.string,
  canonicalUrl: PropTypes.string,
  ogUrl: PropTypes.string,
  twitterCard: PropTypes.string,
  twitterSite: PropTypes.string,
  twitterCreator: PropTypes.string,
  language: PropTypes.string,
  structuredData: PropTypes.object,
};

export default SEO;
