/**
 * Script untuk menghasilkan sitemap.xml dinamis
 * 
 * Cara penggunaan:
 * 1. Pastikan .env berisi VITE_API_BASE_URL dan VITE_FRONTEND_URL
 * 2. Jalankan: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.production' });

// Ambil URL dari environment variables
const API_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

console.log(`Generating sitemap for ${FRONTEND_URL} using API at ${API_URL}`);

// Path untuk sitemap template dan output
const SITEMAP_TEMPLATE = path.join(__dirname, '../public/sitemap.xml');
const SITEMAP_OUTPUT = path.join(__dirname, '../dist/sitemap.xml');

// Fungsi untuk mendapatkan semua post
async function fetchAllPosts() {
  try {
    const response = await axios.get(`${API_URL}/api/posts/public?limit=1000`);
    return response.data.posts || [];
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    return [];
  }
}

// Fungsi untuk mendapatkan semua label
async function fetchAllLabels() {
  try {
    const response = await axios.get(`${API_URL}/api/labels`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching labels:', error.message);
    return [];
  }
}

// Fungsi untuk mendapatkan semua carousel posts
async function fetchAllCarouselPosts() {
  try {
    const response = await axios.get(`${API_URL}/api/carousel-posts/public`);
    return response.data.posts || [];
  } catch (error) {
    console.error('Error fetching carousel posts:', error.message);
    return [];
  }
}

// Fungsi untuk mendapatkan semua static pages
async function fetchAllStaticPages() {
  try {
    const response = await axios.get(`${API_URL}/api/static-pages/public`);
    return response.data.pages || [];
  } catch (error) {
    console.error('Error fetching static pages:', error.message);
    return [];
  }
}

// Fungsi untuk menghasilkan sitemap
async function generateSitemap() {
  try {
    // Baca template sitemap
    let sitemapContent = fs.readFileSync(SITEMAP_TEMPLATE, 'utf8');
    
    // Ganti placeholder dengan URL frontend
    sitemapContent = sitemapContent.replace(/%VITE_FRONTEND_URL%/g, FRONTEND_URL);
    
    // Ambil data dari API
    const [posts, labels, carouselPosts, staticPages] = await Promise.all([
      fetchAllPosts(),
      fetchAllLabels(),
      fetchAllCarouselPosts(),
      fetchAllStaticPages()
    ]);
    
    // Tambahkan URL post
    let postUrls = '';
    posts.forEach(post => {
      if (post.status === 'published' && post.slug) {
        postUrls += `
  <url>
    <loc>${FRONTEND_URL}/post/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });
    
    // Tambahkan URL label
    let labelUrls = '';
    labels.forEach(label => {
      if (label.is_active !== false && label.slug) {
        labelUrls += `
  <url>
    <loc>${FRONTEND_URL}/label/${label.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    });
    
    // Tambahkan URL carousel posts
    let carouselUrls = '';
    carouselPosts.forEach(post => {
      if (post.status === 'published' && post.slug) {
        carouselUrls += `
  <url>
    <loc>${FRONTEND_URL}/carousel-post/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });
    
    // Tambahkan URL static pages
    let staticPageUrls = '';
    staticPages.forEach(page => {
      if (page.is_published && page.slug) {
        staticPageUrls += `
  <url>
    <loc>${FRONTEND_URL}/page/${page.slug}</loc>
    <lastmod>${new Date(page.updated_at || page.created_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
      }
    });
    
    // Tambahkan semua URL ke sitemap
    sitemapContent = sitemapContent.replace('  <!-- Halaman Label akan ditambahkan secara dinamis oleh API -->', labelUrls);
    sitemapContent = sitemapContent.replace('  <!-- Halaman Post akan ditambahkan secara dinamis oleh API -->', postUrls + carouselUrls + staticPageUrls);
    
    // Pastikan direktori dist ada
    if (!fs.existsSync(path.dirname(SITEMAP_OUTPUT))) {
      fs.mkdirSync(path.dirname(SITEMAP_OUTPUT), { recursive: true });
    }
    
    // Tulis sitemap ke file
    fs.writeFileSync(SITEMAP_OUTPUT, sitemapContent);
    
    // Salin juga ke direktori public untuk pengembangan lokal
    fs.writeFileSync(path.join(__dirname, '../public/sitemap-generated.xml'), sitemapContent);
    
    console.log(`Sitemap generated successfully with ${posts.length} posts, ${labels.length} labels, ${carouselPosts.length} carousel posts, and ${staticPages.length} static pages`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

// Jalankan fungsi utama
generateSitemap();
